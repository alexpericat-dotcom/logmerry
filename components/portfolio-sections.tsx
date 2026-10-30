import { ArrowRight, Bot, Cable, Compass, DatabaseZap, LayoutTemplate, LifeBuoy, Lock, Server, ShieldCheck, Target, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";
import { Magnetic, TiltCard } from "@/components/hero-effects";
import { HeroVideo } from "@/components/hero-video";
import { MotionToggle } from "@/components/motion-toggle";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ToolIcon } from "@/components/tool-icon";
import { Button } from "@/components/ui/button";
import { mailtoHref } from "@/lib/domain/portfolio";
import { BRAND, CONTACT, CONTACT_EMAIL, CONTACT_SUBJECT, FOOTER, HERO, LEVER, LOGOS_NOTE, MARQUEE_TOOLS, PROCESS, SERVICES, SKILLS, STACK } from "@/lib/portfolio-content";

const contactHref = mailtoHref(CONTACT_EMAIL, CONTACT_SUBJECT);
const SERVICE_ICONS: LucideIcon[] = [Compass, Cable, DatabaseZap, Bot, LifeBuoy];
const TONES = ["bg-[hsl(var(--tone-teal))]", "bg-[hsl(var(--tone-orange))]", "bg-[hsl(var(--tone-violet))]", "bg-[hsl(var(--tone-pink))]", "bg-[hsl(var(--tone-yellow))]"];

