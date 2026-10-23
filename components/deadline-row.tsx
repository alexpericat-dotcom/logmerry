"use client";

import { CalendarCheck, CircleDashed, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { deleteDeadline, markDeadlineDone, reopenDeadline, updateDeadline, type DeadlineFormState } from "@/app/(app)/calendrier/actions";
import { DeadlineForm } from "@/components/deadline-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { DEADLINE_CATEGORY_LABELS, deadlineWhen } from "@/lib/domain/deadlines";
import { isOfficialLink } from "@/lib/domain/finance/rules";
import { formatDate, formatDateTime } from "@/lib/format";

export function DeadlineRow({ deadline, today, sectionId, onChanged }: { deadline: DeadlineRecord; today: string; sectionId: string; onChanged: (message: string, sectionId: string) => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [message, setMessage] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const done = deadline.done_at !== null;
  const late = !done && deadline.due_on < today;
  const panelRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const wasDeleting = useRef(false);

  const back = useCallback(() => {
    setMode("view");
    setMessage(undefined);
  }, []);
  // L'enregistrement est annoncé ICI, juste après la réponse du serveur, et non par le formulaire : si la ligne change de section (nouvelle date),
  // la ligne et son formulaire disparaissent avant que celui-ci puisse prévenir. Le titre de section, lui, est toujours là pour recevoir le focus.
  const update = useCallback(
    async (prev: DeadlineFormState, formData: FormData) => {
      const result = await updateDeadline(deadline.id, prev, formData);
      if (result.saved) onChanged(`Échéance ${String(formData.get("title") ?? deadline.title).trim()} enregistrée.`, sectionId);
      return result;
    },
    [deadline.id, deadline.title, onChanged, sectionId],
  );

  // Le focus suit le panneau : sur « Annuler » (le choix sûr) à l'ouverture, sur la rangée d'actions à la fermeture.
  useEffect(() => {
    if (mode === "delete") [...(panelRef.current?.querySelectorAll<HTMLElement>("button") ?? [])].at(-1)?.focus();
    else if (wasDeleting.current) actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
    wasDeleting.current = mode === "delete";
  }, [mode]);

  // Marquer faite, rouvrir, modifier et supprimer déplacent ou retirent la ligne : c'est le parent qui annonce et rend le focus (sur le titre de la section).
  const run = (fn: () => Promise<{ message?: string }>, announce: string) =>
    start(async () => {
      try {
        const r = await fn();
        setMessage(r.message);
        if (!r.message) onChanged(announce, sectionId);
      } catch {
        setMessage("Opération impossible pour le moment. Rien n'a été modifié. Réessaie.");
      }
    });

  if (mode === "edit") {
    return (
      <li>
        <DeadlineForm
          idPrefix={`edit-${deadline.id}`}
          action={update}
          initial={{ title: deadline.title, due_on: deadline.due_on, category: deadline.category, source: deadline.source, note: deadline.note ?? "" }}
          submitLabel="Enregistrer"
          onDone={back}
          onCancel={back}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={done ? "font-semibold line-through" : "font-semibold"}>{deadline.title}</span>
        <Badge variant="outline">{DEADLINE_CATEGORY_LABELS[deadline.category]}</Badge>
        {done ? (
          <Badge variant="success">
            <CalendarCheck size={11} aria-hidden="true" />
            Faite
          </Badge>
        ) : late ? (
          <Badge variant="warning">
            <TriangleAlert size={11} aria-hidden="true" />
            En retard
          </Badge>
        ) : (
          <Badge variant="outline">
            <CircleDashed size={11} aria-hidden="true" />À faire
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Échéance le <span className="font-mono tabular-nums">{formatDate(deadline.due_on)}</span>
        {!done && <strong className="text-foreground">{` · ${deadlineWhen(deadline.due_on, today)}`}</strong>}
        {done && deadline.done_at && ` · faite le ${formatDateTime(deadline.done_at)}`}
      </p>
      <p className="break-all text-sm">
        Source :{" "}
        {isOfficialLink(deadline.source) ? (
          <a href={deadline.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            {deadline.source}
          </a>
        ) : (
          deadline.source
        )}
      </p>
      {deadline.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{deadline.note}</p>}
      {mode === "view" && (
        <div ref={actionsRef} className="flex flex-wrap gap-2">
          {done ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => reopenDeadline(deadline.id), `Échéance ${deadline.title} rouverte.`)}>
              Rouvrir<span className="sr-only"> l&apos;échéance {deadline.title}</span>
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={pending} onClick={() => run(() => markDeadlineDone(deadline.id), `Échéance ${deadline.title} marquée faite.`)}>
              {pending ? "…" : "Marquer faite"}
              <span className="sr-only"> l&apos;échéance {deadline.title}</span>
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
            Modifier<span className="sr-only"> l&apos;échéance {deadline.title}</span>
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setMode("delete")}>
            Supprimer<span className="sr-only"> l&apos;échéance {deadline.title}</span>
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div
          ref={panelRef}
          role="group"
          aria-label={`Supprimer l'échéance ${deadline.title}`}
          onKeyDown={(ev) => {
            if (ev.key !== "Escape" || pending) return;
            ev.preventDefault();
            back();
          }}
          className="flex max-w-2xl flex-col gap-3 rounded-md border border-destructive p-3"
        >
          <p className="font-semibold">Supprimer cette échéance ?</p>
          <p className="text-sm text-muted-foreground">Cette action est définitive.</p>
          <div className="flex gap-3">
            <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteDeadline(deadline.id), `Échéance ${deadline.title} supprimée.`)}>
              {pending ? "…" : "Supprimer"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={back}>
              Annuler
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </li>
  );
}
