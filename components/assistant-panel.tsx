"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useAssistant } from "@/components/assistant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SENSE_QUERY_MAX } from "@/lib/domain/matching";

/** Panneau « Assistant » : non modal, après `main`, il réduit la largeur de la page sans la recouvrir (plein écran sous 1 024 px). */
export function AssistantPanel() {
  const a = useAssistant();
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  // À l'ouverture, le focus va au champ de saisie.
  useEffect(() => {
    if (a.isOpen) input.current?.focus();
  }, [a.isOpen]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [a.messages.length, a.pending, a.error]);

  if (!a.isOpen) return null;

  return (
    <aside
      aria-label="Assistant"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.nativeEvent.isComposing) a.closePanel();
      }}
      className="fixed inset-0 z-40 flex flex-col bg-background lg:sticky lg:top-0 lg:z-auto lg:h-svh lg:w-96 lg:shrink-0 lg:border-l"
    >
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="font-semibold">Assistant</h2>
        <Button variant="ghost" size="icon" aria-label="Fermer l'assistant" onClick={a.closePanel}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {a.messages.length === 0 && !a.pending && (
          <p className="text-sm text-muted-foreground">Pose une question : je te réponds à partir de tes notes indexées.</p>
        )}
        <ul className="flex flex-col gap-3">
          {a.messages.map((m) => (
            <li
              key={m.id}
              className={m.role === "user" ? "ml-6 self-end rounded-md bg-accent p-2 text-sm" : "mr-2 whitespace-pre-wrap break-words text-sm"}
            >
              <span className="sr-only">{m.role === "user" ? "Toi : " : "Assistant : "}</span>
              {m.text}
            </li>
          ))}
        </ul>
        <div role="status" className="mt-3 text-sm text-muted-foreground">
          {a.pending ? "Recherche dans tes notes…" : !a.error && a.messages.at(-1)?.role === "assistant" ? "Réponse prête." : ""}
        </div>
        {a.error && !a.pending && (
          <div role="alert" className="mt-3 flex flex-col items-start gap-2 text-sm">
            <p className="text-destructive">{a.error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void a.retry()}>
              Réessayer
            </Button>
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        className="flex flex-col gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void a.ask(a.draft);
        }}
      >
        <Label htmlFor="assistant-question">Ta question</Label>
        <p id="assistant-hint" className="text-xs text-muted-foreground">
          Chaque question est traitée seule, sans la conversation précédente. Elle part chez Mistral AI et Anthropic :
          pas de données réelles de clients.
        </p>
        <Input
          id="assistant-question"
          ref={input}
          value={a.draft}
          onChange={(e) => a.setDraft(e.target.value)}
          maxLength={SENSE_QUERY_MAX}
          autoComplete="off"
          aria-describedby="assistant-hint"
        />
        <Button type="submit" disabled={a.pending || !a.draft.trim()}>
          Envoyer
        </Button>
      </form>
    </aside>
  );
}
