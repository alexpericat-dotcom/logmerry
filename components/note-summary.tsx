"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { summarizeNote } from "@/app/(app)/notes/summary-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toBullets } from "@/lib/domain/summary";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string } | { kind: "done"; summary: string };

/** « Résumer » : résumé généré de la version enregistrée de la note ; jamais enregistré, « Régénérer » et « Ignorer ». */
export function NoteSummary({ id, title }: { id: string; title: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const result = useRef<HTMLDivElement>(null);
  const summarize = useRef<HTMLButtonElement>(null);
  const hadResult = useRef(false);

  // Le bouton « Résumer » disparaît au résultat : le focus passe au résultat, puis revient au bouton après « Ignorer ».
  useEffect(() => {
    if (state.kind === "done") result.current?.focus();
    else if (hadResult.current && state.kind === "idle") summarize.current?.focus();
    hadResult.current = state.kind === "done";
  }, [state.kind]);

  const run = async () => {
    setState({ kind: "busy" });
    try {
      const r = await summarizeNote(id);
      setState(r.ok ? { kind: "done", summary: r.summary } : { kind: "error", message: r.error });
    } catch {
      setState({ kind: "error", message: "Résumé impossible pour le moment. Réessaie." });
    }
  };

  return (
    <section aria-label="Résumé de la note" className="flex max-w-2xl flex-col items-start gap-3">
      {state.kind !== "done" && (
        <Button ref={summarize} type="button" variant="outline" disabled={state.kind === "busy"} onClick={() => void run()}>
          <Sparkles size={16} aria-hidden="true" className="mr-2" />
          {state.kind === "busy" ? "Résumé en cours…" : state.kind === "error" ? "Réessayer le résumé" : "Résumer"}
        </Button>
      )}
      {state.kind !== "done" && (
        <p className="text-xs text-muted-foreground">
          Le texte enregistré de la note est envoyé à Anthropic pour être résumé : pas de données réelles de clients.
        </p>
      )}
      <div role="status" className="w-full text-sm">
        {state.kind === "error" && <p className="text-destructive">{state.message}</p>}
        {state.kind === "done" && (
          <div ref={result} tabIndex={-1} className="flex flex-col gap-2 rounded-md border bg-card p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <span className="sr-only">Résumé généré.</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Sparkles size={12} aria-hidden="true" />
                Résumé généré
              </Badge>
              <span className="text-xs text-muted-foreground">de la version enregistrée de la note, non enregistré</span>
            </div>
            <Summary text={state.summary} />
            <p>
              Note source :{" "}
              <Link href={`/notes/${id}`} className="underline underline-offset-4">
                {title}
              </Link>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void run()}>
                Régénérer
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setState({ kind: "idle" })}>
                Ignorer
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Les puces du résumé en vraie liste ; un texte qui n'est pas une liste (une phrase) reste un paragraphe. */
function Summary({ text }: { text: string }) {
  const bullets = toBullets(text);
  if (!bullets) return <p className="whitespace-pre-wrap break-words">{text}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {bullets.map((b, i) => (
        <li key={i} className="break-words">
          {b}
        </li>
      ))}
    </ul>
  );
}
