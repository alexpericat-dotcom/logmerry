/**
 * Génère `components/sketch-data.ts` : les croquis de la page publique, « sortis d'un carnet ». On décrit chaque dessin avec des formes nettes (lignes, ellipses,
 * courbes, hachures) ; ce script les « dessine à la main » : traits légèrement arqués qui se croisent et dépassent aux angles, contours repassés d'un second trait
 * fin, hachures, surligneur orange décalé derrière le sujet. Le hasard est déterminé (graine fixe) : même résultat à chaque exécution. `npm run build:sketches`.
 */
import { writeFileSync } from "node:fs";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (n) => Math.round(n * 10) / 10;
/** Nombre court : « 0.5 » → « .5 », « -0.5 » → « -.5 », « 3.0 » → « 3 » (le fichier est servi à chaque visite). */
const num = (n) => String(r1(n)).replace(/^(-?)0\./, "$1.");
/** Chemin en coordonnées relatives : un départ absolu, puis des courbes quadratiques « q » (contrôle, arrivée) ; `pts` = [départ, (contrôle, arrivée)…]. */
function relPath(start, quads) {
  let [cx, cy] = [r1(start[0]), r1(start[1])];
  let d = `M${num(cx)} ${num(cy)}`;
  for (const [c, e] of quads) {
    const [qx, qy, ex, ey] = [r1(c[0]), r1(c[1]), r1(e[0]), r1(e[1])];
    d += `q${num(qx - cx)} ${num(qy - cy)} ${num(ex - cx)} ${num(ey - cy)}`;
    [cx, cy] = [ex, ey];
  }
  return d;
}
const rad = (d) => (d * Math.PI) / 180;

