import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const cartridge = "rounded-md bg-background/90 px-3 py-2 text-foreground";

/**
 * Bandeau d'en-tête d'écran (DESIGN.md, `gradient-banner`) : le titre reste en haut à gauche, dans la zone calme du dégradé « couchant »,
 * l'action principale (`actions`) en haut à droite. L'explication (`description`) se place au bas dans un cartouche presque opaque ; les filtres (`children`) se placent au bas aussi,
 * chacun avec son propre fond presque opaque : aucun texte ne repose directement sur la zone colorée.
 */
export function PageBanner({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-h-44 flex-col justify-between gap-6 rounded-lg border border-filet bg-gradient-sunset px-6 pb-5 pt-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <h1 className="break-words text-3xl font-bold">{title}</h1>
        {actions}
      </div>
      {(description || children) && (
        <div className="flex flex-col gap-2">
          {description && <p className={cn(cartridge, "max-w-2xl text-sm")}>{description}</p>}
          {children && <div className="flex flex-col gap-2">{children}</div>}
        </div>
      )}
    </header>
  );
}
