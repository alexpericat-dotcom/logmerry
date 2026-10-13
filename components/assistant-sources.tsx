"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { sourceState, type StoredSource } from "@/lib/domain/history";

/** Sources d'une réponse : liste numérotée « Sources » ; « Ouvrir » ouvre la note, « Copier le texte » copie l'extrait relu en base. */
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
    <div className="mt-2 text-sm">
      <ol aria-label="Sources" className="flex flex-col gap-2">
        {sources.map((s, i) => {
          const state = sourceState(s);
          if (state === "deleted") {
            return (
              <li key={s.id} className="rounded-md border p-2 text-muted-foreground">
                Source {i + 1} : Source supprimée.
              </li>
            );
          }
          return (
            <li key={s.id} className="rounded-md border p-2">
              <p className="break-words font-medium">
                Source {i + 1} : {s.title ?? "Note sans titre"}
              </p>
              {state === "ok" ? (
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Voir l&apos;extrait</summary>
                  <p className="mt-1 whitespace-pre-wrap break-words">{s.content}</p>
                </details>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Extrait modifié depuis.</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/notes/${s.noteId}`}>
                    Ouvrir<span className="sr-only"> la note « {s.title ?? "sans titre"} »</span>
                  </Link>
                </Button>
                {state === "ok" && (
                  <Button type="button" variant="outline" size="sm" onClick={() => void copy(s.content ?? "", i + 1)}>
                    Copier le texte<span className="sr-only"> de la source {i + 1}</span>
                  </Button>
                )}
              </div>
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