class Pad {
  constructor(w, h, seed, base = 2.3) {
    this.w = w;
    this.h = h;
    this.rand = rng(seed);
    this.base = base;
    this.strokes = [];
    this.k = 1;
    this.ox = 0;
    this.oy = 0;
  }
  /** Échelle et décalage pour réutiliser un dessin plus grand ou à un autre endroit. */
  place(k, ox = 0, oy = 0) {
    this.k = k;
    this.ox = ox;
    this.oy = oy;
    return this;
  }
  P([x, y]) {
    return [x * this.k + this.ox, y * this.k + this.oy];
  }
  get amp() {
    return 0.34 * Math.sqrt(this.k);
  }
  push(d, kind, w) {
    this.strokes.push({ d, k: kind, w: r1(w) });
  }
  width(kind) {
    return kind === "thin" ? this.base * 0.55 : kind === "marker" ? this.base * 3.6 : kind === "guide" ? this.base * 0.3 : this.base;
  }
  /** Un trait droit, légèrement arqué, qui dépasse un peu à chaque bout. */
  line(a, b, o = {}) {
    const kind = o.k ?? "ink";
    const [x1, y1] = this.P(a);
    const [x2, y2] = this.P(b);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const over = o.over ?? 1.1;
    const passes = o.double ? 2 : 1;
    for (let p = 0; p < passes; p++) {
      const j = (n) => (this.rand() - 0.5) * 2 * n;
      const s = p === 0 ? this.amp : this.amp * 1.6;
      const sx = x1 - ux * this.rand() * over + j(s * 0.6);
      const sy = y1 - uy * this.rand() * over + j(s * 0.6);
      const ex = x2 + ux * this.rand() * over + j(s * 0.6);
      const ey = y2 + uy * this.rand() * over + j(s * 0.6);
      const bow = j(Math.min(1.4, len * 0.025 + 0.3)) * (p === 0 ? 1 : 1.6);
      const mx = (sx + ex) / 2 - uy * bow;
      const my = (sy + ey) / 2 + ux * bow;
      this.push(relPath([sx, sy], [[[mx, my], [ex, ey]]]), p === 0 ? kind : "thin", p === 0 ? this.width(kind) : this.width("thin"));
    }
  }
  /** Une suite de segments droits (angles vifs : chaque côté est un trait). */
  poly(pts, o = {}) {
    const n = o.closed === false ? pts.length - 1 : pts.length;
    for (let i = 0; i < n; i++) this.line(pts[i], pts[(i + 1) % pts.length], o);
  }
  rect(x, y, w, h, o = {}) {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
  }
  /** Une courbe lisse qui passe par les points (Catmull-Rom), tracée d'un geste. */
  curve(pts, o = {}) {
    const kind = o.k ?? "ink";
    const P = pts.map((p) => this.P(p));
    const dense = [];
    const pad = [P[0], ...P, P[P.length - 1]];
    for (let i = 1; i < pad.length - 2; i++) {
      const [p0, p1, p2, p3] = [pad[i - 1], pad[i], pad[i + 1], pad[i + 2]];
      const steps = Math.max(4, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        dense.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    dense.push(P[P.length - 1]);
    this.smooth(dense, kind, o);
    if (o.double) this.smooth(dense, "thin", { ...o, amp: this.amp * 1.7 });
    return dense;
  }
  smooth(dense, kind, o) {
    const a = o.amp ?? this.amp * 0.55;
    const j = () => (this.rand() - 0.5) * 2 * a;
    const pts = dense.map(([x, y], i) => (i === 0 || i === dense.length - 1 ? [x, y] : [x + j(), y + j()]));
    // dépassement du premier et du dernier point, dans le sens du trait
    const s = pts[0];
    const s2 = pts[Math.min(2, pts.length - 1)];
    const e = pts[pts.length - 1];
    const e2 = pts[Math.max(0, pts.length - 3)];
    const ext = (p, q, f) => [p[0] + ((p[0] - q[0]) / (Math.hypot(p[0] - q[0], p[1] - q[1]) || 1)) * f, p[1] + ((p[1] - q[1]) / (Math.hypot(p[0] - q[0], p[1] - q[1]) || 1)) * f];
    if (!o.noOver) {
      pts[0] = ext(s, s2, this.rand() * 1.4);
      pts[pts.length - 1] = ext(e, e2, this.rand() * 1.4);
    }
    // on ne garde qu'un point tous les ~7 unités (14 pour le surligneur) : assez pour la main levée, bien moins d'octets
    const step = kind === "marker" ? 14 : 7;
    const kept = [pts[0]];
    let last = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      if (Math.hypot(pts[i][0] - last[0], pts[i][1] - last[1]) >= step) {
        kept.push(pts[i]);
        last = pts[i];
      }
    }
    kept.push(pts[pts.length - 1]);
    const quads = [];
    for (let i = 1; i < kept.length - 1; i++) quads.push([kept[i], [(kept[i][0] + kept[i + 1][0]) / 2, (kept[i][1] + kept[i + 1][1]) / 2]]);
    quads.push([[(kept[kept.length - 2][0] + kept[kept.length - 1][0]) / 2, (kept[kept.length - 2][1] + kept[kept.length - 1][1]) / 2], kept[kept.length - 1]]);
    const d = relPath(kept[0], kept.length > 2 ? quads : [[[(kept[0][0] + kept[1][0]) / 2, (kept[0][1] + kept[1][1]) / 2], kept[1]]]);
    this.push(d, kind, kind === "thin" ? this.width("thin") : this.width(kind));
  }
  /** Une ellipse (ou un arc : angles en degrés, 0 = à droite, sens horaire), avec un léger recouvrement de la fin sur le début. */
  ellipse(cx, cy, rx, ry, o = {}) {
    const a0 = o.from ?? -90 + (this.rand() - 0.5) * 30;
    const full = o.to === undefined;
    const a1 = full ? a0 + 360 + 22 : o.to;
    const n = Math.max(10, Math.round(Math.abs(a1 - a0) / 14));
    const pts = [];
    const wob = (this.rand() - 0.5) * 0.06;
    for (let i = 0; i <= n; i++) {
      const a = rad(a0 + ((a1 - a0) * i) / n);
      const k = 1 + wob * Math.sin(i * 0.9) + (this.rand() - 0.5) * 0.03;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    this.curve(pts, { ...o, noOver: full });
  }
  /** Le tracé d'un arc, sans pointe : retourne la tangente de fin pour poser une flèche. */
  arrowHead(tip, from, o = {}) {
    const [tx, ty] = this.P(tip);
    const [fx, fy] = this.P(from);
    const ang = Math.atan2(ty - fy, tx - fx);
    const len = (o.size ?? 7) * Math.sqrt(this.k);
    for (const s of [-1, 1]) {
      const a = ang + Math.PI + s * rad(28);
      this.line([(tx + Math.cos(a) * len - this.ox) / this.k, (ty + Math.sin(a) * len - this.oy) / this.k], tip, { k: o.k ?? "ink", over: 0.4 });
    }
  }
  /** Flèche droite. */
  arrow(a, b, o = {}) {
    this.line(a, b, o);
    this.arrowHead(b, a, o);
  }
  /** Flèche courbe : la courbe, puis une pointe dans le sens de la fin. */
  curveArrow(pts, o = {}) {
    this.curve(pts, o);
    this.arrowHead(pts[pts.length - 1], pts[pts.length - 2], o);
  }
  /** Hachures parallèles dans un polygone convexe. */
  hatch(poly, angle = 55, gap = 3.2, o = {}) {
    const a = rad(angle);
    const dir = [Math.cos(a), Math.sin(a)];
    const nor = [-dir[1], dir[0]];
    const proj = poly.map(([x, y]) => x * nor[0] + y * nor[1]);
    const lo = Math.min(...proj);
    const hi = Math.max(...proj);
    for (let t = lo + gap / 2; t < hi; t += gap * (0.85 + this.rand() * 0.3)) {
      const hits = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        const q = poly[(i + 1) % poly.length];
        const tp = p[0] * nor[0] + p[1] * nor[1];
        const tq = q[0] * nor[0] + q[1] * nor[1];
        if ((tp - t) * (tq - t) <= 0 && tp !== tq) {
          const f = (t - tp) / (tq - tp);
          hits.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
        }
      }
      if (hits.length >= 2) {
        const inset = o.inset ?? 1.2;
        const [h0, h1] = hits;
        const L = Math.hypot(h1[0] - h0[0], h1[1] - h0[1]);
        if (L > inset * 2.5) {
          const u = [(h1[0] - h0[0]) / L, (h1[1] - h0[1]) / L];
          this.line([h0[0] + u[0] * inset, h0[1] + u[1] * inset], [h1[0] - u[0] * inset, h1[1] - u[1] * inset], { k: "thin", over: 0.5 });
        }
      }
    }
  }
  /** Surligneur orange : un gros trait translucide, un peu décalé, passé derrière le sujet. */
  marker(pts, o = {}) {
    const pp = pts.map(([x, y]) => [x + (o.dx ?? 1.5), y + (o.dy ?? 1.5)]);
    this.curve(pp, { k: "marker", amp: 0.3, noOver: true });
  }
  /** Trait de construction : fin et pâle, comme les repères d'un dessin technique. */
  guide(a, b) {
    this.line(a, b, { k: "guide", over: 0.5 });
  }
  /** Petite croix de repérage (le « x » du carnet). */
  cross(x, y, r = 1.8) {
    this.line([x - r, y - r], [x + r, y + r], { k: "guide", over: 0 });
    this.line([x - r, y + r], [x + r, y - r], { k: "guide", over: 0 });
  }
  /** Le cadre de construction d'un sujet : deux horizontales et deux verticales qui dépassent, une croix à chaque coin. */
  frame(x, y, w, h, o = {}) {
    const pad = o.pad ?? 5;
    const [lo, hi] = [o.min ?? 2, o.max ?? this.w - 2];
    const [loY, hiY] = [o.minY ?? 2, o.maxY ?? this.h - 2];
    const x0 = Math.max(lo, x - pad);
    const x1 = Math.min(hi, x + w + pad);
    const y0 = Math.max(loY, y - pad);
    const y1 = Math.min(hiY, y + h + pad);
    this.guide([x0, y], [x1, y]);
    this.guide([x0, y + h], [x1, y + h]);
    this.guide([x, y0], [x, y1]);
    this.guide([x + w, y0], [x + w, y1]);
    if (o.cross !== false) for (const [cx, cy] of [[x, y], [x + w, y + h]]) this.cross(cx, cy);
  }
  /** Pointillé d'ombre dans un polygone : des points de plus en plus serrés vers un côté (`dir`, en degrés), un seul trait pour tout le semis. */
  stipple(poly, n, o = {}) {
    const P = poly.map((p) => this.P(p));
    const xs = P.map((p) => p[0]);
    const ys = P.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const a = rad(o.dir ?? 45);
    const [dx, dy] = [Math.cos(a), Math.sin(a)];
    const proj = P.map(([x, y]) => x * dx + y * dy);
    const [pl, ph] = [Math.min(...proj), Math.max(...proj)];
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i];
        const [xj, yj] = P[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const pts = [];
    for (let tries = 0; pts.length < n && tries < n * 60; tries++) {
      const x = x0 + this.rand() * (x1 - x0);
      const y = y0 + this.rand() * (y1 - y0);
      if (!inside(x, y)) continue;
      const t = (x * dx + y * dy - pl) / (ph - pl || 1);
      if (this.rand() < Math.pow(t, o.power ?? 1.2)) pts.push([x, y]);
    }
    if (!pts.length) return;
    pts.sort((p, q) => p[0] * dx + p[1] * dy - (q[0] * dx + q[1] * dy));
    let [cx, cy] = [r1(pts[0][0]) + 0.4, r1(pts[0][1])];
    let d = `M${num(pts[0][0])} ${num(pts[0][1])}h.4`;
    for (const [x, y] of pts.slice(1)) {
      const [rx, ry] = [r1(x), r1(y)];
      d += `m${num(rx - cx)} ${num(ry - cy)}h.4`;
      [cx, cy] = [rx + 0.4, ry];
    }
    this.push(d, "dot", this.base * 0.6 * (o.size ?? 1));
  }
  /** Poly convexe d'un rectangle ou d'une ellipse, pour hachurer. */
  static box(x, y, w, h) {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  static oval(cx, cy, rx, ry, n = 16) {
    return Array.from({ length: n }, (_, i) => [cx + Math.cos(rad((360 * i) / n)) * rx, cy + Math.sin(rad((360 * i) / n)) * ry]);
  }
}

/** Une pelote de fil : un gribouillis dense aux boucles qui se croisent (le « problème » avant qu'on le démêle). */
const yarn = (cx, cy, R, phase = 0) => {
  const pts = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 6.2 + phase;
    const g = 0.86 + 0.14 * Math.sin(t * 0.7);
    pts.push([cx + R * g * (0.78 * Math.cos(t) + 0.34 * Math.cos(2.9 * t + 1.1)), cy + R * g * 0.9 * (0.78 * Math.sin(1.15 * t) + 0.34 * Math.sin(2.6 * t + 0.4))]);
  }
  return pts;
};

const out = {};
const draw = (name, w, h, seed, fn, base = 2.3) => {
  const pad = new Pad(w, h, seed, base);
  fn(pad);
  out[name] = { box: `0 0 ${w} ${h}`, strokes: pad.strokes };
};

// ---------- petites icônes (64 × 64) ----------
// Chaque icône : repères de construction (traits pâles, croix), contour net repassé, ombre en pointillé, une touche de surligneur orange.

const brickWall = (c) => {
  c.frame(6, 12, 48, 44, { pad: 5 });
  c.marker([[16, 18], [38, 14]], { dx: 2, dy: 3 });
  for (const [x, y] of [[6, 44], [30, 44]]) c.rect(x, y, 24, 12, { double: true });
  c.rect(18, 32, 24, 12, { double: true });
  c.stipple(Pad.box(30, 44, 24, 12), 46, { dir: 0 });
  c.stipple(Pad.box(18, 32, 24, 12), 46, { dir: 0 });
  c.poly([[14, 17], [38, 13], [40, 24], [16, 28]], { k: "accent", double: true });
  c.line([8, 12], [8, 21], { k: "accent" });
  c.line([44, 10], [50, 6], { k: "accent" });
  c.line([46, 16], [53, 14], { k: "accent" });
};

draw("bricks", 64, 64, 11, brickWall);

draw("window", 64, 64, 12, (c) => {
  c.frame(7, 10, 50, 42);
  c.marker([[12, 33], [28, 33], [28, 44]], { dx: 2, dy: 2 });
  c.rect(7, 10, 50, 42, { double: true });
  c.line([7, 21], [57, 21]);
  for (const x of [13, 19, 25]) c.ellipse(x, 15.5, 1.3, 1.3, { k: x === 13 ? "accent" : "ink" });
  c.rect(13, 27, 17, 17);
  c.stipple(Pad.box(13, 27, 17, 17), 60, { dir: 45 });
  c.line([35, 29], [50, 29]);
  c.line([35, 35], [46, 35]);
  c.line([35, 41], [50, 41]);
  c.poly([[43, 40], [43, 55], [47, 51], [51, 58], [54, 56.5], [50, 50], [56, 49]], { k: "accent" });
});

draw("cog", 64, 64, 13, (c) => {
  const [cx, cy] = [32, 32];
  c.ellipse(cx, cy, 27, 27, { k: "guide" });
  c.guide([2, cy], [62, cy]);
  c.guide([cx, 2], [cx, 62]);
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = i * 45;
    for (const [da, r] of [[-15, 17], [-10, 24], [10, 24], [15, 17]]) pts.push([cx + Math.cos(rad(a + da)) * r, cy + Math.sin(rad(a + da)) * r]);
  }
  c.marker([[28, 32], [36, 32]], { dx: 0, dy: 1 });
  c.poly(pts);
  c.ellipse(cx, cy, 8, 8, { double: true });
  c.ellipse(cx, cy, 2.6, 2.6, { k: "accent" });
  c.stipple(Pad.oval(cx, cy, 16, 16, 14), 90, { dir: 40, power: 1.6 });
});

