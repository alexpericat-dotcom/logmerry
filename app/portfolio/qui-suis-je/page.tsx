import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/logo-mark";
import { LiquidButton } from "@/components/portfolio-sections";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ABOUT } from "@/lib/portfolio-about";
import { BRAND } from "@/lib/portfolio-content";

const TITLE = `${ABOUT.eyebrow} · ${BRAND}`;
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: "Mon parcours et ma façon de travailler.",
  alternates: { canonical: "/portfolio/qui-suis-je" },
  robots: { index: true, follow: true },
};

/** Étiquette en monospace, comme sur la page principale. */
const MONO = "font-mono text-phi-n1 uppercase tracking-[0.18em]";
export default function AboutPage() {
  const { photo } = ABOUT;
  return (
    <div className="folio min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:px-6">
          <Link href="/portfolio" className="flex items-center gap-2 font-brand text-phi-1 font-bold" aria-label={`${BRAND}, ${ABOUT.back.toLowerCase()}`}>
            <LogoMark variant="classic" className="size-7" />
            <span className="max-sm:sr-only">{BRAND}</span>
          </Link>
          <ThemeSwitcher className="rounded-md px-3 md:h-9" iconClassName="text-current" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-phi-3 md:px-6 md:py-phi-4">
        <div className="grid gap-phi-3 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
          <article className="max-w-3xl">
            <p className={`${MONO} text-muted-foreground`}>{ABOUT.eyebrow}</p>
            <h1 className="mt-3 break-words text-phi-5 md:text-phi-6">{ABOUT.title}</h1>
            <div className="mt-phi-2 space-y-phi-1 text-phi-1">
              {ABOUT.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>{ABOUT.sport}</p>
              <p>{ABOUT.impact}</p>
            </div>
          </article>
          <figure className="max-w-xs md:max-w-none">
            <Image src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} sizes="(min-width: 768px) 256px, 320px" priority className="h-auto w-full rounded-md" />
          </figure>
        </div>

        <section aria-labelledby="parcours" className="mt-phi-3 max-w-3xl">
          <h2 id="parcours" className="text-phi-3 md:text-phi-4">
            {ABOUT.pathTitle}
          </h2>
          <p className={`${MONO} mt-2 text-muted-foreground`}>{ABOUT.pathNote}</p>
          <ol className="mt-phi-1 border-l-2 border-foreground/30">
            {ABOUT.path.map((step) => (
              <li key={step.period} className="relative pb-phi-1 pl-6 last:pb-0">
                <span aria-hidden="true" className="absolute -left-[7px] top-2 size-3 rounded-full border-2 border-foreground bg-background" />
                <p className={`${MONO} text-muted-foreground`}>{step.period}</p>
                <p className="mt-1 text-phi-1">{step.role}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-phi-3">
          <LiquidButton href={ABOUT.cta.href} tone="orange" size="lg">
            {ABOUT.cta.label}
          </LiquidButton>
        </div>
      </main>
    </div>
  );
}
