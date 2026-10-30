"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Capture du portfolio : si le fichier ne se charge pas (supprimé, hôte en panne), un aplat sobre avec le texte alternatif remplace l'icône d'image cassée.
 * `fill` : le parent fixe la taille (rapport 16/9).
 */
export function PortfolioImage({ src, alt, sizes, priority = false }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div role="img" aria-label={alt} className="flex size-full items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground">
        <span aria-hidden="true" className="line-clamp-3 break-words">
          {alt}
        </span>
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} onError={() => setBroken(true)} className="object-cover object-top" />;
}