draw("database", 64, 64, 14, (c) => {
  c.frame(12, 8, 40, 46);
  c.marker([[14, 31], [32, 36], [50, 31]], { dx: 0, dy: 2 });
  c.ellipse(32, 15, 20, 7, { double: true });
  c.line([12, 15], [12, 47]);
  c.line([52, 15], [52, 47]);
  c.ellipse(32, 47, 20, 7, { from: 0, to: 180 });
  c.ellipse(32, 31, 20, 7, { from: 0, to: 180, k: "accent" });
  c.stipple(Pad.box(12, 17, 12, 30), 70, { dir: 180, power: 1.1 });
  c.stipple(Pad.box(44, 17, 8, 30), 40, { dir: 0, power: 1.1 });
});

const bubble = (c, x, y, w, h, tail, o = {}) => {
  const r = Math.min(8, h / 3);
  c.line([x + r, y], [x + w - r, y], o);
  c.line([x + w, y + r], [x + w, y + h - r], o);
  c.line([x + w - r, y + h], [x + tail[2] + 6, y + h], o);
  c.line([x + tail[0], y + h], [x + r, y + h], o);
  c.line([x, y + h - r], [x, y + r], o);
  c.ellipse(x + w - r, y + r, r, r, { from: -90, to: 0, ...o });
  c.ellipse(x + w - r, y + h - r, r, r, { from: 0, to: 90, ...o });
  c.ellipse(x + r, y + h - r, r, r, { from: 90, to: 180, ...o });
  c.ellipse(x + r, y + r, r, r, { from: 180, to: 270, ...o });
  c.poly([[x + tail[0], y + h], [x + tail[1], y + h + 11], [x + tail[2] + 6, y + h]], { closed: false, ...o });
};

