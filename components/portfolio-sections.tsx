import { BookOpenCheck, Compass, LayoutDashboard, LifeBuoy, MessageSquareText, ShieldCheck, UserRound, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { mailtoHref } from "@/lib/domain/portfolio";
import { BENEFITS, BRAND, CONTACT, CONTACT_EMAIL, CONTACT_SUBJECT, FOOTER, HERO, PROCESS, SERVICES } from "@/lib/portfolio-content";

const contactHref = mailtoHref(CONTACT_EMAIL, CONTACT_SUBJECT);
const SERVICE_ICONS: LucideIcon[] = [Compass, LayoutDashboard, MessageSquareText, LifeBuoy];
const BENEFIT_ICONS: LucideIcon[] = [Zap, ShieldCheck, BookOpenCheck, UserRound];
const TONES = ["bg-[hsl(var(--tone-teal))]", "bg-[hsl(var(--tone-orange))]", "bg-[hsl(var(--tone-violet))]", "bg-[hsl(var(--tone-pink))]"];

/** Titre de section : étiquette pixel, titre, introduction. */
function SectionHead({ id, eyebrow, title, intro }: { id: string; eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="reveal mb-10 max-w-2xl">
      <p className="font-pixel text-sm uppercase tracking-widest text-display dark:font-sans dark:text-xs dark:font-semibold dark:text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-2 break-words text-3xl font-bold leading-tight md:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
    </div>
  );
}

export function PortfolioHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/portfolio" className="flex items-center gap-2 font-brand text-xl font-bold" aria-label={`${BRAND}, haut de page`}>
          <LogoMark className="size-8" />
          {BRAND}
        </Link>
        <nav aria-label="Sections" className="flex items-center gap-1 text-sm">
          {[
            ["#services", "Ce que je fais"],
            ["#methode", "Méthode"],
            ["#realisations", "Réalisations"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="hidden rounded-md px-3 py-2 underline-offset-4 hover:underline md:inline-block">
              {label}
            </a>
          ))}
          <Button asChild size="sm">
            <a href={contactHref}>{HERO.secondary}</a>
          </Button>
        </nav>
      </div>
    </header>
  );
}

/** Décor pixel : formes qui flottent doucement, ignorées des lecteurs d'écran. */
function PixelDecor() {
  const shapes = [
    "left-[6%] top-[18%] size-10 bg-[hsl(var(--tone-teal))]",
    "right-[9%] top-[14%] size-14 bg-[hsl(var(--tone-yellow))]",
    "right-[18%] bottom-[16%] size-8 bg-[hsl(var(--tone-pink))]",
    "left-[14%] bottom-[12%] size-12 bg-[hsl(var(--tone-violet))]",
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {shapes.map((s, i) => (
        <span key={s} style={{ animationDelay: `${i * -1.6}s` }} className={`float-slow absolute rounded-sm border opacity-80 shadow-hard ${s} max-md:hidden`} />
      ))}
    </div>
  );
}

export function PortfolioHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b bg-gradient-sunset bg-[length:var(--banner-size)]">
      <PixelDecor />
      <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center gap-8 px-4 py-20 md:px-6">
        <p className="w-fit rounded-md border bg-background/80 px-3 py-1 font-pixel text-sm uppercase tracking-widest shadow-hard dark:font-sans dark:text-xs dark:font-semibold dark:tracking-wider">{HERO.eyebrow}</p>
        <h1
          id="hero-title"
          className="max-w-4xl break-words font-pixel text-5xl font-bold uppercase leading-[1.05] tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-7xl dark:font-sans dark:normal-case dark:leading-tight dark:tracking-normal dark:text-foreground dark:[text-shadow:none]"
        >
          {HERO.title}
        </h1>
        <p className="max-w-2xl rounded-md bg-background/80 p-3 text-lg leading-relaxed md:text-xl">{HERO.lead}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="#realisations">{HERO.primary}</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-background/80">
            <a href={contactHref}>{HERO.secondary}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PortfolioServices() {
  return (
    <section id="services" aria-labelledby="services-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 md:px-6">
      <SectionHead id="services-title" eyebrow="Offre" title={SERVICES.title} intro={SERVICES.intro} />
      <ul className="grid gap-5 md:grid-cols-2">
        {SERVICES.items.map((s, i) => {
          const Icon = SERVICE_ICONS[i];
          return (
            <li key={s.title} className="reveal lift relative flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-hard">
              <span aria-hidden="true" className="absolute right-4 top-3 font-pixel text-5xl font-bold opacity-15 dark:font-sans">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-md border text-foreground ${TONES[i % TONES.length]} dark:text-background`}>
                <Icon size={22} />
              </span>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="text-muted-foreground">{s.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PortfolioProcess() {
  return (
    <section id="methode" aria-labelledby="process-title" className="scroll-mt-16 border-y bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead id="process-title" eyebrow="Méthode" title={PROCESS.title} intro={PROCESS.intro} />
        <ol className="relative grid gap-6 md:grid-cols-5">
          <span aria-hidden="true" className="absolute left-5 top-5 hidden h-0.5 w-[calc(100%-2.5rem)] bg-[hsl(var(--input))] opacity-40 md:block" />
          {PROCESS.steps.map((s, i) => (
            <li key={s.title} className="reveal relative flex gap-4 md:flex-col md:gap-3">
              <span aria-hidden="true" className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-md border bg-[hsl(var(--tone-orange))] font-pixel text-lg font-bold text-foreground shadow-hard dark:font-sans dark:text-background">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PortfolioBenefits() {
  return (
    <section aria-labelledby="benefits-title" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <SectionHead id="benefits-title" eyebrow="Apports" title={BENEFITS.title} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.items.map((b, i) => {
          const Icon = BENEFIT_ICONS[i];
          return (
            <li key={b.title} className="reveal flex flex-col gap-3 border-t-2 pt-4">
              <Icon aria-hidden="true" size={26} className="text-primary" />
              <h3 className="text-lg font-semibold">{b.title}</h3>
              <p className="text-muted-foreground">{b.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Zone des réalisations : titre fixe, contenu (cartes, message) donné par l'appelant. */
export function PortfolioShowcaseFrame({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section id="realisations" aria-labelledby="showcase-title" className="scroll-mt-16 border-y bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead id="showcase-title" eyebrow="Travaux" title={title} intro={intro} />
        {children}
      </div>
    </section>
  );
}

export function PortfolioContact() {
  return (
    <section aria-labelledby="contact-title" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="reveal relative overflow-hidden rounded-lg border bg-gradient-sunset bg-[length:var(--banner-size)] p-8 shadow-hard md:p-14">
        <div className="relative max-w-2xl rounded-md bg-background/85 p-5">
          <h2 id="contact-title" className="text-3xl font-bold md:text-4xl">
            {CONTACT.title}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">{CONTACT.text}</p>
          <Button asChild size="lg" className="mt-6">
            <a href={contactHref}>{CONTACT.button}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PortfolioFooter() {
  return (
    <footer className="border-t py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 md:px-6">
        <p>{FOOTER}</p>
        <a href={contactHref} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
