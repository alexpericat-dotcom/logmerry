/**
 * Génère `components/sketch-data.ts` : les pictogrammes de la page publique, en trait uniforme (« monoligne »), à la manière d'un jeu d'icônes de dessinateur :
 * géométrie nette, bouts arrondis, un seul accent orange par dessin. Chaque dessin est décrit en commandes de tracé (M, L, C, Q, A, Z) ; ce script les met à l'échelle,
 * les décale, les fait pivoter si besoin et écrit les chemins. Le résultat est déterministe : `npm run build:sketches`.
 */
import { writeFileSync } from "node:fs";

const f = (n) => String(Math.round(n * 10) / 10).replace(/^(-?)0\./, "$1.").replace(/^-0$/, "0");
const rad = (d) => (d * Math.PI) / 180;

/** Transformation : échelle, rotation (degrés, autour de (cx, cy)), décalage. */
const T = (o = {}) => {
  const { s = 1, ox = 0, oy = 0, rot = 0, cx = 0, cy = 0 } = o;
  const [c, n] = [Math.cos(rad(rot)), Math.sin(rad(rot))];
  const pt = (x, y) => {
    const [dx, dy] = [x - cx, y - cy];
    return [(cx + dx * c - dy * n) * s + ox, (cy + dx * n + dy * c) * s + oy];
  };
  return { pt, s };
};

/** Commandes → chaîne `d`. Seules M, L, C, Q, A, Z sont permises (pas de H ni V : ils ne survivent pas à une rotation). */
function build(cmds, t = T()) {
  let d = "";
  for (const [k, ...a] of cmds) {
    if (k === "Z") d += "Z";
    else if (k === "A") {
      const [rx, ry, rot, la, sw, x, y] = a;
      const [px, py] = t.pt(x, y);
      d += `A${f(rx * t.s)} ${f(ry * t.s)} ${rot} ${la} ${sw} ${f(px)} ${f(py)}`;
    } else {
      let out = k;
      for (let i = 0; i < a.length; i += 2) {
        const [px, py] = t.pt(a[i], a[i + 1]);
        out += `${i ? " " : ""}${f(px)} ${f(py)}`;
      }
      d += out;
    }
  }
  return d;
}

// Formes
const M = (x, y) => ["M", x, y];
const L = (x, y) => ["L", x, y];
const Z = ["Z"];
const line = (x1, y1, x2, y2) => [M(x1, y1), L(x2, y2)];
const poly = (pts, close = true) => [...pts.map(([x, y], i) => (i ? L(x, y) : M(x, y))), ...(close ? [Z] : [])];
const circle = (cx, cy, r) => [M(cx - r, cy), ["A", r, r, 0, 1, 0, cx + r, cy], ["A", r, r, 0, 1, 0, cx - r, cy], Z];
const ellipse = (cx, cy, rx, ry) => [M(cx - rx, cy), ["A", rx, ry, 0, 1, 0, cx + rx, cy], ["A", rx, ry, 0, 1, 0, cx - rx, cy], Z];
const arc = (cx, cy, r, a0, a1, sweep = 1) => [M(cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))), ["A", r, r, 0, Math.abs(a1 - a0) > 180 ? 1 : 0, sweep, cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))]];
const rrect = (x, y, w, h, r) => [
  M(x + r, y), L(x + w - r, y), ["A", r, r, 0, 0, 1, x + w, y + r], L(x + w, y + h - r), ["A", r, r, 0, 0, 1, x + w - r, y + h], L(x + r, y + h),
  ["A", r, r, 0, 0, 1, x, y + h - r], L(x, y + r), ["A", r, r, 0, 0, 1, x + r, y], Z,
];
/** Pointe de flèche à (x, y), orientée selon (dx, dy). */
const head = (x, y, dx, dy, size = 6) => {
  const len = Math.hypot(dx, dy);
  const [ux, uy] = [dx / len, dy / len];
  const a = rad(28);
  const p = (s) => [x - size * (ux * Math.cos(a) - s * uy * Math.sin(a)), y - size * (uy * Math.cos(a) + s * ux * Math.sin(a))];
  const [p1, p2] = [p(1), p(-1)];
  return [M(p1[0], p1[1]), L(x, y), L(p2[0], p2[1])];
};
const arrow = (x1, y1, x2, y2, size) => [...line(x1, y1, x2, y2), ...head(x2, y2, x2 - x1, y2 - y1, size)];
const plus = (x, y, r) => [...line(x, y - r, x, y + r), ...line(x - r, y, x + r, y)];

