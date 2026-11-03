import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/globals.css", "utf8");

const channel = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lumRgb = ([r, g, b]: readonly number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrastRgb = (a: readonly number[], b: readonly number[]) => (Math.max(lumRgb(a), lumRgb(b)) + 0.05) / (Math.min(lumRgb(a), lumRgb(b)) + 0.05);
/** « H S% L% » (jeton HSL) → RGB. */
function hslToRgb([h, s, l]: readonly [number, number, number]): number[] {
  const S = s / 100, L = l / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => 255 * (L - a * Math.max(-1, Math.min((n + h / 30) % 12 - 3, 9 - ((n + h / 30) % 12), 1)));
  return [f(0), f(8), f(4)];
}
const ratio = (a: readonly [number, number, number], b: readonly [number, number, number]) => contrastRgb(hslToRgb(a), hslToRgb(b));

/** Largeur et hauteur d'un AVIF (boîte « ispe ») ou d'un WebP (VP8, VP8L, VP8X). */
function dimensions(file: string): [number, number] {
  const buf = readFileSync(file);
  if (file.endsWith(".avif")) {
    const at = buf.indexOf("ispe");
    return [buf.readUInt32BE(at + 8), buf.readUInt32BE(at + 12)];
  }
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (kind === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  const bits = buf.readUInt32LE(21);
  return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
}
const page = readFileSync("app/portfolio/page.tsx", "utf8");

/** Texte d'un bloc `@media (...) { ... }` (accolades équilibrées), ou null. */
function blocks(source: string, header: RegExp): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(new RegExp(header.source, "g"))) {
    let depth = 0;
    let end = m.index! + m[0].length;
    for (let i = end - 1; i < source.length; i++) {
      if (source[i] === "{") depth++;
      if (source[i] === "}" && --depth === 0) {
        end = i;
        break;
      }
    }
    out.push(source.slice(m.index!, end + 1));
  }
  return out;
}