draw("chat", 64, 64, 15, (c) => {
  c.frame(6, 10, 42, 30);
  c.marker([[14, 23], [40, 23]], { dx: 1, dy: 3 });
  bubble(c, 6, 10, 42, 30, [14, 11, 18]);
  c.curve([[13, 20], [20, 18], [27, 21], [36, 19], [41, 20]]);
  c.curve([[13, 28], [19, 26.5], [27, 29], [31, 27.5]]);
  c.stipple([[30, 30], [46, 30], [46, 39], [30, 39]], 36, { dir: 20 });
  c.line([54, 4], [54, 16], { k: "accent" });
  c.line([48, 10], [60, 10], { k: "accent" });
  c.line([50, 6], [58, 14], { k: "accent", over: 0 });
});

draw("cloud", 64, 64, 16, (c) => {
  c.frame(9, 15, 47, 31);
  c.marker([[16, 44], [48, 44]], { dx: 1, dy: 3 });
  c.curve([[16, 45], [9, 40], [11, 32], [19, 29], [21, 21], [29, 15], [38, 17], [42, 24], [49, 25], [55, 32], [52, 41], [47, 45]], { double: true });
  c.line([16, 45], [47, 45]);
  c.stipple([[12, 33], [24, 28], [34, 45], [14, 45]], 50, { dir: 100, power: 1.4 });
  c.arrow([32, 58], [32, 35], { k: "accent" });
  c.line([22, 52], [26, 52], { k: "thin" });
  c.line([38, 54], [43, 54], { k: "thin" });
});

