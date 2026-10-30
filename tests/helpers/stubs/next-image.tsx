import type { ReactEventHandler } from "react";

/** `next/image` hors de Next : une simple balise `img` (pas d'optimisation dans un test) ; l'événement d'erreur est transmis. */
export default function Image({ src, alt, onError }: { src: string; alt: string; fill?: boolean; sizes?: string; priority?: boolean; className?: string; onError?: ReactEventHandler<HTMLImageElement> }) {
  // eslint-disable-next-line @next/next/no-img-element -- doublure de test
  return <img src={src} alt={alt} onError={onError} />;
}