// Ampoule centrée à l'origine (verre, culot, filament, rayons), à placer avec T()
const bulbGlass = [M(-5, 7), ["C", -5, 4, -10, 2, -10, -4], ["A", 10, 10, 0, 1, 1, 10, -4], ["C", 10, 2, 5, 4, 5, 7], Z];
const bulbBase = [...line(-4.5, 11, 4.5, 11), ...line(-3, 15, 3, 15)];
const bulbFilament = poly([[-3, 7], [-3, -1], [0, -4], [3, -1], [3, 7]], false);
const bulbRays = [...line(0, -19, 0, -23), ...line(-14, -14, -17, -17), ...line(14, -14, 17, -17), ...line(-19, -4, -23, -4), ...line(19, -4, 23, -4)];

// Cube isométrique de côté s centré en (cx, cy) : contour hexagonal + trois arêtes
const hex = (cx, cy, s) => [[cx, cy - s], [cx + 0.866 * s, cy - s / 2], [cx + 0.866 * s, cy + s / 2], [cx, cy + s], [cx - 0.866 * s, cy + s / 2], [cx - 0.866 * s, cy - s / 2]];
const cubeEdges = (cx, cy, s) => [...line(cx, cy, cx - 0.866 * s, cy - s / 2), ...line(cx, cy, cx + 0.866 * s, cy - s / 2), ...line(cx, cy, cx, cy + s)];

const out = {};
const W = { ink: 2.2, thin: 1.3, accent: 2.2, bold: 4.2 };
/** `fn(add)` : add(commandes, genre, transformation) ajoute un tracé. */
const draw = (name, w, h, fn) => {
  const strokes = [];
  fn((cmds, k = "ink", t) => strokes.push({ d: build(cmds, t), k, w: W[k] }));
  out[name] = { box: `0 0 ${w} ${h}`, strokes };
};

// ---------- petites icônes (64 × 64) ----------

draw("window", 64, 64, (a) => {
  a(rrect(6, 8, 52, 36, 3));
  a(line(32, 44, 32, 52));
  a(line(22, 54, 42, 54));
  a(rrect(11, 13, 28, 22, 1.5));
  a(poly([[11, 33], [20, 22], [26, 29], [30, 25], [39, 33]], false));
  a(circle(33, 19, 2), "accent");
  a([...line(44, 15, 53, 15), ...line(44, 21, 53, 21), ...line(44, 27, 53, 27)]);
  a(poly([[36, 28], [36, 41], [39.5, 38], [42, 44], [44.5, 43], [42, 37], [46.5, 36.5]]), "accent");
});

draw("cog", 64, 64, (a) => {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    for (const [da, r] of [[-13, 18.5], [-8, 25], [8, 25], [13, 18.5]]) pts.push([32 + Math.cos(rad(i * 45 + da)) * r, 32 + Math.sin(rad(i * 45 + da)) * r]);
  }
  a(poly(pts));
  a(circle(32, 32, 8.5));
  a(circle(32, 32, 2.5), "accent");
});

draw("database", 64, 64, (a) => {
  a(ellipse(32, 14, 20, 7));
  a([M(12, 14), L(12, 50), ["A", 20, 7, 0, 0, 0, 52, 50], L(52, 14)]);
  a([M(12, 26), ["A", 20, 7, 0, 0, 0, 52, 26]]);
  a([M(12, 38), ["A", 20, 7, 0, 0, 0, 52, 38]], "accent");
});

draw("chat", 64, 64, (a) => {
  a([M(12, 10), L(42, 10), ["A", 6, 6, 0, 0, 1, 48, 16], L(48, 34), ["A", 6, 6, 0, 0, 1, 42, 40], L(28, 40), L(18, 50), L(18, 40), L(12, 40), ["A", 6, 6, 0, 0, 1, 6, 34], L(6, 16), ["A", 6, 6, 0, 0, 1, 12, 10], Z]);
  a([...line(13, 20, 41, 20), ...line(13, 28, 31, 28)]);
  a([...plus(54, 10, 6)], "accent");
});

draw("cloud", 64, 64, (a) => {
  a([M(16, 46), ["C", 8, 46, 6, 36, 13, 33], ["C", 12, 24, 24, 20, 28, 27], ["C", 32, 16, 48, 20, 47, 31], ["C", 56, 30, 58, 46, 48, 46], Z]);
  a(arrow(32, 58, 32, 34, 6), "accent");
});

draw("shield", 64, 64, (a) => {
  a([M(32, 5), L(52, 12), L(52, 30), ["C", 52, 43, 44, 52, 32, 59], ["C", 20, 52, 12, 43, 12, 30], L(12, 12), Z]);
  a(poly([[22, 31], [29, 38], [42, 24]], false), "accent");
});

draw("magnifier", 64, 64, (a) => {
  a(circle(26, 26, 17));
  a(arc(26, 26, 11, 200, 260), "thin");
  a(line(38.5, 38.5, 54, 54), "bold");
  a(line(48, 48, 54, 54), "accent");
});

