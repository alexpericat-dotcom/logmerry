/**
 * Assemble `docs/livrables/NN-*.md` en un seul PDF (couverture, sommaire, un chapitre par livrable) : npm run livrables.
 * Markdown -> HTML (marked), diagrammes Mermaid dessinés dans Chrome, impression PDF par Chrome sans interface. Aucun service externe sauf les polices Google
 * et le téléchargement unique de Mermaid (mis en cache dans node_modules/.cache).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Marked } from "marked";

import { SKETCH_DATA } from "../components/sketch-data.ts";

const DIR = "docs/livrables";
const OUT = `${DIR}/livrables-soutenance.pdf`;
const CACHE = "node_modules/.cache/livrables";
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Un croquis monoligne de la page publique par chapitre (mêmes tracés que `components/sketch-data.ts`). */
const SKETCH_OF = { 1: "database", 2: "flow", 3: "window", 4: "cloud", 5: "compass", 6: "rocket", 7: "magnifier", 8: "cubes", 9: "shield", 10: "funnel", 11: "wrench", 12: "loop", 13: "cog" };
const sketch = (name) => {
  const d = SKETCH_DATA[name];
  if (!d) return "";
  return `<div class="sk"><svg viewBox="${d.box}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${d.strokes.map((p) => `<path d="${p.d}" stroke-width="${p.w}" class="sk-${p.k}"/>`).join("")}</svg></div>`;
};
const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

mkdirSync(CACHE, { recursive: true });
if (!existsSync(`${CACHE}/mermaid.min.js`)) {
  const res = await fetch(MERMAID_URL);
  if (!res.ok) throw new Error(`Mermaid : ${res.status}`);
  writeFileSync(`${CACHE}/mermaid.min.js`, Buffer.from(await res.arrayBuffer()));
}

const files = readdirSync(DIR).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
const toc = [];
const chapters = files.map((file) => {
  const n = file.slice(0, 2);
  const h2 = [];
  let h2n = 0;
  const marked = new Marked({
    renderer: {
      code({ text, lang }) {
        return lang === "mermaid" ? `<figure class="diagram"><pre class="mermaid">${esc(text)}</pre></figure>` : `<pre${n === "14" ? ' class="long"' : ""}><code>${esc(text)}</code></pre>`;
      },
      image({ href, text }) {
        const src = /^https?:|^file:/.test(href) ? href : `file://${process.cwd()}/${DIR}/${href}`;
        return `<figure class="shot"><img src="${esc(src)}" alt="${esc(text)}"/><figcaption>${esc(text)}</figcaption></figure>`;
      },
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const plain = tokens.map((t) => t.raw ?? "").join("");
        if (depth === 1) return `<h1 id="c${n}"><span class="num">${n}</span>${html}</h1>`;
        const id = `c${n}-${slug(plain)}`;
        if (depth === 2) {
          h2.push({ id, text: plain });
          return `<h2 id="${id}"><span class="h2n">${n}.${++h2n}</span>${html}</h2>`;
        }
        return `<h${depth} id="${id}">${html}</h${depth}>`;
      },
    },
  });
  const md = readFileSync(`${DIR}/${file}`, "utf8");
  const title = md.match(/^#\s+(.+)$/m)?.[1] ?? file;
  const body = marked.parse(md).replace(/<table>(?=\s*<thead>\s*<tr>(?:(?!<\/thead>)[\s\S])*Ce qui est établi)/g, '<table class="split">');
  toc.push({ n, title, h2: n === "14" ? [] : h2 }); // annexe : une seule ligne au sommaire
  return `<section class="chap">${sketch(SKETCH_OF[Number(n)])}${body}</section>`;
});

const tocHtml = (pageOf) => `<section class="toc"><div class="eyebrow">Livrables de soutenance</div><h2>Sommaire</h2><p class="lead">Treize livrables, un chapitre chacun, et une annexe. Les mentions « À confirmer » signalent ce qui n'est pas vérifié.</p><ol>${toc
  .map(
    (c) =>
      `<li class="l1"><span class="n">${c.n}</span><a class="t" href="#c${c.n}">${esc(c.title)}</a><span class="p">${pageOf[`c${c.n}`] ?? ""}</span></li>${c.h2
        .map((h) => `<li class="l2"><a href="#${h.id}">${esc(h.text)}</a><span class="dots"></span><span class="p">${pageOf[h.id] ?? ""}</span></li>`)
        .join("")}`,
  )
  .join("")}</ol></section>`;

