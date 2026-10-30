"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { OVERLAY_MAX_ALPHA, OVERLAY_MIN_ALPHA, OVERLAY_RGB, playbackMode, type HeroVideo as HeroVideoFiles } from "@/lib/domain/hero-video";

type Connection = { saveData?: boolean; effectiveType?: string };

/** Après le chargement de la page et quand le navigateur est au repos : la vidéo ne concurrence jamais le premier affichage (LCP). */
function whenIdle(run: () => void): () => void {
  let cancelled = false;
  const go = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => !cancelled && run(), { timeout: 2000 });
    else setTimeout(() => !cancelled && run(), 200);
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", go);
  };
}

/**
 * Fond vidéo du hero : l'affiche (légère, chargée en priorité) est toujours là ; la vidéo muette en boucle ne se monte qu'ensuite, si rien ne s'y oppose
 * (mouvement réduit, économie de données, connexion lente, téléphone sans version allégée : l'affiche seule, aucun octet de vidéo). Elle se met en pause hors de l'écran,
 * onglet masqué, et avec le bouton de pause de l'en-tête. L'overlay sombre garantit le contraste du texte (voir `lib/domain/hero-video.ts`).
 * Décoratif : caché des lecteurs d'écran, jamais focalisable.
 */
export function HeroVideo({ files }: { files: HeroVideoFiles }) {
  const [mode, setMode] = useState<"none" | "desktop" | "mobile">("none");
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return whenIdle(() => {
      const connection = (navigator as Navigator & { connection?: Connection }).connection;
      const media = (query: string) => typeof window.matchMedia === "function" && window.matchMedia(query).matches;
      setMode(
        playbackMode({
          reducedMotion: media("(prefers-reduced-motion: reduce)"),
          saveData: connection?.saveData === true,
          effectiveType: connection?.effectiveType,
          narrow: media("(max-width: 767px)"),
          hasMobileSources: !!files.mobile,
        }),
      );
    });
  }, [files.mobile]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.muted = true; // l'attribut seul ne suffit pas à tous les navigateurs pour la lecture automatique
    const root = document.documentElement;
    let onScreen = true;
    const sync = () => {
      const wanted = onScreen && !document.hidden && root.dataset.motion !== "paused";
      if (wanted) void el.play().catch(() => undefined);
      else el.pause();
    };
    const seen = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => { onScreen = !!entry?.isIntersecting; sync(); }) : null;
    if (box.current) seen?.observe(box.current);
    const attrs = new MutationObserver(sync);
    attrs.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      seen?.disconnect();
      attrs.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [mode]);

  const sources = mode === "mobile" && files.mobile ? files.mobile : files;
  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[rgb(5,7,12)]">
      <Image src={files.poster} alt="" fill priority sizes="100vw" className="object-cover" />
      {mode !== "none" && (
        <video
          ref={video}
          // `key` : un changement de version (téléphone ↔ ordinateur) recharge les sources.
          key={mode}
          className="absolute inset-0 size-full object-cover"
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          tabIndex={-1}
          poster={files.poster}
          onError={() => setMode("none")}
        >
          <source src={sources.webm} type="video/webm" />
          <source src={sources.mp4} type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, rgba(${OVERLAY_RGB.join(",")},${OVERLAY_MIN_ALPHA}) 0%, rgba(${OVERLAY_RGB.join(",")},${OVERLAY_MIN_ALPHA + 0.04}) 55%, rgba(${OVERLAY_RGB.join(",")},${OVERLAY_MAX_ALPHA}) 100%)` }}
      />
    </div>
  );
}
