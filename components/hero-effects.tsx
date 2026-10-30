"use client";

import { useRef, type ReactNode } from "react";

/** Vrai seulement avec une souris ou un trackpad, et sans demande de « réduire les animations » : les effets de pointeur ne touchent ni le tactile ni ces préférences. */
const pointerEffectsAllowed = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches;

/** Léger effet 3D au survol (±6° au plus) : `transform` seulement, remis à plat dès que le pointeur sort. Décoratif. */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${className ?? ""}`}
      style={{ transformStyle: "preserve-3d" }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || !pointerEffectsAllowed()) return;
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return; // zone sans taille (masquée) : rien à calculer, jamais de NaN dans le style
        const x = (e.clientX - box.left) / box.width - 0.5;
        const y = (e.clientY - box.top) / box.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}

/** Effet magnétique léger : le bouton se déplace de 6 px au plus vers le pointeur. Un simple conteneur : le bouton garde son lien, son focus et son clavier. */
export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className="inline-block transition-transform duration-150 ease-out motion-reduce:transition-none"
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || !pointerEffectsAllowed()) return;
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
        const dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
        el.style.transform = `translate(${(dx * 6).toFixed(1)}px, ${(dy * 6).toFixed(1)}px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </span>
  );
}
