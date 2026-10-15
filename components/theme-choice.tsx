"use client";

import { Anchor } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

const half =
  "group relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-gradient-sunset bg-[length:var(--banner-size)] p-6 text-center text-foreground outline-offset-[-8px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-ring max-md:gap-3 max-md:p-4 md:gap-5 md:p-8";
const frame =
  "overflow-hidden border-[3px] bg-card p-1 shadow-hard motion-safe:transition-transform motion-safe:group-hover:-translate-y-1";
const picture =
  "aspect-[7/10] h-[min(20rem,22svh)] w-auto object-cover [image-rendering:pixelated] md:h-[min(22rem,34svh)]";
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
  const choose = (theme: "light" | "dark") => {
    setTheme(theme);
    router.push("/aujourd-hui");
  };
  const pixel = over === "retro";

  return (
    <main className="flex h-svh flex-col md:min-h-svh md:h-auto">
      {/* Clin d'œil à la navigation et au logo (un navire et sa boussole). */}
      <h1 className="flex items-center justify-center gap-3 border-b-[3px] bg-background px-4 py-3 text-center text-sm font-semibold tracking-wide text-foreground md:text-base">
        <Anchor aria-hidden="true" className="size-4 shrink-0" />
        Choisis ton thème pour naviguer
        <Anchor aria-hidden="true" className="size-4 shrink-0" />
      </h1>
      <div className="relative flex min-h-0 flex-1 flex-col max-md:grid max-md:grid-rows-[repeat(2,minmax(0,1fr))] md:flex-row">

      <button
        type="button"
        onClick={() => choose("light")}
        onMouseEnter={() => setOver("retro")}
        onMouseLeave={() => setOver(null)}
        onFocus={() => setOver("retro")}
        onBlur={() => setOver(null)}
        aria-label="Choisir le thème rétro, clair en pixel art"
        className={cn("light max-md:pb-14", half)}
      >
        <span className={frame}>
          <Image src="/images/scene-chemise-bleue.png" alt="" width={248} height={354} unoptimized className={picture} />
        </span>
        <span className="font-pixel text-4xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-6xl">Rétro</span>
        <span className="max-w-xs text-sm max-md:hidden">Pixel : ciel pâle, traits marine, accents turquoise et orange.</span>
        <span className={cta}>Thème rétro</span>
      </button>

      {/* Le lien entre les deux : un trait et le logo au centre. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center md:inset-y-0 md:left-1/2 md:right-auto md:top-0 md:translate-y-0 md:-translate-x-1/2">
        <span className="absolute h-1 w-full bg-tone-teal md:h-full md:w-1" />
        <span className="light relative flex size-24 items-center justify-center rounded-full border-[3px] bg-card shadow-hard md:size-28">
          <LogoMark variant="classic" className={cn("absolute size-14 motion-safe:transition-opacity md:size-16", pixel ? "opacity-0" : "opacity-100")} />
          <LogoMark variant="pixel" className={cn("absolute size-[72px] motion-safe:transition-opacity", pixel ? "opacity-100" : "opacity-0")} />
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
        className={cn("dark max-md:pt-14", half)}
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
