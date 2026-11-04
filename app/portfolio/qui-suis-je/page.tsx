import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/logo-mark";
import { LiquidButton } from "@/components/portfolio-sections";
import { ScrollEffects } from "@/components/scroll-effects";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ABOUT } from "@/lib/portfolio-about";
import { BRAND } from "@/lib/portfolio-content";

const TITLE = `Qui suis-je · ${BRAND}`;
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: "Mon parcours et ma façon de travailler.",
  alternates: { canonical: "/portfolio/qui-suis-je" },
  robots: { index: true, follow: true },
};

/** Étiquette en monospace, comme sur la page principale. */
const MONO = "font-mono text-phi-n1 uppercase tracking-[0.18em]";
/** Grain léger sur la photo : bruit SVG en surimpression, sans fichier ni couleur ajoutés. */
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Une mention de section : « 02 — Introduction ». Le numéro est décoratif pour les lecteurs d'écran. */
function SectionLabel({ n, children }: { n: string; children: string }) {
  return (
    <h2 className={`${MONO} !font-mono text-muted-foreground`}>
      <span aria-hidden="true">{n} — </span>
      {children}
    </h2>
  );
}

export default function AboutPage() {
  const { photo } = ABOUT;
  return (
    <div className="folio min-h-screen bg-background text-foreground">
      <ScrollEffects />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Aller au contenu
      </a>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:px-6">
          <Link href="/portfolio" className="flex items-center gap-2 font-brand text-phi-1 font-bold" aria-label={`${BRAND}, ${ABOUT.back.toLowerCase()}`}>
            <LogoMark variant="classic" className="size-7" />
            <span className="max-sm:sr-only">{BRAND}</span>
          </Link>
          <ThemeSwitcher className="rounded-md px-3 md:h-9" iconClassName="text-current" />
        </div>
      </header>

      <main id="contenu" tabIndex={-1} className="mx-auto max-w-6xl px-4 outline-none md:px-6">
        {/* 01 : ouverture */}
        <section aria-labelledby="titre" className="pb-phi-3 pt-phi-3 md:pt-phi-4">
          <p className={`${MONO} reveal text-muted-foreground`}>
            <span aria-hidden="true">01 — </span>
            Qui suis-je
          </p>
          <h1 id="titre" className="reveal mt-phi-1 break-words text-[clamp(3rem,13vw,9.5rem)] leading-[0.95]">
            Je viens du terrain.
          </h1>
          <ul className={`${MONO} mt-phi-2 flex flex-wrap gap-x-8 gap-y-2 border-y py-4 text-foreground`}>
            {ABOUT.facts.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-tone-orange" />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* 02 : introduction, photo collante à gauche */}
        <section aria-labelledby="intro" className="grid gap-phi-2 border-t py-phi-3 md:py-phi-4 lg:grid-cols-12 lg:gap-phi-3">
          <div className="lg:col-span-4">
            <figure className="lg:sticky lg:top-8">
              <div className="relative overflow-hidden rounded-sm border">
                <Image
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  sizes="(min-width: 1024px) 400px, 100vw"
                  priority
                  unoptimized
                  className="aspect-[4/3] h-auto w-full object-cover object-[50%_40%] lg:aspect-[4/5]"
                />
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
              </div>
            </figure>
          </div>
          <div className="lg:col-span-8">
            <div className="reveal" id="intro">
              <SectionLabel n="02">{ABOUT.sections.intro}</SectionLabel>
            </div>
            <div className="mt-phi-1 max-w-2xl space-y-phi-1 text-phi-1">
              <p className="reveal font-serif text-phi-3 leading-snug md:text-phi-4">{ABOUT.intro[0]}</p>
              {ABOUT.intro.slice(1).map((p, i) => (
                <p key={p} style={{ "--i": i } as React.CSSProperties} className="reveal text-muted-foreground">
                  {p}
                </p>
              ))}
              <blockquote className="reveal-right my-phi-2 border-l-4 border-tone-orange pl-6 font-serif text-phi-3 md:text-phi-4">{ABOUT.quote}</blockquote>
              <p className="reveal">{ABOUT.sport}</p>
            </div>
          </div>
        </section>

        {/* 03 : sobriété */}
        <section aria-labelledby="sobriete" className="grid gap-phi-1 border-t py-phi-3 md:py-phi-4 lg:grid-cols-12 lg:gap-phi-3">
          <div id="sobriete" className="reveal lg:col-span-4">
            <SectionLabel n="03">{ABOUT.sections.impact}</SectionLabel>
          </div>
          <p className="reveal max-w-2xl font-serif text-phi-2 leading-snug md:text-phi-3 lg:col-span-8">{ABOUT.impact}</p>
        </section>

        {/* 04 : parcours */}
        <section aria-labelledby="parcours" className="grid gap-phi-2 border-t py-phi-3 md:py-phi-4 lg:grid-cols-12 lg:gap-phi-3">
          <div id="parcours" className="reveal lg:col-span-4">
            <SectionLabel n="04">{ABOUT.sections.path}</SectionLabel>
            <p className={`${MONO} mt-2 text-muted-foreground`}>{ABOUT.pathNote}</p>
          </div>
          <ol className="relative max-w-2xl lg:col-span-8">
            <span aria-hidden="true" className="spine absolute left-[5px] top-2 h-[calc(100%-1rem)] w-px bg-foreground/40" />
            {ABOUT.path.map((step, i) => {
              const current = !step.to;
              return (
                <li key={step.from.iso + step.role} style={{ "--i": i } as React.CSSProperties} className="reveal group relative pb-phi-2 pl-8 last:pb-0">
                  <span aria-hidden="true" className={`absolute left-0 top-2 size-[11px] rounded-full border-2 border-tone-orange transition-transform duration-300 group-hover:scale-125 motion-reduce:transition-none ${current ? "bg-tone-orange" : "bg-background"}`} />
                  <p className={`${MONO} text-muted-foreground`}>
                    {step.lead && `${step.lead} `}
                    <time dateTime={step.from.iso}>{step.from.text}</time>
                    {step.to && (
                      <>
                        –<time dateTime={step.to.iso}>{step.to.text}</time>
                      </>
                    )}
                  </p>
                  <p className="mt-2 font-serif text-phi-2 md:text-phi-3">{step.role}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Fin */}
        <section aria-labelledby="fin" className="border-t py-phi-4 md:py-phi-5">
          <h2 id="fin" className="reveal break-words text-[clamp(2.25rem,8vw,6rem)] leading-[1]">
            {ABOUT.closing}.
          </h2>
          <div className="reveal mt-phi-2">
            <LiquidButton href={ABOUT.cta.href} tone="orange" size="lg">
              {ABOUT.cta.label}
            </LiquidButton>
          </div>
        </section>
      </main>
    </div>
  );
}