const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const cover = `<section class="cover"><div class="banner" style="background-image:url('file://${process.cwd()}/public/images/hero/hero-wide-2000.webp')"></div><div class="body"><div><div class="eyebrow">LogMerry · Automatisation &amp; IA pour les entreprises</div><h1>Livrables<br/>de soutenance</h1><p class="sub">Mini CRM et cockpit d'activité avec assistant IA connecté à mes notes, conçu et déployé en no-code et IA.</p><span class="pill">Soutenance · 16 novembre 2026</span></div><div class="meta"><div><b>Auteur</b>Alex Pericat</div><div><b>Version</b>${today}</div><div><b>Formation</b>Bachelor Chef de projet No-Code et IA</div></div></div></section>`;

const html = (pageOf) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Livrables de soutenance · LogMerry</title><style>${readFileSync("scripts/livrables.css", "utf8")}</style></head><body>${cover}${tocHtml(pageOf)}${chapters.join("\n")}
<script src="mermaid.min.js"></script>
<script>
  mermaid.initialize({ startOnLoad: false, theme: "base", fontFamily: "Hanken Grotesk, sans-serif", themeVariables: { primaryColor: "#eadfcb", primaryBorderColor: "#1a3435", primaryTextColor: "#12140f", lineColor: "#1a3435", secondaryColor: "#fbf6ec", tertiaryColor: "#f4ebdd", edgeLabelBackground: "#f4ebdd", attributeBackgroundColorOdd: "#fbf6ec", attributeBackgroundColorEven: "#f4ebdd", fontSize: "13px"}, er: { useMaxWidth: true, layoutDirection: "LR", entityPadding: 10, fontSize: 13 }, flowchart: { useMaxWidth: true, htmlLabels: true }, sequence: { useMaxWidth: true }, state: { useMaxWidth: true } });
  mermaid.run({ querySelector: ".mermaid" });
</script></body></html>`;

const profile = mkdtempSync(join(tmpdir(), "livrables-chrome-"));
function print(pageOf) {
  writeFileSync(`${CACHE}/index.html`, html(pageOf));
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", `--user-data-dir=${profile}`, "--no-pdf-header-footer", "--virtual-time-budget=40000", `--print-to-pdf=${OUT}`, `file://${process.cwd()}/${CACHE}/index.html`], { stdio: "ignore" });
}

/** Page (à partir de 1) de chaque ancre `id` : lue dans le PDF (arbre des pages et table des destinations nommées, objets non compressés). */
function anchorPages() {
  const pdf = readFileSync(OUT).toString("latin1");
  const obj = (id) => pdf.match(new RegExp(`\\n${id} 0 obj\\n(<<[\\s\\S]*?>>)\\nendobj`))?.[1] ?? "";
  const catalog = pdf.match(/<<\/Type \/Catalog[\s\S]*?>>\nendobj/)?.[0] ?? "";
  const root = catalog.match(/\/Pages (\d+) 0 R/)?.[1];
  const dests = catalog.match(/\/Dests (\d+) 0 R/)?.[1];
  const leaves = [];
  const walk = (id) => {
    const o = obj(id);
    const kids = o.match(/\/Kids \[([^\]]*)\]/)?.[1];
    if (kids) for (const k of kids.matchAll(/(\d+) 0 R/g)) walk(k[1]);
    else leaves.push(id);
  };
  walk(root);
  const map = {};
  for (const m of obj(dests).matchAll(/\/([\w-]+) \[(\d+) 0 R/g)) map[m[1]] = leaves.indexOf(m[2]) + 1;
  return { map, total: leaves.length };
}

print({});
const first = anchorPages();
print(first.map);
let last = anchorPages();
// Le sommaire rempli peut déplacer les pages : on réimprime jusqu'à stabilité (3 passes au plus).
for (let i = 0; i < 3 && JSON.stringify(first.map) !== JSON.stringify(last.map); i++) {
  first.map = last.map;
  print(last.map);
  last = anchorPages();
}
if (JSON.stringify(first.map) !== JSON.stringify(last.map)) console.warn("Les numéros de page ne se stabilisent pas.");
console.log(`${OUT} (${files.length} chapitres, ${last.total} pages)`);
