"use client";

import { useEffect, useState } from "react";

/**
 * Texte qui s'écrit au clavier, caractère par caractère, avec un curseur qui clignote (LogMerry « écrit en direct »).
 * Le texte complet est toujours présent : invisible pour réserver la place (pas de saut de mise en page) et pour les lecteurs d'écran ;
 * l'animation est ignorée (texte affiché d'un coup) si le système demande moins de mouvement.
 */
export function TypedText({ text, startDelay = 500 }: { text: string; startDelay?: number }) {
  const [count, setCount] = useState(0);
  const [caret, setCaret] = useState(true);

  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = setTimeout(() => {
        setCount(text.length);
        setCaret(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    const step = () => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        timer = setTimeout(() => setCaret(false), 1800); // le curseur s'éteint un peu après la fin
        return;
      }
      // Rythme humain : plus lent après une ponctuation, avec un léger aléa.
      const pause = /[.,:;]/.test(text[i - 1]) ? 220 : 28 + Math.random() * 40;
      timer = setTimeout(step, pause);
    };
    timer = setTimeout(step, startDelay);
    return () => clearTimeout(timer);
  }, [text, startDelay]);

  return (
    <span className="grid">
      <span className="invisible col-start-1 row-start-1">{text}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {text.slice(0, count)}
        {caret && <span className="typed-caret ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.2em] bg-current" />}
      </span>
    </span>
  );
}
