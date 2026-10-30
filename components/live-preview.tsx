"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const WIDTH = 1280;
const HEIGHT = 720;

/**
 * Aperçu en direct d'un site dans le cadre de navigateur de la carte : le site est affiché à 1280 px de large puis réduit à la largeur de la carte.
 * `auto` : il se charge quand la carte approche de l'écran (réalisation sans capture) ; sinon un bouton « Voir en direct » le charge à la demande (la capture sert d'affiche).
 * Le site est dans un cadre isolé : son origine est la sienne, il n'a aucun accès à cette page. `url` doit déjà être une adresse https sûre.
 */
export function LivePreview({ url, title, poster, auto, label }: { url: string; title: string; poster: ReactNode; auto: boolean; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / WIDTH));
    resize.observe(el);
    if (!auto) return () => resize.disconnect();
    const seen = new IntersectionObserver(([entry]) => entry.isIntersecting && setOn(true), { rootMargin: "300px" });
    seen.observe(el);
    return () => {
      resize.disconnect();
      seen.disconnect();
    };
  }, [auto]);

  return (
    <div ref={box} className="relative size-full overflow-hidden">
      {on ? (
        <iframe
          src={url}
          title={`Aperçu en direct : ${title}`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          loading="lazy"
          style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})` }}
          className="absolute left-0 top-0 origin-top-left border-0 bg-white"
        />
      ) : (
        <>
          {poster}
          {!auto && (
            <button
              type="button"
              onClick={() => setOn(true)}
              className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px] transition hover:bg-background/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
            >
              <span className="inline-flex min-h-11 items-center gap-2 rounded-md border bg-primary px-5 py-2 font-semibold text-primary-foreground shadow-hard">
                <Play size={16} aria-hidden="true" />
                {label}
                <span className="sr-only"> : {title}</span>
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
