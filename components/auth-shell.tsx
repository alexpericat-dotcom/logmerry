import Image from "next/image";

import { LogoMark } from "@/components/logo-mark";

/**
 * Écran d'authentification. Clair : à gauche, le nom en pixel bicolore et la carte du formulaire sur la grille du bandeau ; à droite
 * (au-dessus sur téléphone), la scène du café en pixel art, décorative. Sombre : inchangé, carte centrée sur le dégradé « couchant », sans image.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-gradient-sunset bg-[length:var(--banner-size)] md:flex-row dark:md:flex-col">
      <div aria-hidden="true" className="relative order-first h-40 shrink-0 overflow-hidden border-b md:order-last md:h-auto md:flex-1 md:border-b-0 md:border-l dark:hidden">
        <Image
          src="/images/scene-chemise-bleue.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-cover [image-rendering:pixelated] [object-position:50%_30%]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-6 md:max-w-xl md:p-10 dark:gap-0 dark:md:max-w-none">
        <header className="flex items-center gap-3">
          <LogoMark className="size-[72px] dark:size-10" />
          <div>
            <p className="font-pixel text-5xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-6xl dark:font-brand dark:text-3xl dark:leading-none dark:md:leading-none dark:normal-case dark:tracking-tight dark:text-foreground dark:[text-shadow:none] dark:md:text-3xl">
              LogMerry
            </p>
            <p className="mt-1 font-pixel text-sm dark:font-sans">Ton cockpit d&apos;activité.</p>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center py-2 dark:py-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
