import Image from "next/image";

import { LogoMark } from "@/components/logo-mark";

/**
 * Écran d'authentification : à gauche, le nom en pixel bicolore et la carte du formulaire sur la grille du bandeau ; à droite (au-dessus sur téléphone),
 * la scène en pixel art : le café en clair, le bureau de nuit en sombre. L'image est décorative.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-gradient-sunset bg-[length:var(--banner-size)] md:flex-row">
      <div aria-hidden="true" className="relative order-first h-40 shrink-0 overflow-hidden border-b md:order-last md:h-auto md:flex-1 md:border-b-0 md:border-l">
        <Image
          src="/images/scene-cafe.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-cover [image-rendering:pixelated] [object-position:40%_30%] dark:hidden"
        />
        <Image
          src="/images/scene-nuit.jpg"
          alt=""
          fill
          priority
          unoptimized
          sizes="(min-width: 768px) 60vw, 100vw"
          className="hidden object-cover [image-rendering:pixelated] [object-position:30%_50%] dark:block"
        />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-6 md:max-w-xl md:p-10">
        <header className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <p className="font-pixel text-5xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-6xl dark:[text-shadow:none]">
              LogMerry
            </p>
            <p className="mt-1 text-sm">Ton cockpit d&apos;activité.</p>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center py-2">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