draw("shield", 64, 64, 17, (c) => {
  c.frame(12, 5, 40, 54);
  c.marker([[25, 36], [39, 36]], { dx: 0, dy: 2 });
  c.curve([[32, 5], [42, 9], [52, 12]]);
  c.curve([[32, 5], [22, 9], [12, 12]]);
  c.line([52, 12], [52, 30]);
  c.line([12, 12], [12, 30]);
  c.curve([[52, 30], [50, 42], [42, 52], [32, 59]], { double: true });
  c.curve([[12, 30], [14, 42], [22, 52], [32, 59]], { double: true });
  c.stipple([[32, 8], [50, 14], [50, 30], [48, 40], [32, 55]], 120, { dir: 20, power: 1.3 });
  c.rect(24, 31, 16, 13, { k: "accent" });
  c.ellipse(32, 31, 5, 6, { from: 180, to: 360, k: "accent" });
  c.ellipse(32, 37.5, 1.2, 1.2, { k: "accent" });
});

draw("magnifier", 64, 64, 18, (c) => {
  c.frame(11, 11, 30, 30);
  c.ellipse(26, 26, 21, 21, { k: "guide" });
  c.marker([[18, 26], [26, 22], [33, 28], [24, 33]], { dx: 0, dy: 1 });
  c.ellipse(26, 26, 15, 15, { double: true });
  c.curve([[18, 22], [21, 17.5], [26, 16.5]], { k: "thin" });
  c.line([37, 37], [55, 55]);
  c.line([39.5, 34.5], [57.5, 52.5]);
  c.line([53, 57], [59, 51], { k: "accent" });
  c.stipple(Pad.oval(26, 26, 11, 11, 12), 70, { dir: 50, power: 1.6 });
});