draw("loop", 64, 64, (a) => {
  const [p0, p1] = [[32 + 21 * Math.cos(rad(205)), 32 + 21 * Math.sin(rad(205))], [32 + 21 * Math.cos(rad(335)), 32 + 21 * Math.sin(rad(335))]];
  a([M(p0[0], p0[1]), ["A", 21, 21, 0, 0, 1, p1[0], p1[1]]]);
  a(head(p1[0], p1[1], -Math.sin(rad(335)), Math.cos(rad(335)), 7));
  const [q0, q1] = [[32 + 21 * Math.cos(rad(25)), 32 + 21 * Math.sin(rad(25))], [32 + 21 * Math.cos(rad(155)), 32 + 21 * Math.sin(rad(155))]];
  a([M(q0[0], q0[1]), ["A", 21, 21, 0, 0, 1, q1[0], q1[1]]], "accent");
  a(head(q1[0], q1[1], -Math.sin(rad(155)), Math.cos(rad(155)), 7), "accent");
});

draw("wrench", 64, 64, (a) => {
  // clé plate à mâchoire ouverte, dessinée à la verticale puis inclinée à 45°
  const t = T({ rot: 45, cx: 32, cy: 32 });
  a([M(26.8, 20.4), ["A", 9, 9, 0, 0, 1, 28.9, 4.5], L(29.5, 11), L(34.5, 11), L(35.1, 4.5), ["A", 9, 9, 0, 0, 1, 37.2, 20.4], L(35.5, 22.5), L(35.5, 54), ["A", 3.5, 3.5, 0, 0, 1, 28.5, 54], L(28.5, 22.5), Z], "ink", t);
  a(circle(32, 52, 1.6), "accent", t);
});

draw("question", 64, 64, (a) => {
  a([M(21, 21), ["A", 11, 11, 0, 1, 1, 37, 30.5], ["C", 33.5, 32.5, 32, 34, 32, 38]]);
  a(circle(32, 48, 2.2), "accent");
  a([...line(9, 14, 14, 19), ...line(55, 14, 50, 19), ...line(7, 32, 13, 32), ...line(51, 32, 57, 32)], "thin");
});

draw("flow", 64, 64, (a) => {
  a(rrect(4, 8, 20, 14, 2));
  a(rrect(40, 8, 20, 14, 2));
  a(rrect(22, 42, 20, 14, 2));
  a([...line(8, 13, 18, 13), ...line(8, 17, 14, 17)], "thin");
  a(arrow(24, 15, 40, 15, 5), "accent");
  a([M(50, 22), L(50, 32), L(32, 32), L(32, 42), ...head(32, 42, 0, 1, 5)], "accent");
  a(poly([[27, 49], [31, 53], [37, 46]], false));
});

draw("spark", 64, 64, (a) => {
  a([M(30, 6), ["Q", 32, 28, 54, 30], ["Q", 32, 32, 30, 54], ["Q", 28, 32, 6, 30], ["Q", 28, 28, 30, 6], Z]);
  a(plus(52, 9, 5), "accent");
  a(plus(12, 50, 4), "thin");
});

draw("rocket", 64, 64, (a) => {
  a([M(32, 5), ["C", 42, 12, 45, 26, 41, 42], L(23, 42), ["C", 19, 26, 22, 12, 32, 5], Z]);
  a(circle(32, 24, 5));
  a([M(23, 33), L(14, 44), L(23, 42)]);
  a([M(41, 33), L(50, 44), L(41, 42)]);
  a(poly([[27, 42], [27, 47], [37, 47], [37, 42]], false));
  a([M(29, 51), ["Q", 32, 62, 35, 51]], "accent");
});

draw("compass", 64, 64, (a) => {
  // compas à gauche, crayon à droite
  a(circle(18, 9, 3.5));
  a([...line(18, 12.5, 7, 54), ...line(18, 12.5, 29, 54)]);
  a([...line(7, 54, 6, 58), ...line(29, 54, 30, 58)]);
  a([M(11, 34), ["Q", 18, 31, 25, 34]], "thin");
  a([M(42, 10), ["A", 2, 2, 0, 0, 1, 44, 8], L(50, 8), ["A", 2, 2, 0, 0, 1, 52, 10], L(52, 44), L(47, 56), L(42, 44), Z]);
  a([...line(42, 16, 52, 16), ...line(42, 44, 52, 44)]);
  a(line(45.5, 51, 48.5, 51), "accent");
});

// ---------- grandes scènes ----------

