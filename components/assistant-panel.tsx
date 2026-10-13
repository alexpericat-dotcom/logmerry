"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { AssistantDraftButton } from "@/components/assistant-draft-button";
import { useAssistant } from "@/components/assistant-provider";
import { AssistantSources } from "@/components/assistant-sources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isRefusal } from "@/lib/domain/chat-flow";
import { SENSE_QUERY_MAX } from "@/lib/domain/matching";

/** Panneau « Assistant » : non modal, après `main`, il réduit la largeur de la page sans la recouvrir (plein écran sous 1 024 px). */
export function AssistantPanel() {
  const a = useAssistant();
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const last = a.messages.at(-1);
  const lastAnswer = last?.role === "assistant" ? last : null;

  // À l'ouverture, le focus va au champ de saisie.
  useEffect(() => {
    if (a.isOpen) input.current?.focus();
  }, [a.isOpen]);

  // Échap ferme le panneau de partout, après les niveaux plus hauts : la palette ⌘K (<dialog> ouvert, elle se ferme d'abord)
  // ou un élément qui a déjà pris la touche (`preventDefault`). Jamais pendant une composition IME.
  const { isOpen, closePanel } = a;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing || e.defaultPrevented || document.querySelector("dialog[open]")) return;
      closePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closePanel]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [a.messages.length, a.pending, a.error]);

  if (!a.isOpen) return null;

  return (
    <aside
      aria-label="Assistant"
      className="fixed inset-0 z-40 flex flex-col bg-background lg:sticky lg:top-0 lg:z-auto lg:h-svh lg:w-96 lg:shrink-0 lg:border-l"
    >
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="font-semibold">Assistant</h2>
        <Button variant="ghost" size="icon" aria-label="Fermer l'assistant" onClick={a.closePanel}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {a.historyFailed && (
          <p role="status" className="mb-3 text-sm text-destructive">
            Ton historique n&apos;a pas pu être chargé. Recharge la page pour réessayer.
          </p>
        )}
        {a.messages.length === 0 && !a.pending && (
          <p className="text-sm text-muted-foreground">Pose une question : je te réponds à partir de tes notes indexées.</p>
        )}
        <ul className="flex flex-col gap-3">
          {a.messages.map((m, i) => {
            // Refus de l'assistant (reconnu à son texte, aussi après un rechargement) : la question est le message qui précède.
            const previous = a.messages[i - 1];
            const refusedQuestion = m.role === "assistant" && isRefusal(m.text) && previous?.role === "user" ? previous.text : null;
            return (
              <li
                key={m.id}
                className={m.role === "user" ? "ml-6 self-end rounded-md bg-accent p-2 text-sm" : "mr-2 break-words text-sm"}
              >
                <span className="sr-only">{m.role === "user" ? "Toi : " : "Assistant : "}</span>
                <span className="whitespace-pre-wrap">{m.text}</span>
                {m.sources && <AssistantSources sources={m.sources} />}
                {refusedQuestion && <AssistantDraftButton question={refusedQuestion} />}
              </li>
            );
          })}
        </ul>
        <div role="status" className="mt-3 text-sm text-muted-foreground">
          {a.pending ? "Recherche dans tes notes…" : !a.error && lastAnswer ? `Réponse prête${lastAnswer.sources?.length ? `, ${lastAnswer.sources.length} source${lastAnswer.sources.length > 1 ? "s" : ""}` : ""}.` : ""}
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
