"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { sourceState, type StoredSource } from "@/lib/domain/history";

/** Sources d'une réponse : liste compacte « Sources » ; le titre est le lien vers la note, « Extrait » déplie le texte relu en base avec « Copier ». */
export function AssistantSources({ sources }: { sources: StoredSource[] }) {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async (text: string, n: number) => {
    let message: string;
    try {
      await navigator.clipboard.writeText(text);
      message = `Texte de la source ${n} copié.`;
    } catch {
      message = "Copie impossible.";
    }
    setStatus(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(""), 4000); // le message ne reste pas affiché
  };

  if (!sources.length) return null;
  return (
    <div className="mt-2 text-xs">
      <ol aria-label="Sources" className="flex flex-col gap-1">
        {sources.map((s, i) => {
          const state = sourceState(s);
          if (state === "deleted") {
            return (
              <li key={s.id} className="text-muted-foreground">
                Source {i + 1} : Source supprimée.
              </li>
            );
          }
          return (
            <li key={s.id}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono tabular-nums text-muted-foreground" aria-hidden="true">
                  {i + 1}
                </span>
                <Link href={`/notes/${s.noteId}`} className="min-w-0 break-words font-medium text-primary underline underline-offset-2">
                  <span className="sr-only">Source {i + 1} : </span>
                  {s.title ?? "Note sans titre"}
                </Link>
                {state === "changed" && <span className="text-muted-foreground">(extrait modifié depuis)</span>}
              </div>
              {state === "ok" && (
                <details className="ml-4 text-muted-foreground">
                  <summary className="cursor-pointer">Extrait</summary>
                  <p className="mt-1 whitespace-pre-wrap break-words">{s.content}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-1 h-7" onClick={() => void copy(s.content ?? "", i + 1)}>
                    Copier<span className="sr-only"> le texte de la source {i + 1}</span>
                  </Button>
                </details>
              )}
            </li>
          );
        })}
      </ol>
      <p role="status" className="mt-1 text-xs text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