draw("head", 130, 112, (a) => {
  // profil et ampoule : « l'outil vient après le problème », on commence par comprendre
  a([M(46, 12), ["C", 30, 14, 22, 28, 24, 42], L(16, 56), L(24, 58), L(24, 64), L(28, 66), L(28, 72), ["C", 28, 77, 32, 79, 38, 79], L(46, 79), L(46, 96), L(86, 96), L(86, 82), ["C", 92, 72, 94, 58, 92, 42], ["C", 90, 24, 72, 10, 46, 12], Z]);
  const t = T({ ox: 60, oy: 44 });
  a(bulbGlass, "ink", t);
  a(bulbBase, "ink", t);
  a(bulbFilament, "thin", t);
  a(bulbRays.filter((c) => c), "accent", T({ ox: 60, oy: 44, s: 0.8 }));
  a(plus(112, 26, 6), "accent");
  a(plus(8, 14, 4), "thin");
});

draw("funnel", 150, 140, (a) => {
  a(ellipse(75, 38, 60, 9));
  a(line(15, 40, 66, 92));
  a(line(135, 40, 84, 92));
  a([M(66, 92), L(66, 112), ["Q", 75, 118, 84, 112], L(84, 92)]);
  // ce qui entre : formes irrégulières ; ce qui sort : un cercle net, validé
  a(poly([[30, 20], [40, 4], [50, 20]]));
  a(circle(76, 12, 8));
  a(rrect(98, 4, 16, 16, 2));
  a(poly([[122, 20], [128, 4], [141, 10], [140, 22]]));
  a(line(60, 28, 62, 33), "thin");
  a(line(92, 28, 90, 33), "thin");
  a(circle(75, 130, 7), "accent");
  a(poly([[71.5, 130], [74, 133], [79, 127]], false), "accent");
});

draw("cubes", 130, 150, (a) => {
  // trois briques isométriques : deux posées, une qu'on met en place
  const s = 26;
  for (const [cx, cy, k] of [[32, 114, "ink"], [86, 114, "ink"], [59, 50, "accent"]]) {
    a(poly(hex(cx, cy, s)), k);
    a(cubeEdges(cx, cy, s), k === "accent" ? "accent" : "thin");
  }
  a([...line(100, 36, 108, 30), ...line(104, 48, 114, 46), ...line(14, 40, 14, 56)], "accent");
  a(line(10, 146, 120, 146), "thin");
});

draw("talk", 220, 130, (a) => {
  // « Parlons de votre problème » : une bulle avec une question, une bulle avec l'idée
  const bubble = (x, y, w, h, tailX, dir) =>
    [M(x + 10, y), L(x + w - 10, y), ["A", 10, 10, 0, 0, 1, x + w, y + 10], L(x + w, y + h - 10), ["A", 10, 10, 0, 0, 1, x + w - 10, y + h],
      ...(dir > 0 ? [L(tailX + 14, y + h), L(tailX, y + h + 14), L(tailX, y + h), L(x + 10, y + h)] : [L(tailX, y + h), L(tailX, y + h + 14), L(tailX - 14, y + h), L(x + 10, y + h)]),
      ["A", 10, 10, 0, 0, 1, x, y + h - 10], L(x, y + 10), ["A", 10, 10, 0, 0, 1, x + 10, y], Z];
  a(bubble(4, 8, 96, 58, 24, 1));
  a(bubble(118, 52, 96, 58, 196, -1));
  const q = T({ ox: 28, oy: 6, s: 0.85 });
  a([M(21, 21), ["A", 11, 11, 0, 1, 1, 37, 30.5], ["C", 33.5, 32.5, 32, 34, 32, 38]], "ink", q);
  a(circle(32, 48, 2.2), "accent", q);
  const b = T({ ox: 166, oy: 79 });
  a(bulbGlass, "ink", b);
  a(bulbBase, "ink", b);
  a(bulbFilament, "thin", b);
  a(bulbRays, "accent", T({ ox: 166, oy: 79, s: 0.75 }));
  a([...[0, 9, 18].flatMap((dx) => circle(120 + dx, 126, 1.2))], "thin");
});

const ts = `/* Généré par scripts/build-sketches.mjs (npm run build:sketches) : ne pas modifier à la main. Pictogrammes monoligne de la page publique. */
export type SketchKind = "ink" | "thin" | "accent" | "bold";
export type SketchStroke = { d: string; k: SketchKind; w: number };
export type SketchDrawing = { box: string; strokes: SketchStroke[] };

export const SKETCH_DATA = ${JSON.stringify(out)} as const satisfies Record<string, SketchDrawing>;
`;
writeFileSync(process.env.SKETCH_OUT ?? "components/sketch-data.ts", ts);
console.log(Object.entries(out).map(([n, d]) => `${n}: ${d.strokes.length} tracés`).join("\n"));