/** Titre de section : étiquette pixel, titre, introduction. */
function SectionHead({ id, eyebrow, title, intro }: { id: string; eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="reveal mb-12 max-w-3xl">
      {/* Posée sur le fond de page (`bg-background`) : le orange de la marque y tient 4,64:1, sur les sections grisées il frôlait la limite (4,47:1). */}
      <p className="w-fit rounded-sm bg-background px-2 py-0.5 font-pixel text-sm uppercase tracking-widest text-display dark:font-sans dark:text-xs dark:font-semibold dark:text-primary">{eyebrow}</p>
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

/**
 * Fond du hero : le dégradé de la marque (jeton `gradient-sunset`), trois nappes de couleur qui dérivent très lentement, un léger grain et quatre carrés qui flottent
 * et se décalent au défilement. Entièrement décoratif (caché des lecteurs d'écran), sans image lourde ; les carrés sont à l'intérieur du hero, jamais coupés.
 */
function HeroBackdrop() {
  // Vidéo fournie : elle remplace les nappes, le grain et les carrés (un fond à la fois) ; l'overlay sombre est dans le composant.
  if (HERO.video) return <HeroVideo files={HERO.video} />;
  const blob = (color: string, opacity: number) => ({ background: `radial-gradient(closest-side, hsl(var(--${color}) / ${opacity}), transparent)` });
  const squares = [
    { at: "left-[3%] top-[14%]", size: "size-10", tone: "tone-teal", py: "-70px" },
    { at: "right-[4%] top-[12%]", size: "size-8", tone: "tone-yellow", py: "-40px" },
    { at: "left-[4%] bottom-[12%]", size: "size-8", tone: "tone-pink", py: "-90px" },
    { at: "right-[5%] bottom-[10%]", size: "size-12", tone: "tone-violet", py: "-55px" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="mesh -left-[12%] -top-[22%] h-[48rem] w-[48rem]" style={blob("tone-violet", 0.4)} />
      <span className="mesh -right-[14%] top-[8%] h-[44rem] w-[44rem]" style={{ ...blob("tone-pink", 0.34), animationDelay: "-12s" }} />
      <span className="mesh -bottom-[30%] right-[8%] h-[40rem] w-[40rem]" style={{ ...blob("tone-orange", 0.32), animationDelay: "-24s" }} />
      <div className="grain absolute inset-0" />
      {squares.map((q, i) => (
        <span key={q.at} className={`parallax absolute max-xl:hidden ${q.at}`} style={{ "--py": q.py } as React.CSSProperties}>
          <span style={{ animationDelay: `${i * -1.7}s`, backgroundColor: `hsl(var(--${q.tone}))` }} className={`float-slow block rounded-sm border opacity-80 shadow-hard ${q.size}`} />
        </span>
      ))}
    </div>
  );
}

/** « Ma méthode » : les six étapes en carte de verre ; l'étape 1 (le problème métier) est mise en avant, les traits entre étapes se dessinent, les étapes arrivent en cascade. Décorative : la méthode est détaillée plus bas. */
function MethodCard() {
  return (
    <TiltCard className="w-full max-w-md justify-self-center lg:justify-self-end">
      <div aria-hidden="true" className="glass hero-in relative rounded-xl p-6 shadow-hard" style={{ "--d": "140ms" } as React.CSSProperties}>
        <p className="mb-5 font-pixel text-sm uppercase tracking-widest text-display dark:font-sans dark:text-xs dark:font-semibold dark:text-primary">{HERO.methodTitle}</p>
        <ol className="flex flex-col gap-3.5">
          {PROCESS.steps.map((step, i) => (
            <li key={step.title} className="hero-in relative flex items-center gap-4" style={{ "--d": `${240 + i * 70}ms` } as React.CSSProperties}>
              {i < PROCESS.steps.length - 1 && <span className="method-seg absolute left-[17px] top-9 -bottom-3.5 w-0.5 bg-[hsl(var(--foreground)/0.25)]" style={{ "--d": `${420 + i * 110}ms` } as React.CSSProperties} />}
              <span
                className={`relative flex shrink-0 items-center justify-center rounded-md border font-pixel font-bold text-foreground dark:font-sans dark:text-background ${TONES[i % TONES.length]} ${
                  i === 0 ? "size-11 text-lg ring-4 ring-[hsl(var(--tone-orange)/0.45)]" : "size-9 text-base"
                }`}
              >
                {i + 1}
              </span>
              <span className={i === 0 ? "text-base font-bold" : "text-sm font-semibold"}>
                {step.title}
                {i === 0 && <span className="block text-xs font-medium text-muted-foreground">{HERO.methodStart}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </TiltCard>
  );
}

export function PortfolioHero() {
  const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
  // Avec la vidéo, le hero passe en jetons SOMBRES quel que soit le thème (texte clair sur overlay sombre : c'est ce que garantit le calcul de contraste).
  return (
    <section aria-labelledby="hero-title" className={`relative isolate overflow-hidden border-b bg-gradient-sunset bg-[length:var(--banner-size)] ${HERO.video ? "dark" : ""}`}>
      <HeroBackdrop />
      <div className="relative mx-auto grid min-h-[88vh] max-w-6xl items-center gap-14 px-4 py-20 md:px-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col gap-8">
          <p className="hero-in w-fit rounded-md border bg-background/70 px-3 py-1 font-pixel text-sm uppercase tracking-widest backdrop-blur dark:font-sans dark:text-xs dark:font-semibold dark:tracking-wider" style={delay(0)}>
            {HERO.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="hero-in break-words font-pixel text-4xl font-bold uppercase leading-[1] tracking-wide text-foreground [text-wrap:balance] sm:text-5xl lg:text-6xl dark:font-sans dark:text-5xl dark:normal-case dark:leading-[0.98] dark:tracking-tight dark:sm:text-6xl dark:lg:text-7xl"
            style={delay(60)}
          >
            {HERO.titleLead} <span className={`${HERO.video ? "text-brand-gradient-video" : "text-brand-gradient"} block`}>{HERO.titleAccent}</span>
          </h1>
          {/* Sur la vidéo : texte plein (pas d'atténuation), c'est ce que couvre le calcul de contraste du pire pixel. */}
          <p className={`hero-in max-w-[55ch] text-lg leading-relaxed md:text-xl ${HERO.video ? "text-foreground" : "text-foreground/80"}`} style={delay(120)}>
            {HERO.lead}
          </p>
          <div className="hero-in flex flex-wrap items-center gap-4" style={delay(180)}>
            <Magnetic>
              <Button asChild size="lg" className="cta-glow group">
                <a href="#realisations">
                  {HERO.primary}
                  <ArrowRight size={18} aria-hidden="true" className="ml-2 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </a>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline" className="cta-glow group bg-background/60 backdrop-blur">
              <a href={contactHref}>
                {HERO.secondary}
                <ArrowRight size={18} aria-hidden="true" className="ml-2 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
              </a>
            </Button>
          </div>
          {HERO.proof && (
            <p className={`hero-in max-w-[55ch] text-sm ${HERO.video ? "text-foreground" : "text-foreground/70"}`} style={delay(240)}>
              {HERO.proof}
            </p>
          )}
        </div>
        <MethodCard />
      </div>
    </section>
  );
}

/** Bandeau d'outils qui défile ; la seconde copie est cachée des lecteurs d'écran, et sans mouvement les outils passent à la ligne. */
export function PortfolioMarquee() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className={`flex shrink-0 items-center gap-3 pr-3 ${hidden ? "marquee-dup" : ""}`}>
      {MARQUEE_TOOLS.map((t) => (
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
            // Le gros numéro en filigrane est du contenu généré par le CSS (`data-n`) : décoratif, il n'est ni du texte à contraster ni lu par les lecteurs d'écran.
            <li
              key={s.title}
              data-n={String(i + 1).padStart(2, "0")}
              className={`reveal lift relative flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-6 shadow-hard before:pointer-events-none before:absolute before:right-4 before:top-3 before:font-pixel before:text-6xl before:font-bold before:opacity-10 before:content-[attr(data-n)] dark:before:font-sans ${span}`}
            >
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
