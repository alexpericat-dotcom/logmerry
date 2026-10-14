import { cn } from "@/lib/utils";

/** Bandeau d'en-tête d'écran (DESIGN.md, `gradient-banner`) : le titre reste en haut, dans la zone calme du dégradé « couchant ». */
export function PageBanner({ title, className }: { title: string; className?: string }) {
  return (
    <header className={cn("rounded-lg border border-filet bg-gradient-sunset px-6 pb-28 pt-6", className)}>
      <h1 className="break-words text-3xl font-bold">{title}</h1>
    </header>
  );
}
