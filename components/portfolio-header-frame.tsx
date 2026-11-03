"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Distance de défilement (px) à partir de laquelle l'en-tête quitte la photo pour devenir translucide et flou. */
const SCROLL_AT = 24;

/**
 * Cadre de l'en-tête de la page publique : posé sur la photo du hero au chargement (voile d'encre, texte crème), puis translucide et flou dès que la page défile.
 * L'état est porté par `data-scrolled` : les enfants (rendus côté serveur) s'adaptent par `group-data-[scrolled=false]/header:`.
 * Au chargement l'état est « en haut » ; le premier appel (hors de l'effet) couvre une page rouverte au milieu.
 */
export function PortfolioHeaderFrame({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_AT);
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <header
      data-portfolio-header
      data-scrolled={scrolled}
      className={`group/header fixed inset-x-0 top-0 z-30 transition-[background-color,border-color,backdrop-filter] duration-300 motion-reduce:transition-none ${
        scrolled ? "border-b bg-background/75 text-foreground backdrop-blur-md" : "header-veil border-b border-transparent text-photo [--muted-foreground:var(--photo)] [--ring:var(--photo)]"
      }`}
    >
      {children}
    </header>
  );
}
