"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { isSameOrigin } from "@/lib/domain/portfolio";

const WIDTH = 1280;
const HEIGHT = 720;
/** Le strict nécessaire pour afficher un site : jamais de navigation de la page, de fenêtre surgissante, de formulaire envoyé ni de téléchargement. */
export const PREVIEW_SANDBOX = "allow-scripts allow-same-origin";
/** Marge avant l'écran à partir de laquelle un aperçu automatique se charge. */
export const PREVIEW_ROOT_MARGIN = "300px";

/**
 * Aperçu en direct d'un site dans le cadre de navigateur de la carte : le site est affiché à 1280 px de large puis réduit à la largeur de la carte.
 * `auto` : il se charge quand la carte approche de l'écran (première réalisation sans capture, hors mode « économie de données ») ; sinon un bouton « Voir en direct »
 * le charge à la demande (la capture ou l'aplat sert d'affiche) : un visiteur n'envoie pas son adresse IP à un site tiers sans l'avoir choisi.
 * Le site est dans un cadre isolé : son origine est la sienne, il n'a aucun accès à cette page. `allow-scripts` avec `allow-same-origin` n'isole QUE parce que l'adresse
 * est d'une autre origine : une adresse de la même origine que la page n'est jamais affichée. `url` doit déjà être une adresse https sûre.
 */
export function LivePreview({ url, title, poster, auto, label, note }: { url: string; title: string; poster: ReactNode; auto: boolean; label: string; note: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [scale, setScale] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Même origine que la page : le sandbox ne protégerait plus rien. Mesuré au navigateur (la page ne connaît pas son propre domaine au rendu).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- garde d'hydratation : l'origine de la page n'est connue qu'au navigateur
    setBlocked(isSameOrigin(url, window.location.origin));
  }, [url]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Navigateur sans observateurs : l'affiche reste, le lien « Ouvrir le site » de la carte suffit ; la page ne doit jamais planter pour un aperçu.
    if (typeof ResizeObserver === "undefined" || typeof IntersectionObserver === "undefined") return;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / WIDTH));
    resize.observe(el);
    // Mode « économie de données » : jamais de chargement automatique d'un site tiers.
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (!auto || saveData) return () => resize.disconnect();
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setOn(true);
        seen.disconnect();
      },
      { rootMargin: PREVIEW_ROOT_MARGIN },
    );
    seen.observe(el);
    return () => {
      resize.disconnect();
      seen.disconnect();
    };
  }, [auto]);

  if (blocked) return <div className="relative size-full overflow-hidden">{poster}</div>;
  return (
    <div ref={box} className="relative size-full overflow-hidden">
      {/* L'affiche reste en dessous : tant que le site n'a pas répondu (lent, en panne), la carte n'est jamais un rectangle vide. */}
      {poster}
      {on && (
        <iframe
          src={url}
          title={`Aperçu en direct : ${title}`}
          sandbox={PREVIEW_SANDBOX}
          allow=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          // Aperçu automatique : non interactif (le doigt qui fait défiler la page n'est pas capté par le site réduit) et hors de l'ordre de tabulation ;
          // après un clic sur « Voir en direct », le visiteur l'a choisi : il est interactif.
          tabIndex={clicked ? undefined : -1}
          style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})`, visibility: scale > 0 && loaded ? "visible" : "hidden", pointerEvents: clicked ? "auto" : "none" }}
          className="absolute left-0 top-0 origin-top-left border-0 bg-card"
        />
      )}
      {!on && !auto && (
        <button
          type="button"
          onClick={() => {
            setClicked(true);
            setOn(true);
          }}
          className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px] transition hover:bg-background/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
        >
          <span className="inline-flex min-h-11 items-center gap-2 rounded-md border bg-primary px-5 py-2 font-semibold text-primary-foreground shadow-hard">
            <Play size={16} aria-hidden="true" />
            {label}
            <span className="sr-only"> : {title}</span>
          </span>
          {/* Le clic envoie l'adresse IP du visiteur au site affiché : on le dit à côté du bouton. */}
          <span className="absolute inset-x-0 bottom-2 text-center text-xs font-medium text-foreground">{note}</span>
        </button>
      )}
    </div>
  );
}
