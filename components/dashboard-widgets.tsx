import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DEADLINE_CATEGORY_LABELS, type DeadlineCategory } from "@/lib/domain/deadlines";
import { monthGrid } from "@/lib/domain/cockpit/overview";
import { formatCents } from "@/lib/domain/quotes";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Éléments visuels du tableau de bord du cockpit. Aucune couleur écrite ici : uniquement les jetons (accents `tone-*`, `primary`, `muted`),
 * donc les deux thèmes. L'information n'est jamais portée par la couleur seule : chaque graphique a son texte, et un tableau pour les lecteurs d'écran.
 */

type Tone = "teal" | "violet" | "orange" | "pink" | "yellow";
const TONES: Tone[] = ["teal", "violet", "pink", "orange"];
const toneVar = (t: Tone) => `hsl(var(--tone-${t}))`;
/** Couleur d'un segment : le dégradé néon teal → violet → rose → orange se lit le long de la jauge. */
/** Couleur d'alerte d'une barre : seuil = avertissement, atteint ou dépassé = destructif (en plus du texte et de l'icône, jamais seul). */
const ALERT: Record<string, string> = { threshold: "hsl(var(--warning))", reached: "hsl(var(--destructive))", exceeded: "hsl(var(--destructive))" };
const along = (i: number, n: number) => toneVar(TONES[Math.min(TONES.length - 1, Math.floor((i / n) * TONES.length))]);

const BORDER: Record<Tone, string> = { teal: "border-tone-teal", violet: "border-tone-violet", orange: "border-tone-orange", pink: "border-tone-pink", yellow: "border-tone-yellow" };
const BUBBLE: Record<Tone, string> = { teal: "bg-tone-teal", violet: "bg-tone-violet", orange: "bg-tone-orange", pink: "bg-tone-pink", yellow: "bg-tone-yellow" };

/** Tuile-bulle d'un chiffre-clé, compacte (posée sur le bandeau, fond plein) : pastille colorée, chiffre, intitulé ; la précision est dans l'infobulle et pour les lecteurs d'écran. Toute la tuile est un lien. */
export function KpiTile({ href, icon: Icon, tone, label, value, hint, alert }: { href: string; icon: LucideIcon; tone: Tone; label: string; value: number | string; hint?: string; alert?: string }) {
  return (
    <Link href={href} title={hint} className={cn("group flex min-h-11 items-center gap-2 rounded-lg border bg-card p-2 transition-colors hover:bg-muted dark:border-0", BORDER[tone])}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-action-foreground transition-transform group-hover:scale-110 motion-reduce:transition-none", BUBBLE[tone])}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold tabular-nums leading-none">{value}</span>
          {alert && <span className="text-xs font-semibold text-destructive">{alert}</span>}
        </span>
        <span className="truncate text-xs font-semibold">{label}</span>
        {hint && <span className="sr-only">{hint}</span>}
      </span>
    </Link>
  );
}

/** Anneau segmenté (40 traits) : les traits atteints s'allument en dégradé néon. Le pourcentage et `label` sont écrits au centre et pour les lecteurs d'écran. */
export function SegmentedRing({ percent, label, caption, size = 132, ticks = 40 }: { percent: number; label: string; caption?: string; size?: number; ticks?: number }) {
  const shown = Math.max(0, Math.min(percent, 100));
  const lit = shown > 0 ? Math.max(1, Math.round((shown / 100) * ticks)) : 0;
  const c = size / 2;
  const outer = c - 4;
  const inner = outer - 11;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label} : ${percent} %`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={c + inner * Math.cos(a)}
              y1={c + inner * Math.sin(a)}
              x2={c + outer * Math.cos(a)}
              y2={c + outer * Math.sin(a)}
              strokeWidth={3}
              strokeLinecap="round"
              style={{ stroke: i < lit ? along(i, ticks) : "hsl(var(--muted-foreground) / 0.25)" }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={cn("font-mono font-semibold tabular-nums", size < 110 ? "text-lg" : "text-2xl")}>{percent} %</span>
        {caption && <span className="max-w-[70%] text-center text-[11px] leading-tight text-muted-foreground">{caption}</span>}
      </div>
    </div>
  );
}

/** Barre segmentée (« égaliseur ») : autant de segments allumés que de pourcentage atteint, dégradé néon ; le chiffre est écrit à côté. */
export function SegmentedBar({ percent, label, state = "below", segments = 24 }: { percent: number; label: string; state?: "below" | "threshold" | "reached" | "exceeded"; segments?: number }) {
  const shown = Math.max(0, Math.min(percent, 100));
  const lit = shown > 0 ? Math.max(1, Math.round((shown / 100) * segments)) : 0; // au moins un segment dès qu'il y a quelque chose
  const alert = ALERT[state];
  return (
    <div role="progressbar" aria-label={`${label} : ${percent} % du plafond`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown} aria-valuetext={`${percent} % du plafond`} className="flex h-3 w-full gap-[2px]">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className="h-full flex-1 rounded-[2px]" style={{ backgroundColor: i < lit ? (alert ?? along(i, segments)) : "hsl(var(--muted-foreground) / 0.2)" }} />
      ))}
    </div>
  );
}

/** Courbe lissée (Catmull-Rom → Bézier) à travers des points. */
function smooth(pts: { x: number; y: number }[], lo: number, hi: number): string {
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v)); // le lissage ne doit jamais sortir du graphique (sous la ligne de base)
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${clamp(p1.y + (p2.y - p0.y) / 6)} ${p2.x - (p3.x - p1.x) / 6},${clamp(p2.y - (p3.y - p1.y) / 6)} ${p2.x},${p2.y}`;
  }
  return d;
}

