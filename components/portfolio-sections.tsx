import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";
import { PortfolioHeaderFrame } from "@/components/portfolio-header-frame";
import { Sketch, type SketchName } from "@/components/sketches";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ToolIcon } from "@/components/tool-icon";
import { mailtoHref } from "@/lib/domain/portfolio";
import { BRAND, CONTACT, CONTACT_EMAIL, CONTACT_SUBJECT, FOOTER, HEADER, HERO, LEVER, LOGOS_NOTE, PROCESS, SERVICES, STACK } from "@/lib/portfolio-content";

const contactHref = mailtoHref(CONTACT_EMAIL, CONTACT_SUBJECT);
/** Étiquette en monospace, petites capitales espacées : eyebrow, légendes, mentions. */
const MONO = "font-mono text-phi-n1 uppercase tracking-[0.18em]";
/** Texte crème posé sur la photo (grand écran) : la couleur sur laquelle est calculé le contraste du voile (`--photo`, `lib/portfolio-page.test.ts`). */
const CREAM = "lg:text-photo";

/** Bouton d'appel à l'action en verre liquide (`.liquid` dans `app/globals.css`) : « orange » (verre teinté d'orange) pour l'action principale, « clear » (verre clair) pour la secondaire ; tous deux transparents et flous, texte de la couleur du contexte. */
export function LiquidButton({ href, tone, size = "md", children, className = "" }: { href: string; tone: "orange" | "clear"; size?: "sm" | "md" | "lg"; children: ReactNode; className?: string }) {
  const sizes = { sm: "h-11 px-7 text-phi-n1 md:h-9", md: "h-11 px-7 text-phi-0", lg: "h-12 px-9 text-phi-0" }[size];
  return (
    <a href={href} className={`liquid liquid-${tone} ${sizes} ${className}`}>
      {children}
    </a>
  );
}

/** Titre de section : étiquette mono, titre serif, introduction ; un croquis facultatif à droite (grand écran), qui se dessine à l'arrivée. */
function SectionHead({ id, eyebrow, title, intro, sketch }: { id: string; eyebrow: string; title: string; intro?: string; sketch?: SketchName }) {
  return (
    <div className="mb-phi-2 flex items-end justify-between gap-phi-2 md:mb-phi-3">
      <div className="reveal max-w-3xl">
        <p className={`${MONO} text-muted-foreground`}>{eyebrow}</p>
        <h2 id={id} className="mt-3 break-words text-phi-4 md:text-phi-5">
          {title}
        </h2>
        {intro && <p className="mt-4 text-phi-1 text-muted-foreground">{intro}</p>}
      </div>
      {sketch && <Sketch name={sketch} className="hidden w-44 shrink-0 text-foreground/80 lg:block xl:w-52" />}
    </div>
  );
}

/** Au chargement l'en-tête est posé sur la photo (`PortfolioHeaderFrame`), puis translucide et flou au défilement. « Qui suis-je » est un simple lien-bouton sans cadre, « Contact » le bouton orange, plus long. */
export function PortfolioHeader() {
  return (
    <PortfolioHeaderFrame>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:px-6">
        <Link href="/portfolio" className="flex items-center gap-2 font-brand text-phi-1 font-bold" aria-label={`${BRAND}, haut de page`}>
          <LogoMark variant="classic" className="size-7" />
          <span className="max-sm:sr-only">{BRAND}</span>
        </Link>
        <nav aria-label="Sections" className="flex items-center gap-1 text-phi-n1">
          {[
            ["#methode", "Méthode"],
            ["#services", "Offre"],
            ["#architecture", "Architecture"],
            ["#realisations", "Réalisations"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="hidden rounded-md px-3 py-2 underline-offset-4 hover:underline lg:inline-block">
              {label}
            </a>
          ))}
          <ThemeSwitcher />
          <a href="#qui-suis-je" className="inline-flex h-11 items-center rounded-md px-3 text-phi-n1 font-medium hover:bg-accent hover:text-accent-foreground group-data-[scrolled=false]/header:hover:bg-photo/15 group-data-[scrolled=false]/header:hover:text-photo md:h-9">
            {HEADER.about}
          </a>
          <LiquidButton href="#contact" tone="orange" size="sm" className="ml-1 px-8">
            {HEADER.contact}
          </LiquidButton>
        </nav>
      </div>
    </PortfolioHeaderFrame>
  );
}

