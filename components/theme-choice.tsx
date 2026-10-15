"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

const half =
  "group relative flex min-h-[50svh] flex-1 flex-col items-center justify-center gap-5 bg-gradient-sunset bg-[length:var(--banner-size)] p-8 text-center max-md:gap-3 max-md:p-5 text-foreground outline-offset-[-8px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-ring md:min-h-svh";
const frame =
  "overflow-hidden border-[3px] bg-card p-1 shadow-hard motion-safe:transition-transform motion-safe:group-hover:-translate-y-1";
const cta =
  "inline-flex min-h-11 items-center rounded-md border bg-gradient-action px-6 font-semibold text-action-foreground shadow-hard";

/**
 * Premier écran : un choix explicite entre les deux thèmes, comme un lien entre le passé (clair, rétro pixel) et le futur (sombre, néon).
 * Chaque moitié montre son propre thème (blocs `.light` et `.dark`, indépendants du thème en cours) ; un clic l'enregistre et ouvre l'application.
 */
export function ThemeChoice() {
  const { setTheme } = useTheme();
  const router = useRouter();
  const choose = (theme: "light" | "dark") => {
    setTheme(theme);
    router.push("/aujourd-hui");
  };

  return (
    <main className="relative flex min-h-svh flex-col md:flex-row">
      <h1 className="sr-only">Choisis ton thème</h1>

      <button type="button" onClick={() => choose("light")} aria-label="Choisir le thème clair : rétro pixel" className={cn("light max-md:pb-14", half)}>
        <span className="font-pixel text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Rétro</span>
        <span className="font-pixel text-5xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-6xl">Clair</span>
        <span className={frame}>
          <Image src="/images/scene-chemise-bleue.png" alt="" width={248} height={360} unoptimized className="h-44 w-32 object-cover [image-rendering:pixelated] md:h-80 md:w-56" />
        </span>
        <span className="max-w-xs text-sm max-md:hidden">Rétro pixel : ciel pâle, traits marine, accents turquoise et orange.</span>
        <span className={cta}>Choisir le clair</span>
      </button>

      {/* Le lien entre les deux : un trait et le logo au centre. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center md:inset-y-0 md:left-1/2 md:right-auto md:top-0 md:translate-y-0 md:-translate-x-1/2">
        <span className="absolute h-1 w-full bg-tone-teal md:h-full md:w-1" />
        <span className="light relative flex size-24 items-center justify-center rounded-full border-[3px] bg-card shadow-hard md:size-28">
          <LogoMark pixel className="size-[72px]" />
        </span>
      </div>

      <button type="button" onClick={() => choose("dark")} aria-label="Choisir le thème sombre : néon, futur" className={cn("dark max-md:pt-14", half)}>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Futur</span>
        <span className="text-5xl font-bold uppercase leading-none tracking-tight md:text-6xl">Sombre</span>
        <span className={frame}>
          <Image src="/images/scene-nuit.jpg" alt="" width={248} height={360} unoptimized className="h-44 w-32 object-cover [image-rendering:pixelated] [object-position:25%_50%] md:h-80 md:w-56" />
        </span>
        <span className="max-w-xs text-sm max-md:hidden">Néon : bleu nuit, dégradé couchant, contours lumineux.</span>
        <span className={cta}>Choisir le sombre</span>
      </button>
    </main>
  );
}