draw("loop", 64, 64, 19, (c) => {
  c.ellipse(32, 32, 27, 27, { k: "guide" });
  c.guide([2, 32], [62, 32]);
  c.guide([32, 2], [32, 62]);
  c.marker([[22, 32], [42, 32]], { dx: 0, dy: 1 });
  c.ellipse(32, 32, 20, 20, { from: 195, to: 345 });
  c.arrowHead([50.3, 24.5], [48.5, 18.6]);
  c.ellipse(32, 32, 20, 20, { from: 15, to: 165, k: "accent" });
  c.arrowHead([13.7, 39.5], [15.5, 45.4], { k: "accent" });
  c.line([28, 30], [36, 30], { k: "thin" });
  c.line([26, 34], [38, 34], { k: "thin" });
  c.cross(10, 10);
  c.cross(54, 54);
});

draw("wrench", 64, 64, 20, (c) => {
  const hc = [44, 20];
  c.ellipse(hc[0], hc[1], 17, 17, { k: "guide" });
  c.guide([6, 58], [60, 4]);
  c.marker([[16, 48], [34, 30]], { dx: 3, dy: 2 });
  c.ellipse(hc[0], hc[1], 12, 12, { from: -20, to: 290 + 360 - 360 + 0.001 });
  c.line([hc[0] + Math.cos(rad(290)) * 12, hc[1] + Math.sin(rad(290)) * 12], [hc[0] + Math.cos(rad(290)) * 5, hc[1] + Math.sin(rad(290)) * 5]);
  c.line([hc[0] + Math.cos(rad(340)) * 12, hc[1] + Math.sin(rad(340)) * 12], [hc[0] + Math.cos(rad(340)) * 5, hc[1] + Math.sin(rad(340)) * 5]);
  c.line([36.5, 28.5], [14.5, 50.5]);
  c.line([42, 33], [20, 55]);
  c.ellipse(15, 55, 4.5, 4.5, { from: 95, to: 245 });
  c.ellipse(17, 53, 1.4, 1.4, { k: "accent" });
  c.stipple([[38, 30], [41, 33], [21, 53], [18, 50]], 40, { dir: 135 });
  c.stipple(Pad.oval(hc[0], hc[1], 11, 11, 12), 40, { dir: 135, power: 1.8 });
});

draw("question", 64, 64, 21, (c) => {
  c.frame(19, 7, 25, 46);
  c.marker([[22, 22], [30, 12], [42, 16]], { dx: 0, dy: 2 });
  c.curve([[19, 21], [22, 11], [32, 7], [42, 11], [44, 21], [39, 29], [33, 34], [32, 41]], { double: true });
  c.ellipse(32, 51, 2.8, 2.8, { k: "accent" });
  c.stipple([[32, 8], [43, 12], [44, 22], [38, 30]], 36, { dir: 20 });
  c.line([8, 14], [14, 19], { k: "thin" });
  c.line([55, 12], [49, 17], { k: "thin" });
  c.line([6, 32], [13, 32], { k: "thin" });
  c.line([51, 33], [58, 35], { k: "thin" });
});

