"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Pause des animations en boucle de la page (WCAG 2.2.2) : bandeau d'outils, schéma du hero, formes flottantes. S'ajoute à « réduire les animations » du système. */
export function MotionToggle() {
  const [paused, setPaused] = useState(false);
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    if (next) document.documentElement.dataset.motion = "paused";
    else delete document.documentElement.dataset.motion;
  };
  const label = paused ? "Reprendre les animations" : "Mettre en pause les animations";
  return (
    <Button type="button" variant="ghost" size="icon" aria-pressed={paused} aria-label={label} title={label} onClick={toggle}>
      {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </Button>
  );
}
