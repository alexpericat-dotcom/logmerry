import type { ReactNode } from "react";

import { TypedText } from "@/components/typed-text";
import { cn } from "@/lib/utils";

const cartridge = "rounded-md border bg-card px-3 py-2 text-foreground dark:border-0 dark:bg-background/90";

/**
 * Bandeau d'en-tête d'écran (DESIGN.md, `gradient-banner`) : titre pixel bicolore en haut à gauche, action principale (`actions`) en haut à droite.
 * L'explication (`description`) et les filtres (`children`) se placent au bas, chacun sur un fond plein : aucun texte ne repose sur la grille.
 * `hero` (cockpit) : l'explication s'écrit au clavier (TypedText) et, en sombre, se place à droite du bandeau.
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
      <div className="relative flex items-start justify-between gap-3">
        <h1 className="break-words font-pixel text-3xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:2px_2px_0_hsl(var(--tone-teal))] md:text-4xl dark:font-sans dark:normal-case dark:leading-9 dark:tracking-normal dark:text-foreground dark:[text-shadow:none] dark:md:text-3xl">
          {title}
        </h1>
        {actions}
      </div>
      {(description || children) && (
        <div className="relative flex flex-col gap-2">
          {description && <p className={cn(cartridge, "max-w-2xl text-sm", hero && "dark:ml-auto")}>{hero ? <TypedText text={description} /> : description}</p>}
          {children && <div className="flex flex-col gap-2">{children}</div>}
        </div>
      )}
    </header>
  );
}