draw("flow", 64, 64, 22, (c) => {
  c.frame(5, 7, 54, 50);
  c.marker([[25, 47], [38, 47], [38, 53]], { dx: 0, dy: 2 });
  c.rect(5, 7, 20, 14, { double: true });
  c.rect(39, 7, 20, 14, { double: true });
  c.rect(22, 43, 20, 14, { double: true });
  c.stipple(Pad.box(5, 7, 20, 14), 40, { dir: 45 });
  c.arrow([26, 14], [38, 14], { k: "accent" });
  c.curveArrow([[49, 22], [49, 31], [42, 36], [34, 41]], { k: "accent" });
  c.curve([[27, 51], [30, 54], [37, 47]]);
});

draw("spark", 64, 64, 23, (c) => {
  c.frame(8, 6, 47, 50);
  c.ellipse(31, 31, 26, 26, { k: "guide" });
  c.marker([[22, 32], [32, 30], [42, 32]], { dx: 0, dy: 2 });
  c.poly([[31, 6], [35, 25], [55, 30], [35, 35], [31, 56], [27, 35], [8, 30], [27, 25]], { double: true });
  c.stipple([[31, 6], [35, 25], [55, 30], [35, 35], [31, 56]], 90, { dir: 70, power: 1.4 });
  c.line([54, 6], [54, 16], { k: "accent" });
  c.line([49, 11], [59, 11], { k: "accent" });
  c.line([8, 12], [12, 16], { k: "thin" });
  c.line([10, 52], [15, 49], { k: "thin" });
});

draw("rocket", 64, 64, 24, (c) => {
  c.frame(12, 4, 40, 54);
  c.guide([32, 2], [32, 62]);
  c.marker([[30, 20], [34, 28]], { dx: 0, dy: 2 });
  c.curve([[32, 4], [23, 14], [20, 26], [22, 38], [24, 44]], { double: true });
  c.curve([[32, 4], [41, 14], [44, 26], [42, 38], [40, 44]], { double: true });
  c.line([24, 44], [40, 44]);
  c.ellipse(32, 24, 5, 5, { double: true });
  c.poly([[22, 30], [12, 44], [22, 41]], { closed: false });
  c.poly([[42, 30], [52, 44], [42, 41]], { closed: false });
  c.stipple([[34, 10], [42, 24], [41, 40], [34, 42]], 80, { dir: 0, power: 1.3 });
  c.curve([[27, 48], [29, 54], [32, 61], [35, 54], [37, 48]], { k: "accent" });
  c.line([19, 50], [17, 58], { k: "accent", over: 0 });
  c.line([45, 50], [47, 58], { k: "accent", over: 0 });
});

// ---------- grandes scènes ----------

draw("tangle", 200, 120, 31, (c) => {
  c.guide([4, 100], [196, 100]);
  c.guide([4, 20], [196, 20]);
  c.guide([80, 8], [80, 112]);
  c.guide([130, 8], [130, 112]);
  c.cross(80, 20);
  c.cross(130, 100);
  c.curve(yarn(44, 60, 30), { amp: 0.4, noOver: true });
  c.curve(yarn(42, 62, 24, 2), { amp: 0.4, noOver: true, k: "thin" });
  c.stipple(Pad.oval(44, 60, 26, 24, 14), 140, { dir: 30, power: 2, size: 0.8 });
  c.marker([[84, 62], [112, 58]], { dx: 0, dy: 4 });
  c.curveArrow([[80, 62], [92, 58], [105, 62], [118, 59]], { k: "accent" });
  c.marker([[140, 58], [168, 62]], { dx: 2, dy: 6 });
  c.ellipse(156, 60, 25, 25, { double: true });
  c.ellipse(156, 60, 33, 33, { k: "guide" });
  c.stipple(Pad.oval(156, 60, 23, 23, 16), 120, { dir: 40, power: 2, size: 0.8 });
  c.curve([[145, 61], [152, 70], [168, 50]], { k: "accent" });
  c.line([186, 22], [186, 34], { k: "thin" });
  c.line([180, 28], [192, 28], { k: "thin" });
}, 2.4);