const IMAGE = "/images/hero/hero";
/** Sources de la photo : AVIF puis WebP ; cadrage large dès 1024 px, cadrage 4:3 centré sur le surfeur en dessous. Les tailles sont celles de `scripts/build-hero-image.mjs`. */
const SOURCES = [
  { media: "(min-width: 1024px)", set: (ext: string) => `${IMAGE}-wide-1400.${ext} 1400w, ${IMAGE}-wide-2000.${ext} 2000w` },
  { media: undefined, set: (ext: string) => `${IMAGE}-crop-800.${ext} 800w, ${IMAGE}-crop-1200.${ext} 1200w` },
];

/**
 * Hero : la photo en pleine largeur, le texte posé dessus dans la zone dégagée (grand écran), sans bloc ni carte derrière lui ; un voile d'encre le protège
 * (`.hero-veil`). Sur téléphone et tablette, la photo (recadrée sur le surfeur) est au-dessus et le texte en dessous, jamais par-dessus le surfeur.
 * La photo est l'élément le plus grand de la page : chargée en priorité, dimensions explicites, jamais en chargement différé.
 */
export function PortfolioHero() {
  const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b bg-background lg:min-h-[max(34rem,min(56.25vw,100svh))]">
      <div className="relative aspect-[4/3] max-h-[70svh] w-full bg-primary lg:absolute lg:inset-0 lg:aspect-auto lg:max-h-none">
        <picture className="hero-zoom block size-full">
          {SOURCES.flatMap((s) =>
            (["avif", "webp"] as const).map((ext) => <source key={`${s.media}-${ext}`} media={s.media} type={`image/${ext}`} srcSet={s.set(ext)} sizes="100vw" />),
          )}
          {/* Une balise <img> dans <picture> : variantes déjà optimisées (AVIF/WebP) et recadrées à la main, next/image les ré-encoderait. */}
          <img src={`${IMAGE}-crop-1200.webp`} width={1200} height={900} alt={HERO.imageAlt} fetchPriority="high" decoding="async" className="size-full object-cover object-center lg:object-[100%_55%]" />
        </picture>
      </div>
      <div aria-hidden="true" className="hero-veil absolute inset-0 hidden lg:block" />
      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 md:px-6 lg:pb-20 lg:pt-40">
        <div className={`hero-lift flex flex-col gap-phi-1 lg:max-w-[min(34rem,46vw)] lg:[--liquid-shade:0.22] lg:[--ring:var(--photo)] ${CREAM}`}>
          <p className={`hero-in ${MONO} flex items-center gap-3`} style={delay(0)}>
            <span aria-hidden="true" className="h-px w-8 bg-tone-orange" />
            {HERO.eyebrow}
          </p>
          {/* Les mots montent un à un (`.word`) ; le texte lu reste la phrase entière. */}
          <h1 id="hero-title" className="break-words text-phi-5 [text-wrap:balance] lg:text-phi-6">
            {HERO.title.split(" ").map((word, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="word-mask">
                  <span className="word" style={{ "--w": i } as CSSProperties}>
                    {word}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>
          {/* Chaque phrase est un bloc équilibré (`text-wrap: balance`) : aucune ligne courte isolée en bout de paragraphe. */}
          <p className="hero-in text-phi-1 lg:text-phi-0" style={delay(240)}>
            {HERO.lead.split("\n").map((sentence, i) => (
              <Fragment key={i}>
                {i > 0 && "\n"}
                <span className="block [text-wrap:balance]">{sentence}</span>
              </Fragment>
            ))}
          </p>
          <div className="hero-in flex flex-wrap items-center gap-3" style={delay(360)}>
            <LiquidButton href="#realisations" tone="orange" size="lg" className="group">
              {HERO.primary}
              <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            </LiquidButton>
            <LiquidButton href={contactHref} tone="clear" size="lg">
              {HERO.secondary}
            </LiquidButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PortfolioLever() {
  return (
    <section id="qui-suis-je" aria-labelledby="lever-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-phi-3 md:px-6 md:py-phi-4">
      <SectionHead id="lever-title" eyebrow={LEVER.eyebrow} title={LEVER.title} sketch="head" />
      <div className="grid gap-phi-1 lg:grid-cols-2">
        <p className="reveal-left text-phi-1 text-muted-foreground line-through decoration-1 md:text-phi-2">{LEVER.before}</p>
        <p className="reveal-right border-l-4 border-tone-orange pl-6 font-serif text-phi-3 md:text-phi-4">{LEVER.after}</p>
      </div>
      <p className="reveal mt-phi-1 max-w-3xl text-phi-1 text-muted-foreground">{LEVER.note}</p>
      <ul className="mt-phi-2 grid gap-phi-1 md:grid-cols-3">
        {LEVER.points.map((p, i) => (
          <li key={p.title} style={{ "--i": i } as React.CSSProperties} className="reveal flex flex-col gap-3 border-t pt-5">
            <h3 className="text-phi-2">{p.title}</h3>
            <p className="text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** La méthode en colonne verticale ; l'étape 1 (le problème métier) est mise en valeur. La citation en épigraphe est traduite et attribuée. */
const STEP_SKETCHES: SketchName[] = ["question", "flow", "compass", "spark", "rocket", "wrench"];

export function PortfolioProcess() {
  const { epigraph } = PROCESS;
  return (
    <section id="methode" aria-labelledby="process-title" className="scroll-mt-16 border-y bg-muted py-phi-3 md:py-phi-4">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead id="process-title" eyebrow={PROCESS.eyebrow} title={PROCESS.title} intro={PROCESS.intro} sketch="funnel" />
        <figure className="reveal-scale mb-phi-3 max-w-2xl border-l-2 border-tone-orange pl-6">
          <blockquote className="font-serif text-phi-2 italic md:text-phi-3">« {epigraph.text} »</blockquote>
          <figcaption className={`${MONO} mt-4 text-muted-foreground`}>
            {epigraph.author}, <cite className="not-italic">{epigraph.source}</cite>
          </figcaption>
        </figure>
        <ol className="relative max-w-3xl pl-5 md:pl-8">
          {/* Colonne vertébrale : se trace au fil du défilement. */}
          <span aria-hidden="true" className="spine absolute left-0 top-0 h-full w-0.5 bg-tone-orange" />
          {PROCESS.steps.map((s, i) => (
            <li key={s.title} className={`${i === 0 ? "reveal-scale" : "reveal-left"} grid grid-cols-[3.5rem_1fr] gap-4 border-t py-phi-1 md:grid-cols-[5rem_1fr] ${i === 0 ? "border-t-2 border-t-tone-orange bg-card px-4 md:px-6" : ""}`}>
              <span aria-hidden="true" className={`font-serif leading-none ${i === 0 ? "text-phi-5 text-primary md:text-phi-6" : "text-phi-4 text-muted-foreground md:text-phi-5"}`}>
                {i + 1}
              </span>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={i === 0 ? "text-phi-3 md:text-phi-4" : "text-phi-2 md:text-phi-3"}>{s.title}</h3>
                  <p className="mt-2 max-w-[60ch] text-muted-foreground">{s.text}</p>
                </div>
                <Sketch name={STEP_SKETCHES[i]} className="hidden size-20 shrink-0 text-foreground/80 sm:block" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const SERVICE_SKETCHES: SketchName[] = ["magnifier", "loop", "window", "chat", "wrench"];

export function PortfolioServices() {
  return (
    <section id="services" aria-labelledby="services-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-phi-3 md:px-6 md:py-phi-4">
      <SectionHead id="services-title" eyebrow={SERVICES.eyebrow} title={SERVICES.title} intro={SERVICES.intro} />
      <ul className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {SERVICES.items.map((s, i) => (
          <li key={s.title} className={`${i % 2 === 0 ? "reveal-left" : "reveal-right"} flex flex-col gap-3 border-t pt-5`}>
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className={`${MONO} text-muted-foreground`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <Sketch name={SERVICE_SKETCHES[i]} className="size-16 text-foreground/80" />
            </div>
            <h3 className="text-phi-2 md:text-phi-3">{s.title}</h3>
            <p className="max-w-[55ch] text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** « Sous le capot » : les briques (front end, back end, base de données, IA et agents, hébergement, données personnelles), chacune traduite « en clair » ; logos seulement pour les outils validés. */
const BRICK_SKETCHES: SketchName[] = ["window", "cog", "database", "chat", "cloud", "shield"];

export function PortfolioStack() {
  return (
    <section id="architecture" aria-labelledby="stack-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-phi-3 md:px-6 md:pb-phi-4">
      <SectionHead id="stack-title" eyebrow={STACK.eyebrow} title={STACK.title} intro={STACK.intro} sketch="cubes" />
      <ul>
        {STACK.bricks.map((brick, b) => (
          <li key={brick.title} className="reveal grid gap-4 border-t py-phi-1 md:grid-cols-[16rem_1fr] md:gap-phi-2">
            <div className="flex items-center gap-4 md:flex-col md:items-start">
              <h3 className="text-phi-2 md:text-phi-3">{brick.title}</h3>
              <Sketch name={BRICK_SKETCHES[b]} className="size-16 text-foreground/80 md:size-20" />
            </div>
            <div className="flex flex-col gap-4">
              <p className="max-w-[60ch] text-phi-1">
                <span className={`${MONO} mr-2 text-muted-foreground`}>{STACK.plainLabel}</span>
                {brick.plain}
              </p>
              <p className="max-w-[60ch] text-muted-foreground">{brick.text}</p>
              {brick.tools.length > 0 && (
                <ul aria-label="Outils" className="flex flex-wrap gap-2">
                  {brick.tools.map((tool, t) => (
                    <li key={tool} style={{ "--i": t % 6 } as CSSProperties} className="reveal-scale flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-phi-n1">
                      <ToolIcon tool={tool} size={16} />
                      {tool}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Zone des réalisations : titre fixe, contenu (cartes, message) donné par l'appelant. */
export function PortfolioShowcaseFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id="realisations" aria-labelledby="showcase-title" className="scroll-mt-16 border-y bg-muted py-phi-3 md:py-phi-4">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead id="showcase-title" eyebrow={eyebrow} title={title} intro={intro} />
        {children}
      </div>
    </section>
  );
}

export function PortfolioContact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-phi-3 md:px-6 md:py-phi-4">
      <div className="reveal-scale flex items-center justify-between gap-phi-2">
        <div className="max-w-2xl">
        <h2 id="contact-title" className="text-phi-4 md:text-phi-5">
          {CONTACT.title}
        </h2>
        <p className="mt-4 text-phi-1 text-muted-foreground">{CONTACT.text}</p>
        <LiquidButton href={contactHref} tone="orange" size="lg" className="mt-8">
          {CONTACT.button}
          <ArrowRight size={18} aria-hidden="true" />
        </LiquidButton>
        </div>
        <Sketch name="talk" className="hidden w-72 shrink-0 text-foreground/80 md:block xl:w-80" />
      </div>
    </section>
  );
}

export function PortfolioFooter() {
  return (
    <footer className="border-t py-8 text-phi-n1 text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 md:px-6">
        <div>
          <p>{FOOTER}</p>
          <p className="mt-1 text-phi-n1">{LOGOS_NOTE}</p>
        </div>
        <a href={contactHref} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
