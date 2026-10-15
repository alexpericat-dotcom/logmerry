import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const DESIGN = "_bmad-output/planning-artifacts/ux-designs/ux-logmerry-2026-10-11/DESIGN.md";

type Hsl = [number, number, number];

/** Jetons « --nom: H S% L% » d'un bloc de app/globals.css (`:root` pour le clair, `.dark` pour le sombre). */
function tokens(block: ":root" | ".dark"): Record<string, Hsl> {
  const css = read("app/globals.css");
  const start = css.indexOf(block === ":root" ? "  :root,\n  .light {" : `  ${block} {`);
  assert.ok(start >= 0, `bloc ${block} introuvable dans globals.css`);
  const body = css.slice(start, css.indexOf("\n  }", start));
  const out: Record<string, Hsl> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

function toRgb([h, s, l]: Hsl): [number, number, number] {
  const S = s / 100, L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

const toHex = (hsl: Hsl) => "#" + toRgb(hsl).map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const luminance = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(a: Hsl, b: Hsl): number {
  const [x, y] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Couleurs de DESIGN.md (bloc `colors:` du début du fichier) : { nom: "#RRGGBB" }. */
function designColors(): Record<string, string> {
  const front = read(DESIGN).split("---")[1];
  const out: Record<string, string> = {};
  for (const m of front.matchAll(/^\s{2}([a-z0-9-]+):\s*'(#[0-9A-Fa-f]{6})'/gm)) out[m[1]] = m[2].toUpperCase();
  return out;
}

for (const [name, block, suffix] of [["clair", ":root", ""], ["sombre", ".dark", "-dark"]] as const) {
  test(`thème ${name} : chaque jeton de globals.css a la valeur de DESIGN.md (à un niveau de canal près, arrondi HSL compris)`, () => {
    const design = designColors();
    const t = tokens(block);
    let checked = 0;
    for (const [token, hsl] of Object.entries(t)) {
      const wanted = design[`${token}${suffix}`];
      if (!wanted) continue; // jeton propre au gabarit, sans valeur dans DESIGN.md
      const got = channels(toHex(hsl));
      const want = channels(wanted);
      assert.ok(got.every((c, i) => Math.abs(c - want[i]) <= 1), `${name} : --${token} = ${toHex(hsl)}, DESIGN.md = ${wanted}`);
      checked++;
    }
    assert.ok(checked >= 20, `trop peu de jetons comparés à DESIGN.md (${checked}) : le fichier n'est plus lu correctement`);
  });
}

// Couples de jetons : [premier plan, arrière-plan]. Les jetons « success », « warning » et « destructive » servent aux états d'indexation.
const TEXT: [string, string][] = [
  ["foreground", "background"], ["foreground", "card"], ["card-foreground", "card"], ["popover-foreground", "popover"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"],
  ["primary-foreground", "primary"], ["secondary-foreground", "secondary"], ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["primary", "background"], ["primary", "card"], ["primary", "popover"], // liens dans le texte
  ["destructive", "background"], ["destructive", "card"],
  ["success", "background"], ["success", "card"], ["warning", "background"], ["warning", "card"],
];
const NON_TEXT: [string, string][] = [
  ["input", "background"], ["input", "card"],
  ["ring", "background"], ["ring", "card"], ["ring", "popover"],
  ["marker", "background"], ["marker", "card"],
  ...[1, 2, 3, 4, 5].flatMap((n): [string, string][] => [[`chart-${n}`, "background"], [`chart-${n}`, "card"]]),
]; // le filet (border, filet) est décoratif : il ne délimite aucun contrôle et n'est pas soumis à 3:1

for (const [name, block] of [["clair", ":root"], ["sombre", ".dark"]] as const) {
  test(`thème ${name} : texte à 4,5:1 au moins pour chaque couple de jetons utilisé`, () => {
    const t = tokens(block);
    for (const [fg, bg] of TEXT) {
      assert.ok(t[fg] && t[bg], `jeton absent : ${fg} ou ${bg}`);
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `${name} : ${fg} sur ${bg} = ${ratio.toFixed(2)} (4,5 attendu)`);
    }
  });

  test(`thème ${name} : bordures de champ, focus, marqueur et séries de graphiques à 3:1 au moins`, () => {
    const t = tokens(block);
    for (const [fg, bg] of NON_TEXT) {
      assert.ok(t[fg] && t[bg], `jeton absent : ${fg} ou ${bg}`);
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 3, `${name} : ${fg} sur ${bg} = ${ratio.toFixed(2)} (3 attendu)`);
    }
  });
}

test("chaque jeton existe dans les deux thèmes, dégradés compris (un thème ne se livre jamais sans son pendant)", () => {
  assert.deepEqual(Object.keys(tokens(".dark")).sort(), Object.keys(tokens(":root")).sort());
  const css = read("app/globals.css");
  const [light, dark] = [css.indexOf("  :root,\n  .light {"), css.indexOf("  .dark {")];
  for (const g of ["--gradient-1", "--gradient-2", "--gradient-action"]) {
    assert.ok(css.slice(light, dark).includes(`${g}:`), `${g} clair absent`);
    assert.ok(css.slice(dark).includes(`${g}:`), `${g} sombre absent`);
  }
  for (const name of ["background", "foreground", "card", "primary", "accent", "destructive", "success", "warning", "marker", "action-foreground", "filet", "border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]) {
    assert.ok(name in tokens(":root"), `jeton ${name} absent`);
  }
  assert.ok(!("warning-icon" in tokens(":root")), "warning-icon a été supprimé (plus d'orange dans la palette)");
});

test("la signature n'est ni un état ni une série de graphique (écart de teinte de 40° au moins avec success, warning, destructive)", () => {
  for (const block of [":root", ".dark"] as const) {
    const t = tokens(block);
    for (const state of ["success", "warning", "destructive"]) {
      const d = Math.abs(t["primary"][0] - t[state][0]) % 360;
      assert.ok(Math.min(d, 360 - d) >= 40, `${block} : primary trop proche de ${state}`);
    }
  }
});

test("le bouton d'action utilise le dégradé d'action et son texte dédié, et chaque page porte un bandeau", () => {
  const button = read("components/ui/button.tsx");
  assert.ok(/bg-gradient-action[^"]*text-action-foreground/.test(button), "bouton par défaut : dégradé d'action");
  for (const page of ["app/(app)/notes/page.tsx", "app/(app)/parametres/page.tsx", "app/(app)/aujourd-hui/page.tsx", "app/(app)/notes/nouvelle/page.tsx"]) {
    assert.ok(read(page).includes("<PageBanner"), `${page} : bandeau absent`);
  }
});

test("polices : Hanken Grotesk (interface) et IBM Plex Mono (chiffres), auto-hébergées par next/font", () => {
  const layout = read("app/layout.tsx");
  assert.ok(/Hanken_Grotesk/.test(layout) && /IBM_Plex_Mono/.test(layout) && /Bricolage_Grotesque/.test(layout), "polices du thème");
  assert.ok(!/Plus_Jakarta_Sans/.test(layout), "l'ancienne police est encore importée");
});

test("chaque thème déclare son color-scheme : les contrôles natifs (menu déroulant) suivent le thème de l'application et non celui du système", () => {
  const css = read("app/globals.css");
  const [light, dark] = [css.indexOf("  :root,\n  .light {"), css.indexOf("  .dark {")];
  assert.ok(/color-scheme:\s*light/.test(css.slice(light, dark)), "color-scheme: light dans :root");
  assert.ok(/color-scheme:\s*dark/.test(css.slice(dark, dark + 200)), "color-scheme: dark dans .dark");
  assert.ok(/select option\s*\{[^}]*--popover/.test(css), "options du menu déroulant colorées par les jetons");
});

test("valeurs de référence de DESIGN.md : texte sur fond 14,93 (clair) et 16,84 (sombre), bouton clair 6,73", () => {
  const l = tokens(":root"), d = tokens(".dark");
  assert.ok(Math.abs(contrast(l["foreground"], l["background"]) - 14.93) < 0.1);
  assert.ok(Math.abs(contrast(d["foreground"], d["background"]) - 16.84) < 0.1);
  assert.ok(Math.abs(contrast(l["primary-foreground"], l["primary"]) - 6.73) < 0.1);
});

test("clair, direction Arcade : texte marine lisible sur chaque accent décoratif, titres pixel à 3:1 sur fond et carte (clair et sombre)", () => {
  const t = tokens(":root");
  for (const tone of ["tone-teal", "tone-violet", "tone-orange", "tone-pink", "tone-yellow", "accent"]) {
    for (const fg of ["foreground", "action-foreground"]) {
      assert.ok(contrast(t[fg], t[tone]) >= 4.5, `${fg} sur ${tone} = ${contrast(t[fg], t[tone]).toFixed(2)}`);
    }
  }
  for (const block of [":root", ".dark"] as const) {
    const x = tokens(block);
    for (const bg of ["background", "card"]) {
      assert.ok(contrast(x["display"], x[bg]) >= 3, `${block} : display sur ${bg} = ${contrast(x["display"], x[bg]).toFixed(2)} (3 attendu, grand texte)`);
    }
  }
});

test("clair, direction Arcade : traits et ombres portés par jetons (--border-w, --shadow-hard) dans les deux thèmes, police pixel déclarée", () => {
  const css = read("app/globals.css");
  const [light, dark] = [css.indexOf("  :root,\n  .light {"), css.indexOf("  .dark {")];
  for (const v of ["--border-w", "--shadow-hard", "--banner-size", "--radius"]) {
    assert.ok(css.slice(light, dark).includes(`${v}:`), `${v} clair absent`);
    assert.ok(css.slice(dark).includes(`${v}:`), `${v} sombre absent`);
  }
  assert.ok(/Pixelify_Sans/.test(read("app/layout.tsx")), "Pixelify Sans importée");
  assert.ok(/pixel:/.test(read("tailwind.config.ts")), "famille « pixel » déclarée");
});

/** Fichiers de l'interface (hors tests) : app, components, lib. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, entry);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(tsx?|css)$/.test(entry) && !/\.test\.ts$/.test(entry) && rel !== "app/globals.css") out.push(rel);
  }
  return out;
}

const ILLUSTRATIONS = ["components/theme-devices.tsx"];

test("aucune couleur écrite en dur hors jetons : ni hexadécimal, ni couleur nommée de Tailwind (le rideau noir translucide d'une fenêtre est permis)", () => {
  const forbidden = /#[0-9a-fA-F]{3,8}\b|\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:red|green|blue|gray|grey|neutral|slate|zinc|stone|yellow|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/g;
  const hits: string[] = [];
  for (const dir of ["app", "components", "lib"]) {
    for (const file of sourceFiles(dir)) {
      // Illustrations (SVG dessinés) : leurs couleurs sont celles de l'objet représenté, pas des jetons d'interface.
      if (ILLUSTRATIONS.includes(file)) continue;
      // Le rideau noir translucide d'une fenêtre est permis, sous cette seule forme exacte.
      const code = read(file).replaceAll("backdrop:bg-black/50", "");
      for (const m of code.matchAll(forbidden)) hits.push(`${file} : ${m[0]}`);
    }
  }
  assert.deepEqual(hits, [], `couleur écrite en dur :\n${hits.join("\n")}`);
});