draw("funnel", 200, 150, 32, (c) => {
  c.frame(28, 36, 144, 94, { pad: 12 });
  c.guide([100, 2], [100, 148]);
  c.ellipse(100, 36, 72, 10, { double: true });
  c.marker([[48, 50], [100, 84]], { dx: 6, dy: 0 });
  c.line([28, 38], [87, 100], { double: true });
  c.line([172, 38], [113, 100], { double: true });
  c.line([87, 100], [87, 124]);
  c.line([113, 100], [113, 124]);
  c.curve([[87, 124], [100, 130], [113, 124]]);
  c.stipple([[34, 40], [92, 100], [87, 100], [60, 42]], 170, { dir: 0, power: 1.1 });
  c.stipple([[160, 40], [112, 100], [113, 100], [140, 42]], 90, { dir: 180, power: 1.6, size: 0.8 });
  c.curve([[30, 6], [38, 0], [44, 8], [52, 2], [58, 10]], { k: "thin" });
  c.poly([[72, 6], [84, 2], [80, 14]]);
  c.ellipse(108, 10, 7, 7);
  c.rect(128, 3, 12, 11);
  c.poly([[152, 12], [160, 2], [166, 14], [158, 18]]);
  c.line([96, 20], [98, 28], { k: "thin" });
  c.line([60, 20], [63, 28], { k: "thin" });
  c.line([140, 20], [138, 28], { k: "thin" });
  c.ellipse(100, 143, 6, 6, { k: "accent" });
  c.line([100, 130], [100, 135], { k: "accent", over: 0 });
}, 2.4);

draw("bricks-lg", 180, 140, 33, (c) => {
  c.place(2.4, 12, 0);
  brickWall(c);
}, 2.3);

draw("talk", 260, 150, 34, (c) => {
  c.guide([4, 92], [150, 92]);
  c.guide([110, 134], [256, 134]);
  c.cross(6, 92);
  c.cross(256, 134);
  c.marker([[40, 54], [92, 50]], { dx: 0, dy: 6 });
  bubble(c, 6, 14, 118, 74, [22, 14, 30]);
  c.curve(yarn(54, 52, 22), { amp: 0.35, noOver: true });
  c.stipple(Pad.oval(54, 52, 20, 18, 14), 90, { dir: 30, power: 2, size: 0.8 });
  c.curve([[88, 40], [90, 32], [98, 30], [104, 35], [102, 43], [96, 47], [96, 53]], { k: "thin" });
  c.ellipse(96, 61, 1.5, 1.5, { k: "thin" });
  c.marker([[176, 58], [206, 52]], { dx: 0, dy: 5 });
  bubble(c, 138, 56, 118, 74, [86, 98, 78]);
  c.ellipse(197, 84, 15, 15, { double: true, from: 150, to: 30 + 360 });
  c.ellipse(197, 84, 21, 21, { k: "guide" });
  c.stipple(Pad.oval(197, 84, 13, 13, 12), 70, { dir: 20, power: 1.8, size: 0.8 });
  c.line([188, 96], [188, 106]);
  c.line([206, 96], [206, 106]);
  c.line([187, 100], [207, 100], { k: "thin" });
  c.line([190, 106], [204, 106]);
  c.line([192, 111], [202, 111]);
  c.curve([[191, 98], [195, 88], [197, 92], [199, 88], [203, 98]], { k: "accent" });
  c.line([197, 58], [197, 49], { k: "accent", over: 0 });
  c.line([176, 66], [170, 59], { k: "accent", over: 0 });
  c.line([218, 66], [224, 59], { k: "accent", over: 0 });
  c.line([166, 84], [158, 84], { k: "accent", over: 0 });
  c.line([228, 84], [236, 84], { k: "accent", over: 0 });
  for (const x of [152, 160, 168]) c.ellipse(x, 124, 1.3, 1.3, { k: "thin" });
}, 2.3);

const ts = `/* Généré par scripts/build-sketches.mjs (npm run build:sketches) : ne pas modifier à la main. Croquis « de carnet » de la page publique. */
export type SketchKind = "ink" | "thin" | "accent" | "marker" | "guide" | "dot";
export type SketchStroke = { d: string; k: SketchKind; w: number };
export type SketchDrawing = { box: string; strokes: SketchStroke[] };

export const SKETCH_DATA = ${JSON.stringify(out)} as const satisfies Record<string, SketchDrawing>;
`;
writeFileSync(process.env.SKETCH_OUT ?? "components/sketch-data.ts", ts);
console.log(Object.entries(out).map(([n, d]) => `${n}: ${d.strokes.length} traits`).join("\n"));
