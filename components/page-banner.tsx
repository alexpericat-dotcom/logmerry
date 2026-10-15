import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const cartridge = "rounded-md border bg-card px-3 py-2 text-foreground dark:border-0 dark:bg-background/90";

/** Décor du bandeau d'accueil (clair seulement) : étoile violette et petit écran qui affiche le portrait. Décoratif. */
function BannerArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute right-4 top-4 dark:hidden md:right-6">
      <span className="absolute right-12 top-0 size-16 bg-tone-violet [clip-path:polygon(50%_0,60%_30%,95%_20%,72%_48%,100%_65%,64%_68%,60%_100%,45%_72%,10%_90%,28%_55%,0_35%,38%_33%)] md:size-[4.5rem]" />
      <div className="relative flex flex-col items-center pt-2">
        <div className="border-[3px] bg-tone-teal p-1 shadow-hard">
          <Image
            src="/images/scene-tshirt.png"
            alt=""
            width={80}
            height={116}
            unoptimized
            className="aspect-[7/10] w-16 border-2 object-cover [image-rendering:pixelated] md:w-20"
          />
        </div>
        <span className="mt-1 h-2 w-9 bg-foreground" />
      </div>
    </div>
  );
}

/**
 * Bandeau d'en-tête d'écran (DESIGN.md, `gradient-banner`) : titre pixel bicolore en haut à gauche, action principale (`actions`) en haut à droite.
 * L'explication (`description`) et les filtres (`children`) se placent au bas, chacun sur un fond plein : aucun texte ne repose sur la grille.
 * `hero` ajoute le décor d'accueil (étoile et écran au portrait, clair seulement) : cockpit seulement.
 */
export function PageBanner({
  title,
  description,
  actions,
  children,
  className,
  hero = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  hero?: boolean;
}) {
  return (
    <header
      className={cn(
        "relative flex min-h-44 flex-col justify-between gap-6 overflow-hidden rounded-lg border bg-gradient-sunset bg-[length:var(--banner-size)] px-4 pb-4 pt-5 shadow-hard max-md:min-h-28 md:px-6 md:pb-5 md:pt-6",
        className,
      )}
    >
      {hero && <BannerArt />}
      <div className={cn("relative flex items-start justify-between gap-3", hero && "pr-28 md:pr-40 dark:pr-0 md:dark:pr-0")}>
        <h1 className="break-words font-pixel text-3xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:2px_2px_0_hsl(var(--tone-teal))] md:text-4xl dark:font-sans dark:normal-case dark:leading-9 dark:tracking-normal dark:text-foreground dark:[text-shadow:none] dark:md:text-3xl">
          {title}
        </h1>
        {actions}
      </div>
      {(description || children) && (
        <div className="relative flex flex-col gap-2">
          {description && <p className={cn(cartridge, "max-w-2xl text-sm", hero && "mt-20 md:mr-36 md:mt-0 dark:ml-auto dark:mt-0 dark:md:mr-0")}>{description}</p>}
          {children && <div className="flex flex-col gap-2">{children}</div>}
        </div>
      )}
    </header>
  );
}
