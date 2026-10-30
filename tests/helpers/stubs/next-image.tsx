/** `next/image` hors de Next : une simple balise `img` (pas d'optimisation dans un test). */
export default function Image({ src, alt }: { src: string; alt: string; fill?: boolean; sizes?: string; priority?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- doublure de test
  return <img src={src} alt={alt} />;
}
