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

test("mouvement : les animations de la page n'animent que `transform` et `opacity` (pas de largeur, hauteur, marge ni position)", () => {
  for (const name of ["hero-in", "reveal-up"]) {
    const body = blocks(css, new RegExp(`@keyframes ${name}\\s*\\{`))[0] ?? "";
    assert.ok(body, `@keyframes ${name} introuvable`);
    assert.ok(!/\b(width|height|top|left|right|bottom|margin|padding)\s*:/.test(body), `${name} anime une propriété de mise en page`);
  }
});

test("direction éditoriale : aucun verre dépoli, bandeau défilant, vidéo ni pause d'animations ne reste dans la page publique", () => {
  const portfolioCss = css.slice(css.indexOf("/* Page publique du portfolio"));
  assert.ok(!/backdrop-filter|\.glass|\.marquee|\.mesh|data-motion/.test(portfolioCss));
  for (const file of ["components/portfolio-sections.tsx", "components/portfolio-showcase.tsx", "app/portfolio/page.tsx"]) {
    const src = readFileSync(file, "utf8");
    assert.ok(!/backdrop-blur|bg-gradient-sunset|text-brand-gradient|font-pixel|shadow-hard|<video|Marquee|MotionToggle/.test(src), `${file} garde un élément de l'ancienne direction`);
  }
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
