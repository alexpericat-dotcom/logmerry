import { ArrowRight, Bot, Cable, Compass, DatabaseZap, LayoutTemplate, LifeBuoy, Lock, Server, ShieldCheck, Target, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";
import { MotionToggle } from "@/components/motion-toggle";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ToolIcon } from "@/components/tool-icon";
import { Button } from "@/components/ui/button";
import { mailtoHref } from "@/lib/domain/portfolio";
import { BRAND, CONTACT, CONTACT_EMAIL, CONTACT_SUBJECT, FOOTER, HERO, LEVER, LOGOS_NOTE, PROCESS, SERVICES, SKILLS, STACK } from "@/lib/portfolio-content";

const contactHref = mailtoHref(CONTACT_EMAIL, CONTACT_SUBJECT);
const SERVICE_ICONS: LucideIcon[] = [Compass, Cable, DatabaseZap, Bot, LifeBuoy];
const TONES = ["bg-[hsl(var(--tone-teal))]", "bg-[hsl(var(--tone-orange))]", "bg-[hsl(var(--tone-violet))]", "bg-[hsl(var(--tone-pink))]", "bg-[hsl(var(--tone-yellow))]"];

/** Titre de section : étiquette pixel, titre, introduction. */
function SectionHead({ id, eyebrow, title, intro }: { id: string; eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="reveal mb-12 max-w-3xl">
      <p className="font-pixel text-sm uppercase tracking-widest text-display dark:font-sans dark:text-xs dark:font-semibold dark:text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-2 break-words text-3xl font-bold leading-tight md:text-5xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg text-muted-foreground md:text-xl">{intro}</p>}
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
            ["#methode", "Méthode"],
            ["#services", "Offre"],
            ["#architecture", "Architecture"],
            ["#realisations", "Réalisations"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="hidden rounded-md px-3 py-2 underline-offset-4 hover:underline md:inline-block">
              {label}
            </a>
          ))}
          <MotionToggle />
          <ThemeSwitcher />
          <Button asChild size="sm">
            <a href={contactHref}>{CONTACT.button}</a>
          </Button>
        </nav>
      </div>
    </header>
  );
}

/** Décor pixel : formes qui flottent doucement, ignorées des lecteurs d'écran. */
function PixelDecor() {
  const shapes = [
    "left-[1.5%] top-[10%] size-10 bg-[hsl(var(--tone-teal))]",
    "right-[1.5%] top-[9%] size-8 bg-[hsl(var(--tone-yellow))]",
    "left-[1.5%] bottom-[9%] size-8 bg-[hsl(var(--tone-pink))]",
    "right-[1.5%] bottom-[8%] size-12 bg-[hsl(var(--tone-violet))]",
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {shapes.map((s, i) => (
        <span key={s} style={{ animationDelay: `${i * -1.6}s` }} className={`float-slow absolute rounded-sm border opacity-80 shadow-hard ${s} max-xl:hidden`} />
      ))}
    </div>
  );
}

/** Schéma animé de la chaîne « problème métier → maintenance » : une pastille lumineuse la parcourt. Décoratif (la méthode est détaillée plus bas). */
function PipelineArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm rounded-lg border bg-card/90 p-5 shadow-hard backdrop-blur">
      <span className="pipe-line absolute bottom-9 left-[2.15rem] top-9 w-0.5 bg-[hsl(var(--input))] opacity-40" />
      <span className="pipe-dot absolute left-[1.8rem] size-3.5 rounded-full bg-[hsl(var(--tone-orange))] shadow-[0_0_14px_hsl(var(--tone-orange))]" />
      <ol className="relative flex flex-col gap-3.5">
        {PROCESS.steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-4">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-md border font-pixel text-base font-bold text-foreground dark:font-sans dark:text-background ${TONES[i % TONES.length]}`}>{i + 1}</span>
            <span className="text-sm font-semibold">{s.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PortfolioHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b bg-gradient-sunset bg-[length:var(--banner-size)]">
      <PixelDecor />
      <div className="relative mx-auto grid min-h-[84vh] max-w-6xl items-center gap-12 px-4 py-20 md:px-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-7">
          <p className="w-fit rounded-md border bg-background/80 px-3 py-1 font-pixel text-sm uppercase tracking-widest shadow-hard dark:font-sans dark:text-xs dark:font-semibold dark:tracking-wider">{HERO.eyebrow}</p>
          <h1
            id="hero-title"
            className="break-words font-pixel text-4xl font-bold uppercase leading-[1.08] tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] sm:text-5xl md:text-6xl dark:font-sans dark:normal-case dark:leading-[1.1] dark:tracking-tight dark:text-foreground dark:[text-shadow:none]"
          >
            {HERO.title}
          </h1>
          <p className="max-w-2xl rounded-md bg-background/80 p-3 text-lg leading-relaxed md:text-xl">{HERO.lead}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#realisations">
                {HERO.primary}
                <ArrowRight size={18} aria-hidden="true" className="ml-2" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-background/80">
              <a href={contactHref}>{HERO.secondary}</a>
            </Button>
          </div>
        </div>
        <PipelineArt />
      </div>
    </section>
  );
}

