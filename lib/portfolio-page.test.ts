import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/globals.css", "utf8");
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

test("mouvement : toute animation qui boucle ou se joue seule est dans « prefers-reduced-motion: no-preference » (ou coupée)", () => {
  let rest = css;
  for (const b of blocks(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{/)) rest = rest.replace(b, "");
  // Hors de ce bloc : plus aucune déclaration `animation:` / `animation-name:` autre que « none » ou la mise en pause, et `@keyframes` ne compte pas.
  const withoutKeyframes = blocks(rest, /@keyframes [\w-]+\s*\{/).reduce((acc, b) => acc.replace(b, ""), rest);
  const offenders = [...withoutKeyframes.matchAll(/animation(?:-name)?\s*:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => v !== "none" && v !== "none !important");
  // Le curseur clignotant du cockpit (ancien) n'est pas dans ce bloc : il est coupé par son propre bloc « mouvement réduit ».
  const caret = offenders.filter((v) => v.startsWith("typed-blink"));
  assert.ok(caret.length === 0 || /prefers-reduced-motion: reduce\)\s*\{\s*\.typed-caret\s*\{\s*animation:\s*none/.test(css), "le curseur clignotant n'est pas coupé en mouvement réduit");
  assert.deepEqual(offenders.filter((v) => !v.startsWith("typed-blink")), []);
});

test("mouvement réduit : les copies du bandeau et le point du schéma sont masqués, le bandeau passe à la ligne", () => {
  const reduce = blocks(css, /@media \(prefers-reduced-motion: reduce\)\s*\{/).join("\n");
  assert.match(reduce, /\.marquee-dup,\s*\.pipe-dot\s*\{[^}]*display:\s*none/);
  assert.match(reduce, /\.marquee-track\s*\{[^}]*flex-wrap:\s*wrap/);
});

test("pause choisie par le visiteur : la règle `data-motion=paused` cible le bandeau, le point et les formes", () => {
  assert.match(css, /html\[data-motion="paused"\] \.marquee-track[\s\S]*html\[data-motion="paused"\] \.pipe-dot[\s\S]*html\[data-motion="paused"\] \.float-slow\s*\{\s*animation-play-state:\s*paused/);
});

test("impression : plus d'animation, bandeau sur toute sa largeur, décor masqué", () => {
  const print = blocks(css, /@media print\s*\{/).join("\n");
  for (const rule of [/\.reveal\s*\{[^}]*animation:\s*none/, /\.float-slow\s*\{[^}]*display:\s*none/, /\.marquee-track\s*\{[^}]*animation:\s*none/, /\.marquee-track\s*\{[^}]*width:\s*auto/]) assert.match(print, rule);
});

test("composition de la page : toutes les sections, dans l'ordre, une seule fois ; réalisations en flux séparé ; signaux de Next relancés", () => {
  const order = ["PortfolioHeader", "PortfolioHero", "PortfolioMarquee", "PortfolioLever", "PortfolioProcess", "PortfolioServices", "PortfolioStack", "PortfolioSkills", "PortfolioShowcaseFrame", "PortfolioContact", "PortfolioFooter"];
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
