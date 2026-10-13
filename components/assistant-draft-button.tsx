"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { createDraftFromQuestion } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string } | { kind: "done"; id: string; title: string; existing: boolean };

/** « Créer une note à documenter plus tard » sous un refus de l'assistant : crée un brouillon vide titré d'après la question ; la conversation reste ouverte. */
export function AssistantDraftButton({ question }: { question: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const link = useRef<HTMLAnchorElement>(null);

  // Le bouton disparaît après la création : le focus passe au lien « Ouvrir la note » au lieu d'être perdu.
  useEffect(() => {
    if (state.kind === "done") link.current?.focus();
  }, [state.kind]);

  const create = async () => {
    setState({ kind: "busy" });
    try {
      const r = await createDraftFromQuestion(question);
      setState(r.ok ? { kind: "done", id: r.id, title: r.title, existing: r.existing } : { kind: "error", message: r.error });
    } catch {
      setState({ kind: "error", message: "Création impossible pour le moment. Réessaie." });
    }
  };

  return (
    <div className="mt-2 flex flex-col items-start gap-2 text-sm">
      {state.kind !== "done" && (
        <Button type="button" variant="outline" size="sm" disabled={state.kind === "busy"} onClick={() => void create()}>
          {state.kind === "busy" ? "Création…" : "Créer une note à documenter plus tard"}
        </Button>
      )}
      <div role="status">
        {state.kind === "error" && <p className="text-destructive">{state.message}</p>}
        {state.kind === "done" && (
          <p>
            {state.existing ? "Cette note à documenter existe déjà" : "Note à documenter créée"} : « {state.title} ».{" "}
            <Link ref={link} href={`/notes/${state.id}`} className="underline underline-offset-4">
              Ouvrir la note
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