/** CA encaissé par mois (hors taxe) : courbe en aire jusqu'au mois en cours, point repère sur le mois en cours, tableau pour les lecteurs d'écran. */
export function RevenueChart({ months, currentMonth, year }: { months: { month: number; label: string; cents: number }[]; currentMonth: number; year: number }) {
  const W = 600;
  const H = 150;
  const padX = 24;
  const top = 18;
  const bottom = 34;
  const max = Math.max(1, ...months.slice(0, currentMonth).map((m) => m.cents));
  const x = (i: number) => padX + (i * (W - padX * 2)) / 11;
  const y = (cents: number) => top + (1 - cents / max) * (H - top - bottom);
  const pts = months.slice(0, currentMonth).map((m, i) => ({ x: x(i), y: y(m.cents) }));
  const line = smooth(pts, top, H - bottom);
  const area = pts.length ? `${line} L${pts.at(-1)!.x},${H - bottom} L${pts[0].x},${H - bottom} Z` : "";
  const cur = pts.at(-1);
  return (
    <figure className="flex flex-col">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="rev-line" gradientUnits="userSpaceOnUse" x1={padX} x2={W - padX} y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: toneVar("teal") }} />
            <stop offset="55%" style={{ stopColor: toneVar("violet") }} />
            <stop offset="100%" style={{ stopColor: toneVar("pink") }} />
          </linearGradient>
          <linearGradient id="rev-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: toneVar("violet"), stopOpacity: 0.45 }} />
            <stop offset="100%" style={{ stopColor: toneVar("violet"), stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => {
          const gy = top + (g * (H - top - bottom)) / 3;
          return <line key={g} x1={padX} x2={W - padX} y1={gy} y2={gy} strokeWidth={1} style={{ stroke: "hsl(var(--muted-foreground) / 0.2)" }} />;
        })}
        {area && <path d={area} fill="url(#rev-area)" />}
        {line && <path d={line} fill="none" strokeWidth={3} strokeLinecap="round" stroke="url(#rev-line)" />}
        {months.map((m, i) => (i % 2 === 0 ? (
          <text key={m.month} x={x(i)} y={H - 10} textAnchor="middle" fontSize={18} style={{ fill: "hsl(var(--muted-foreground))" }}>
            {m.label}
          </text>
        ) : null))}
        {pts.map((p, i) => (months[i].cents > 0 && i !== currentMonth - 1 ? <circle key={i} cx={p.x} cy={p.y} r={3} style={{ fill: toneVar("violet") }} /> : null))}
        {cur && (
          <>
            <line x1={cur.x} x2={cur.x} y1={cur.y} y2={H - bottom} strokeWidth={2} strokeDasharray="3 3" style={{ stroke: toneVar("orange") }} />
            <circle cx={cur.x} cy={cur.y} r={6} strokeWidth={3} style={{ fill: "hsl(var(--background))", stroke: toneVar("orange") }} />
          </>
        )}
      </svg>
      <figcaption className="sr-only">Encaissements hors taxe par mois, {year}. Le repère orange est le mois en cours.</figcaption>
      <table className="sr-only">
        <caption>CA encaissé par mois en {year}</caption>
        <tbody>
          {months.slice(0, currentMonth).map((mo) => (
            <tr key={mo.month}>
              <th scope="row">{mo.label}</th>
              <td>{formatCents(mo.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Calendrier du mois : le jour présent est plein, un jour avec échéance porte un point (et le dit pour les lecteurs d'écran). */
export function MiniCalendar({ asOf, deadlineDays }: { asOf: string; deadlineDays: Map<number, number> }) {
  const grid = monthGrid(asOf);
  const today = Number(asOf.slice(8, 10));
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold capitalize">{grid.label}</p>
      <table className="w-full table-fixed text-center text-sm">
        <thead>
          <tr>
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <th key={i} scope="col" className="text-xs font-medium text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                const n = day ? (deadlineDays.get(day) ?? 0) : 0;
                return (
                  <td key={di} className="p-px">
                    {day && (
                      <span
                        className={cn("relative mx-auto flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums", day === today ? "bg-tone-orange font-semibold text-action-foreground" : "")}
                        aria-current={day === today ? "date" : undefined}
                      >
                        {day}
                        {n > 0 && (
                          <>
                            <span aria-hidden="true" className="absolute bottom-0.5 size-1 rounded-full bg-tone-pink" />
                            <span className="sr-only"> : {n} échéance{n > 1 ? "s" : ""}</span>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Prochaines échéances : date, intitulé, catégorie, et le délai en puce (« aujourd'hui », « J-3 »). */
export function UpcomingDeadlines({ items }: { items: { id: string; title: string; due_on: string; category: DeadlineCategory; days: number }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Aucune échéance à venir.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((d) => (
        <li key={d.id}>
          <Link href="/calendrier" className="flex min-h-11 flex-col gap-0.5 rounded-md border px-2 py-1 hover:bg-accent/40">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono font-semibold tabular-nums text-action-foreground", d.days <= 3 ? "bg-tone-orange" : "bg-tone-violet")}>{d.days === 0 ? "Auj." : `J-${d.days}`}</span>
              <span className="truncate">{formatDate(d.due_on)}</span>
            </span>
            <span className="truncate text-sm font-semibold" title={`${d.title} · ${DEADLINE_CATEGORY_LABELS[d.category]}`}>{d.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Carte de section du tableau de bord : titre, contenu, et un lien facultatif en haut à droite. */
export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
