"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";

import { PortfolioImage } from "@/components/portfolio-image";

/**
 * Miniature d'une capture qui s'ouvre en grand (<dialog> natif : piège de focus, Échap et retour du focus sur la miniature).
 * L'image en grand n'est chargée qu'à l'ouverture. Le parent fixe la taille de la miniature (`relative`, 16/9).
 */
export function PortfolioImageZoom({ src, alt }: { src: string; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Agrandir la capture : ${alt}`}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <PortfolioImage src={src} alt={alt} sizes="(min-width: 1024px) 12vw, 30vw" />
      </button>
      <dialog
        ref={dialog}
        aria-label={alt}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Seul le fond (hors du cadre) ferme ; un clic sur l'image ne ferme pas.
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.currentTarget.close();
        }}
        className="visible m-auto w-[min(96rem,calc(100%-2rem))] rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg backdrop:bg-black/50"
      >
        <button
          type="button"
          autoFocus
          aria-label="Fermer l'aperçu"
          onClick={() => {
            setOpen(false);
            dialog.current?.close();
          }}
          className="mb-2 ml-auto flex size-11 items-center justify-center rounded-md border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <X size={20} aria-hidden="true" />
        </button>
        {open && (
          <div className="relative h-[75vh] w-full">
            <PortfolioImage src={src} alt={alt} sizes="96vw" contain />
          </div>
        )}
      </dialog>
    </>
  );
}