test("mouvement : toute animation se joue dans « prefers-reduced-motion: no-preference », aucune ne boucle (rien à mettre en pause, WCAG 2.2.2)", () => {
  let rest = css;
  for (const b of blocks(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{/)) rest = rest.replace(b, "");
  const withoutKeyframes = blocks(rest, /@keyframes [\w-]+\s*\{/).reduce((acc, b) => acc.replace(b, ""), rest);
  const offenders = [...withoutKeyframes.matchAll(/animation(?:-name)?\s*:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => v !== "none" && v !== "none !important");
  // Le curseur clignotant du cockpit (ancien, hors de cette page) est coupé par son propre bloc « mouvement réduit ».
  assert.deepEqual(offenders.filter((v) => !v.startsWith("typed-blink")), []);
  const portfolioCss = css.slice(css.indexOf("/* Page publique du portfolio"));
  assert.ok(!/\binfinite\b/.test(portfolioCss), "une animation de la page publique boucle");
});

test("mouvement : les animations de la page n'animent que `transform`, `opacity` et le tracé des croquis (pas de largeur, hauteur, marge ni position)", () => {
  for (const name of ["hero-in", "reveal-up", "reveal-left", "reveal-right", "reveal-scale", "hero-zoom", "hero-lift", "sketch-draw", "spine-grow", "word-up"]) {
    const body = blocks(css, new RegExp(`@keyframes ${name}\\s*\\{`))[0] ?? "";
    assert.ok(body, `@keyframes ${name} introuvable`);
    assert.ok(!/\b(width|height|top|left|right|bottom|margin|padding)\s*:/.test(body), `${name} anime une propriété de mise en page`);
  }
});

test("animations au défilement : quatre entrées différentes, une cascade par `--i`, le zoom et la montée du hero ; toutes coupées à l'impression", () => {
  for (const cls of [".reveal", ".reveal-left", ".reveal-right", ".reveal-scale", ".hero-zoom", ".hero-lift"]) assert.ok(css.includes(`${cls} {`), `${cls} manquant`);
  assert.match(css, /animation-range:\s*entry calc\(var\(--i, 0\) \* 7%\)/);
  const print = blocks(css, /@media print\s*\{/).join("\n");
  for (const cls of [".reveal", ".reveal-left", ".reveal-right", ".reveal-scale", ".hero-zoom", ".hero-lift"]) assert.ok(print.includes(cls), `${cls} reste animé à l'impression`);
  // Repli pour les navigateurs sans `animation-timeline` (Safari avant 26, Firefox) : transitions déclenchées par `components/scroll-effects.tsx`.
  for (const rule of ["@supports not (animation-timeline: view())", "@supports not (animation-timeline: scroll())", ".rv-pending", ".rv-run", "--hero-p"]) assert.ok(css.includes(rule), `repli manquant : ${rule}`);
  assert.ok(readFileSync("app/portfolio/page.tsx", "utf8").includes("<ScrollEffects />"));
  const sections = readFileSync("components/portfolio-sections.tsx", "utf8") + readFileSync("components/portfolio-showcase.tsx", "utf8");
  for (const cls of ["reveal-left", "reveal-right", "reveal-scale", "hero-zoom", "hero-lift", "spine", "word-mask", "<Sketch"]) assert.ok(sections.includes(cls), `${cls} jamais utilisé`);
  const print2 = blocks(css, /@media print\s*\{/).join("\n");
  for (const cls of [".spine", ".word", ".sketch path"]) assert.ok(print2.includes(cls), `${cls} reste animé à l'impression`);
});

test("en-tête : sur la photo au chargement (voile), translucide et flou au défilement ; le flou n'est que dans le cadre de l'en-tête", () => {
  const frame = readFileSync("components/portfolio-header-frame.tsx", "utf8");
  assert.match(frame, /header-veil/);
  assert.match(frame, /backdrop-blur/);
  assert.match(frame, /scrollY >/);
  const alpha = Number(/\.header-veil \{\s*background: linear-gradient\(rgb\(var\(--veil\) \/ ([\d.]+)\)/.exec(css)?.[1]);
  // Pire pixel de la bande du haut de la photo : #FFFFBF (recadrage mobile), mesuré ; texte crème du jeton --photo.
  const photo = /--photo:\s*([\d.]+) ([\d.]+)% ([\d.]+)%/.exec(css)!;
  const cream = hslToRgb([Number(photo[1]), Number(photo[2]), Number(photo[3])]);
  const worst = [0xff, 0xff, 0xbf].map((c, i) => c * (1 - alpha) + [18, 20, 15][i] * alpha);
  assert.ok(contrastRgb(cream, worst) >= 4.5, `contraste ${contrastRgb(cream, worst).toFixed(2)}:1 avec un voile à ${alpha}`);
  const sections = readFileSync("components/portfolio-sections.tsx", "utf8");
  assert.ok(!/backdrop-blur/.test(sections), "le flou est réservé à l'en-tête");
  for (const id of ["qui-suis-je", "contact"]) assert.ok(sections.includes(`id="${id}"`), `la section #${id} est la cible d'un bouton de l'en-tête`);
});

test("direction éditoriale : ni carte de verre, bandeau défilant, vidéo ni pause d'animations ; le verre liquide est réservé aux boutons d'appel à l'action", () => {
  const portfolioCss = css.slice(css.indexOf("/* Page publique du portfolio"));
  assert.ok(!/\.glass|\.marquee|\.mesh|data-motion/.test(portfolioCss));
  const withoutLiquid = blocks(portfolioCss, /\.liquid\s*\{/).reduce((acc, b) => acc.replace(b, ""), portfolioCss);
  assert.ok(!/backdrop-filter/.test(withoutLiquid), "le flou n'est permis que sur `.liquid` (boutons)");
  for (const file of ["components/portfolio-sections.tsx", "components/portfolio-showcase.tsx", "app/portfolio/page.tsx"]) {
    const src = readFileSync(file, "utf8");
    assert.ok(!/backdrop-blur|bg-gradient-sunset|text-brand-gradient|font-pixel|shadow-hard|<video|Marquee|MotionToggle/.test(src), `${file} garde un élément de l'ancienne direction`);
  }
});

test("boutons en verre liquide : texte lisible (AA) sur le pire fond ; l'éclat et le survol ne bougent que `transform` et `opacity`", () => {
  const photo = /--photo:\s*([\d.]+) ([\d.]+)% ([\d.]+)%/.exec(css)!;
  const cream = hslToRgb([Number(photo[1]), Number(photo[2]), Number(photo[3])]);
  const ink = [18, 20, 15];
  const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v * (1 - t) + b[i] * t);
  // Verre clair : 6 % de la couleur du texte sur le pire pixel de la photo voilé (#FFC87D à 55 %), cf. le test du voile.
  const veiled = mix([0xff, 0xc8, 0x7d], ink, 0.55);
  const clear = /\.liquid-clear \{[^}]*\}/.exec(css)?.[0] ?? "";
  const tint = Number(/currentColor (\d+)%, transparent\);\s*border-color/.exec(clear)?.[1]) / 100;
  const shade = Number(/rgb\(var\(--veil\) \/ ([\d.]+)\)/.exec(clear)?.[1]);
  assert.ok(tint > 0 && tint <= 0.06 && shade > 0, `teinte ${tint}, voile ${shade}`);
  assert.ok(contrastRgb(cream, mix(mix(veiled, ink, shade), cream, tint)) >= 4.5, "texte crème sur le verre clair, au pire pixel de la photo");
  const paper = hslToRgb([36.5, 51.1, 91.2]);
  assert.ok(contrastRgb(ink, mix(mix(paper, ink, shade), ink, tint)) >= 4.5, "texte encre sur le verre clair, sur le papier");
  // Verre orange : encre sur l'orange le moins opaque (72 %) posé sur le fond le plus sombre de la page (thème sombre), puis sur du blanc.
  const alpha = Number(/\.liquid-orange \{[^}]*tone-orange\) \/ 0\.95\), hsl\(var\(--tone-orange\) \/ ([\d.]+)\)/.exec(css)?.[1]);
  assert.ok(alpha >= 0.7, `opacité minimale du verre orange : ${alpha}`);
  const orange = hslToRgb([25, 96.2, 69.2]);
  assert.ok(contrastRgb(ink, mix(hslToRgb([185, 28.6, 8.2]), orange, alpha)) >= 4.5, "encre sur le verre orange, fond sombre");
  assert.ok(contrastRgb(ink, mix([255, 255, 255], orange, alpha)) >= 4.5, "encre sur le verre orange, fond blanc");
  assert.ok(contrastRgb(hslToRgb([36.5, 51.1, 91.2]), hslToRgb([182.2, 34.2, 15.5])) >= 4.5, "texte sur le verre « ink »");
  const sections = readFileSync("components/portfolio-sections.tsx", "utf8");
  assert.ok(sections.includes("LiquidButton") && readFileSync("components/portfolio-showcase.tsx", "utf8").includes("liquid-ink"));
});

test("jetons du portfolio : contrastes AA (clair et sombre) sur le fond, les cartes et les sections grisées", () => {
  const tokens = (selector: RegExp) => {
    const body = blocks(css, selector)[0] ?? "";
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([\d.]+) ([\d.]+)% ([\d.]+)%/g)].map((m) => [m[1], [Number(m[2]), Number(m[3]), Number(m[4])] as const]));
  };
  const light = tokens(/\.folio\s*\{/);
  const dark = { ...light, ...tokens(/\.dark \.folio\s*\{/) };
  for (const [name, t] of [["clair", light], ["sombre", dark]] as const) {
    for (const bg of ["background", "card", "muted"]) {
      assert.ok(ratio(t.foreground, t[bg]) >= 4.5, `${name} : texte sur ${bg}`);
      assert.ok(ratio(t["muted-foreground"], t[bg]) >= 4.5, `${name} : texte discret sur ${bg}`);
      assert.ok(ratio(t.primary, t[bg]) >= 4.5, `${name} : primaire (liens) sur ${bg}`);
    }
    assert.ok(ratio(t["primary-foreground"], t.primary) >= 4.5, `${name} : texte sur primaire`);
  }
  // Bouton orange à plat, texte encre (clair) ; l'orange n'est jamais du texte sur le papier.
  assert.ok(ratio(light["action-foreground"], light["tone-orange"]) >= 4.5, "texte encre sur le bouton orange");
  assert.ok(ratio(dark["action-foreground"], dark["tone-orange"]) >= 4.5, "texte encre sur le bouton orange (sombre)");
});

test("voile du hero : le texte crème tient AA (4,5:1) sur le PIRE pixel de la zone du texte, mesuré sur la photo (#FFC87D) et voilé", () => {
  const alpha = Number(/--veil: 18 20 15[\s\S]*?rgb\(var\(--veil\) \/ ([\d.]+)\)/.exec(css)?.[1]);
  assert.ok(alpha > 0 && alpha < 1, "opacité du voile introuvable");
  const worst = [0xff, 0xc8, 0x7d].map((c, i) => c * (1 - alpha) + [18, 20, 15][i] * alpha);
  const photo = /--photo:\s*([\d.]+) ([\d.]+)% ([\d.]+)%/.exec(css);
  assert.ok(photo, "jeton --photo introuvable");
  const cream = hslToRgb([Number(photo[1]), Number(photo[2]), Number(photo[3])]);
  assert.ok(contrastRgb(cream, worst) >= 4.5, `contraste ${contrastRgb(cream, worst).toFixed(2)}:1 avec un voile à ${alpha}`);
  assert.ok(alpha <= 0.6, "le voile reste discret (le sujet n'est pas assombri)");
  const sections = readFileSync("components/portfolio-sections.tsx", "utf8");
  assert.ok(sections.includes("lg:text-photo"), "le texte du hero prend la couleur du jeton --photo, celle du calcul");
});

test("image du hero : toutes les variantes existent, dans la taille annoncée, sous 350 Ko ; l'original est conservé hors du dossier servi", () => {
  const expected: Record<string, [number, number]> = { "wide-2000": [2000, 1116], "wide-1400": [1400, 781], "crop-1200": [1200, 900], "crop-800": [800, 600] };
  for (const [name, [w, h]] of Object.entries(expected)) {
    for (const ext of ["avif", "webp"]) {
      const file = `public/images/hero/hero-${name}.${ext}`;
      assert.ok(existsSync(file), `${file} manquant (npm run build:hero)`);
      assert.ok(statSync(file).size <= 350 * 1024, `${file} : ${Math.round(statSync(file).size / 1024)} Ko`);
      // Dimensions lues dans l'en-tête : AVIF (boîte « ispe ») ou WebP (VP8 / VP8L / VP8X).
      assert.deepEqual(dimensions(file), [w, h], file);
    }
  }
  assert.ok(existsSync("assets-source/hero-surf-original.jpg"));
  assert.ok(!existsSync("public/images/hero/hero-surf-original.jpg"));
  const readme = readFileSync("assets-source/README.md", "utf8");
  assert.match(readme, /Gemini \(Nano Banana Pro\)/);
  assert.match(readme, /03 nov 2026/);
  assert.ok(!/©|copyright|licen[cs]e/i.test(readme), "aucune licence ni mention de copyright");
});

test("hero : photo en <picture> AVIF + WebP avec srcset, chargée en priorité, dimensions explicites, jamais en chargement différé ; texte alternatif présent", () => {
  const src = readFileSync("components/portfolio-sections.tsx", "utf8");
  const img = /<img[\s\S]*?\/>/.exec(src)?.[0] ?? "";
  assert.match(img, /fetchPriority="high"/);
  assert.match(img, /width=\{1200\}[\s\S]*height=\{900\}/);
  assert.ok(!/loading=/.test(img), "pas de lazy-load sur l'image du hero");
  assert.match(img, /alt=\{HERO\.imageAlt\}/);
  assert.ok(/image\/\$\{ext\}/.test(src) && src.includes('["avif", "webp"]'));
  assert.ok(src.includes("wide-1400") && src.includes("wide-2000") && src.includes("crop-800") && src.includes("crop-1200"));
});

test("composition de la page : toutes les sections, dans l'ordre, une seule fois ; réalisations en flux séparé ; signaux de Next relancés", () => {
  const order = ["PortfolioHeader", "PortfolioHero", "PortfolioLever", "PortfolioProcess", "PortfolioServices", "PortfolioStack", "PortfolioShowcaseFrame", "PortfolioContact", "PortfolioFooter"];
  const body = page.slice(page.indexOf("export default function PortfolioPage"));
  const positions = order.map((name) => {
    const found = [...body.matchAll(new RegExp(`<${name}[\\s/>]`, "g"))];
    assert.equal(found.length, 1, `${name} absent ou en double dans la page`);
    return found[0].index!;
  });
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "ordre des sections");
  assert.ok(body.includes("<Suspense"), "les réalisations arrivent en flux : le reste de la page n'attend pas la base");
  assert.ok(page.includes("unstable_rethrow"));
  assert.ok(/<main id="contenu"/.test(body), "le lien d'évitement vise <main id=contenu>");
});

test("contact : le lien « m'écrire » porte l'objet encodé du courriel", async () => {
  const { mailtoHref } = await import("./domain/portfolio.ts");
  const { CONTACT_EMAIL, CONTACT_SUBJECT } = await import("./portfolio-content.ts");
  assert.equal(mailtoHref(CONTACT_EMAIL, CONTACT_SUBJECT), `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}`);
});