/** Bandeau d'outils qui défile ; la seconde copie est cachée des lecteurs d'écran, et sans mouvement les outils passent à la ligne. */
export function PortfolioMarquee() {
  const tools = SKILLS.groups.flatMap((g) => g.items);
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className={`flex shrink-0 items-center gap-3 pr-3 ${hidden ? "marquee-dup" : ""}`}>
      {[...tools, SKILLS.more].map((t) => (
        <li key={t} className="flex items-center gap-2 whitespace-nowrap rounded-md border bg-card px-4 py-2 text-sm font-semibold shadow-hard">
          <ToolIcon tool={t} />
          {t}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee overflow-hidden border-b bg-muted/40 py-5">
      {/* Deux moitiés identiques de deux rangées : la boucle (−50 %) reste pleine même sur un très grand écran. Seule la première rangée est lue par les lecteurs d'écran. */}
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}

export function PortfolioLever() {
  return (
    <section aria-labelledby="lever-title" className="mx-auto max-w-6xl px-4 py-24 md:px-6">
      <SectionHead id="lever-title" eyebrow={LEVER.eyebrow} title={LEVER.title} />
      <div className="reveal grid gap-5 lg:grid-cols-2">
        <p className="flex items-center rounded-lg border border-dashed p-6 text-xl text-muted-foreground line-through decoration-[hsl(var(--destructive))] decoration-2 md:text-2xl">{LEVER.before}</p>
        <p className="rounded-lg border bg-[hsl(var(--tone-yellow))] p-6 text-xl font-bold text-[hsl(235_47%_20%)] shadow-hard md:text-2xl">{LEVER.after}</p>
      </div>
      <p className="reveal mt-6 max-w-3xl text-lg text-muted-foreground">{LEVER.note}</p>
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {LEVER.points.map((p, i) => {
          const Icon = [Target, ShieldCheck, DatabaseZap][i] ?? Target;
          return (
            <li key={p.title} className="reveal flex flex-col gap-3 border-t-2 pt-5">
              <Icon aria-hidden="true" size={28} className="text-primary" />
              <h3 className="text-xl font-semibold">{p.title}</h3>
              <p className="text-muted-foreground">{p.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PortfolioProcess() {
  return (
    <section id="methode" aria-labelledby="process-title" className="scroll-mt-16 border-y bg-muted/40 py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead id="process-title" eyebrow={PROCESS.eyebrow} title={PROCESS.title} intro={PROCESS.intro} />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PROCESS.steps.map((s, i) => (
            <li key={s.title} className="reveal lift relative flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-hard">
              <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-md border font-pixel text-xl font-bold text-foreground dark:font-sans dark:text-background ${TONES[i % TONES.length]}`}>
                {i + 1}
              </span>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="text-muted-foreground">{s.text}</p>
              {/* Flèche vers l'étape suivante : seulement sur la grille à trois colonnes, et pas en bout de ligne (étapes 3 et 6). */}
              {(i + 1) % 3 !== 0 && <ArrowRight aria-hidden="true" size={20} className="absolute right-5 top-6 hidden text-muted-foreground lg:block" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PortfolioServices() {
  return (
    <section id="services" aria-labelledby="services-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 md:px-6">
      <SectionHead id="services-title" eyebrow={SERVICES.eyebrow} title={SERVICES.title} intro={SERVICES.intro} />
      <ul className="grid gap-5 md:grid-cols-6">
        {SERVICES.items.map((s, i) => {
          const Icon = SERVICE_ICONS[i];
          // Grille « bento » : deux grandes cartes, puis trois moyennes.
          const span = i < 2 ? "md:col-span-3" : "md:col-span-2";
          return (
            <li key={s.title} className={`reveal lift relative flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-6 shadow-hard ${span}`}>
              <span aria-hidden="true" className="absolute right-4 top-3 font-pixel text-6xl font-bold opacity-10 dark:font-sans">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className={`flex size-12 items-center justify-center rounded-md border text-foreground ${TONES[i % TONES.length]} dark:text-background`}>
                <Icon size={24} />
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

const STACK_ICONS: LucideIcon[] = [LayoutTemplate, Workflow, DatabaseZap, Server, Lock];

/** « Sous le capot » : front, back, base de données, hébergement (VPS, auto-hébergement) et données personnelles, chacun avec les logos des outils cités. */
export function PortfolioStack() {
  return (
    <section id="architecture" aria-labelledby="stack-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-24 md:px-6">
      <SectionHead id="stack-title" eyebrow={STACK.eyebrow} title={STACK.title} intro={STACK.intro} />
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
        {STACK.layers.map((layer, i) => {
          const Icon = STACK_ICONS[i];
          const span = i < 3 ? "lg:col-span-2" : "lg:col-span-3";
          return (
            <li key={layer.title} className={`reveal lift flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-hard ${span}`}>
              <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-md border text-foreground dark:text-background ${TONES[i % TONES.length]}`}>
                <Icon size={22} />
              </span>
              <h3 className="text-xl font-semibold">{layer.title}</h3>
              <p className="text-muted-foreground">{layer.text}</p>
              {layer.tools.length > 0 && (
                <ul aria-label="Outils" className="mt-auto flex flex-wrap gap-2 pt-1">
                  {layer.tools.map((tool) => (
                    <li key={tool} className="flex items-center gap-1.5 rounded-md border bg-muted/60 px-2.5 py-1 text-sm">
                      <ToolIcon tool={tool} size={16} />
                      {tool}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PortfolioSkills() {
  return (
    <section aria-labelledby="skills-title" className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
      <SectionHead id="skills-title" eyebrow={SKILLS.eyebrow} title={SKILLS.title} intro={SKILLS.intro} />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {SKILLS.groups.map((g, i) => (
          <section key={g.title} aria-label={g.title} className="reveal rounded-lg border bg-card p-5 shadow-hard">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className={`size-3 rounded-sm border ${TONES[i % TONES.length]}`} />
              {g.title}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((item) => (
                <li key={item} className="flex items-center gap-1.5 rounded-md border bg-muted/60 px-2.5 py-1 text-sm">
                  <ToolIcon tool={item} size={16} />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="reveal mt-6 max-w-3xl text-lg text-muted-foreground">{SKILLS.note}</p>
    </section>
  );
}

/** Zone des réalisations : titre fixe, contenu (cartes, message) donné par l'appelant. */
export function PortfolioShowcaseFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id="realisations" aria-labelledby="showcase-title" className="scroll-mt-16 border-y bg-muted/40 py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead id="showcase-title" eyebrow={eyebrow} title={title} intro={intro} />
        {children}
      </div>
    </section>
  );
}

export function PortfolioContact() {
  return (
    <section aria-labelledby="contact-title" className="mx-auto max-w-6xl px-4 py-24 md:px-6">
      <div className="reveal relative overflow-hidden rounded-lg border bg-gradient-sunset bg-[length:var(--banner-size)] p-8 shadow-hard md:p-16">
        <div className="relative max-w-2xl rounded-md bg-background/85 p-6">
          <h2 id="contact-title" className="text-3xl font-bold md:text-5xl">
            {CONTACT.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{CONTACT.text}</p>
          <Button asChild size="lg" className="mt-6">
            <a href={contactHref}>
              {CONTACT.button}
              <ArrowRight size={18} aria-hidden="true" className="ml-2" />
            </a>
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
        <div>
          <p>{FOOTER}</p>
          <p className="mt-1 text-xs">{LOGOS_NOTE}</p>
        </div>
        <a href={contactHref} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
