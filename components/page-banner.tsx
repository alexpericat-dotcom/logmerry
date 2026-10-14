import { cn } from "@/lib/utils";

/**
 * Bandeau d'en-tête d'écran (DESIGN.md, `gradient-banner`) : le titre reste en haut, dans la zone calme du dégradé « couchant ».
 * `description` (explication courte) se place au bas, dans un cartouche presque opaque : le texte ne repose jamais directement sur la zone colorée.
 */
export function PageBanner({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <header className={cn("flex min-h-44 flex-col justify-between gap-6 rounded-lg border border-filet bg-gradient-sunset px-6 pb-5 pt-6", className)}>
      <h1 className="break-words text-3xl font-bold">{title}</h1>
      {description && <p className="max-w-2xl rounded-md bg-background/90 px-3 py-2 text-sm text-foreground">{description}</p>}
    </header>
  );
}
