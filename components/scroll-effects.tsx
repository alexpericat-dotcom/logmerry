"use client";

import { useEffect } from "react";

const TARGETS = ".reveal, .reveal-left, .reveal-right, .reveal-scale, .sketch";

/**
 * Mouvements au défilement pour les navigateurs SANS `animation-timeline` (Safari avant 26, Firefox), où le CSS seul ne ferait rien : les éléments `.reveal*`
 * sous le bord de l'écran sont masqués puis entrent quand ils apparaissent (IntersectionObserver), et le zoom / la montée du hero suivent le défilement via `--hero-p`.
 * Un navigateur qui sait faire en CSS, ou un visiteur qui a demandé moins de mouvement, n'est pas touché. Sans ce composant (JS coupé), tout reste affiché.
 */
export function ScrollEffects() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.classList.add("rv-run");
          // Le retrait de « rv-pending » au tour suivant déclenche la transition (l'état masqué doit avoir été peint une fois).
          requestAnimationFrame(() => el.classList.remove("rv-pending"));
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of document.querySelectorAll<HTMLElement>(TARGETS)) {
      // Déjà à l'écran au chargement : on ne le masque pas (pas de clignotement).
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
      el.classList.add("rv-pending");
      observer.observe(el);
    }

    let frame = 0;
    const root = document.documentElement;
    const update = () => {
      frame = 0;
      root.style.setProperty("--hero-p", String(Math.min(1, window.scrollY / window.innerHeight)));
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      root.style.removeProperty("--hero-p");
    };
  }, []);
  return null;
}
