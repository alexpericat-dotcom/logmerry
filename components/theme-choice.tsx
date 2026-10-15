"use client";

import { Anchor } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

const half =
  "group absolute flex flex-col items-center justify-center gap-4 bg-gradient-sunset bg-[length:var(--banner-size)] overflow-hidden p-6 text-center text-foreground transition-[width,height,transform] duration-700 ease-in-out outline-offset-[-8px] motion-reduce:transition-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-ring max-md:gap-3 max-md:p-4 md:gap-5 md:p-8 max-md:inset-x-0 md:inset-y-0";
const frame =
  "overflow-hidden border-[3px] bg-card p-1 shadow-hard motion-safe:transition-transform motion-safe:group-hover:-translate-y-1";
const picture =
  "aspect-[7/10] h-[min(20rem,15svh)] w-auto object-cover [image-rendering:pixelated] md:h-[min(22rem,34svh)]";
const cta =
  "inline-flex min-h-11 items-center rounded-md border bg-gradient-action px-6 font-semibold text-action-foreground shadow-hard";

/**
 * Premier écran : un choix explicite entre les deux thèmes, comme un lien entre le rétro (clair, pixel) et le futur (sombre, néon).
 * Chaque moitié montre son propre thème (blocs `.light` et `.dark`, indépendants du thème en cours) ; un clic l'enregistre et ouvre l'application.
 * Au centre, le logo : classique tant qu'on survole le futur ou rien, en pixels quand on survole le rétro.
 */
export function ThemeChoice() {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [over, setOver] = useState<"retro" | "futur" | null>(null);
  const [chosen, setChosen] = useState<"light" | "dark" | null>(null);
  // Au clic, l'autre moitié sort de l'écran comme un volet (à gauche pour le rétro, à droite pour le futur ; vers le haut ou le bas sur téléphone),
  // la moitié choisie s'étend, puis le thème est enregistré et l'application s'ouvre.
  const choose = (theme: "light" | "dark") => {
    if (chosen) return;
    setChosen(theme);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setTheme(theme);
      router.push("/aujourd-hui");
    }, reduced ? 0 : 750);
  };
  const pixel = over === "retro";

  return (
    <main className="flex h-svh flex-col md:min-h-svh md:h-auto">
      {/* Clin d'œil à la navigation et au logo (un navire et sa boussole). */}
      <header className="flex flex-col items-center gap-1 border-b bg-background px-4 py-4 text-center text-foreground md:gap-2 md:py-5">
        <p className="text-base font-semibold md:text-xl">Ton cockpit pour piloter ton activité de conseil</p>
        <p className="max-w-2xl text-xs text-muted-foreground max-md:hidden md:text-sm">
          Tâches du jour, clients, missions, factures et un assistant qui répond à partir de tes notes.
        </p>
        <h1 className="flex items-center justify-center gap-2 pt-1 text-xs font-medium text-muted-foreground md:text-sm">
          <Anchor aria-hidden="true" className="size-3.5 shrink-0" />
          Choisis ton thème pour naviguer
          <Anchor aria-hidden="true" className="size-3.5 shrink-0" />
        </h1>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">

      <button
        type="button"
        onClick={() => choose("light")}
        onMouseEnter={() => setOver("retro")}
        onMouseLeave={() => setOver(null)}
        onFocus={() => setOver("retro")}
        onBlur={() => setOver(null)}
        aria-label="Choisir le thème rétro, clair en pixel art"
        disabled={chosen !== null}
        className={cn(
          "light max-md:top-0 max-md:h-1/2 max-md:pb-16 md:left-0 md:w-1/2",
          chosen === "dark" && "max-md:-translate-y-full md:-translate-x-full",
          chosen === "light" && "max-md:h-full md:w-full",
          half,
        )}
      >
        <span className={frame}>
          <Image src="/images/scene-chemise-bleue.png" alt="" width={248} height={354} unoptimized className={picture} />
        </span>
        <span className="font-pixel text-4xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-6xl">Rétro</span>
        <span className="max-w-xs text-sm max-md:hidden">Pixel : ciel pâle, traits marine, accents turquoise et orange.</span>
        <span className={cta}>Thème rétro</span>
      </button>

      {/* Le lien entre les deux : un trait et le logo au centre. */}
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center md:inset-y-0 md:left-1/2 md:right-auto md:top-0 md:translate-y-0 md:-translate-x-1/2 motion-safe:transition-opacity motion-safe:duration-300", chosen && "opacity-0")}>
        <span className="absolute h-1 w-full bg-tone-teal md:h-full md:w-1" />
        <span className="light relative flex size-20 items-center justify-center rounded-full border-[3px] bg-card shadow-hard md:size-28">
          <LogoMark variant="classic" className={cn("absolute size-11 motion-safe:transition-opacity md:size-16", pixel ? "opacity-0" : "opacity-100")} />
          <LogoMark variant="pixel" className={cn("absolute size-[54px] motion-safe:transition-opacity md:size-[72px]", pixel ? "opacity-100" : "opacity-0")} />
        </span>
      </div>

      <button
        type="button"
        onClick={() => choose("dark")}
        onMouseEnter={() => setOver("futur")}
        onMouseLeave={() => setOver(null)}
        onFocus={() => setOver("futur")}
        onBlur={() => setOver(null)}
        aria-label="Choisir le thème futur, sombre néon"
        disabled={chosen !== null}
        className={cn(
          "dark max-md:bottom-0 max-md:h-1/2 max-md:pt-16 md:right-0 md:w-1/2",
          chosen === "light" && "max-md:translate-y-full md:translate-x-full",
          chosen === "dark" && "max-md:h-full md:w-full",
          half,
        )}
      >
        <span className={frame}>
          <Image src="/images/scene-nuit.jpg" alt="" width={248} height={354} unoptimized className={cn(picture, "[object-position:25%_50%]")} />
        </span>
        <span className="text-4xl font-bold uppercase leading-none tracking-tight md:text-6xl">Futur</span>
        <span className="max-w-xs text-sm max-md:hidden">Néon : bleu nuit, dégradé couchant, contours lumineux.</span>
        <span className={cta}>Thème futur</span>
      </button>
      </div>
    </main>
  );
}
