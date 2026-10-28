"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { setTaskDone } from "@/app/(app)/missions/task-actions";
import { checkTask } from "@/app/(app)/aujourd-hui/actions";
import { markDeadlineDone, reopenDeadline } from "@/app/(app)/calendrier/actions";
import { targetOf, type MissingLine, type TodayTask } from "@/lib/domain/cockpit/today";

const LINKS = {
  deadline: { href: "/calendrier", label: "Voir le calendrier" },
  invoice: { href: "/factures", label: "Voir les factures" },
  ceiling: { href: "/plafonds", label: "Voir les plafonds" },
  acre: { href: "/profil", label: "Voir le profil" },
  quote: { href: "/clients", label: "Voir la fiche" },
  "sprint-end": { href: "/missions", label: "Voir la mission" },
  "sprint-task": { href: "/missions", label: "Voir la mission" },
  pipeline: { href: "/missions", label: "Voir les missions" },
} as const;

export const ALL_DONE = "Bravo, tu as fait toutes tes tâches du jour.";

/** Tâches du jour (calculées côté serveur) : une case par tâche, motif visible, annonce aux lecteurs d'écran à chaque coche. */
export function TodayTasks({ tasks, overflow }: { tasks: TodayTask[]; overflow: { count: number; missionId: string } | null }) {
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const toggle = (t: TodayTask) => {
    if (pending) return; // pas de `disabled` : une case désactivée perd le focus clavier
    start(async () => {
      try {
        const done = !t.done;
        const r = t.kind === "deadline" ? await (done ? markDeadlineDone(t.id) : reopenDeadline(t.id)) : t.kind === "sprint-task" ? await setTaskDone(t.id, done) : await checkTask(targetOf(t)!, done);
        setError(r.message);
        if (!r.message) {
          const last = done && tasks.every((x) => x === t || x.done);
          setAnnounce(done ? `${t.title} : fait.${last ? ` ${ALL_DONE}` : ""}` : `${t.title} : à refaire.`);
        }
      } catch {
        setError("Opération impossible pour le moment. Rien n'a été modifié. Réessaie.");
      }
    });
  };

  const allDone = tasks.length > 0 && tasks.every((t) => t.done);
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">{announce}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {allDone && <p className="rounded-md border bg-card p-3 font-semibold">{ALL_DONE}</p>}
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={`${t.kind}-${t.id}`} className="flex flex-wrap items-center justify-between gap-x-3 rounded-md border bg-card">
            <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3 p-3">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={t.done} aria-busy={pending} onChange={() => toggle(t)} />
              <span className="flex flex-col">
                <span className={t.done ? "font-semibold line-through" : "font-semibold"}>{t.title}</span>
                <span className="text-sm text-muted-foreground">{t.reason.charAt(0).toUpperCase() + t.reason.slice(1)}</span>
                {t.context && <span className="text-sm text-muted-foreground">{t.context}</span>}
                {t.declared && <span className="text-sm text-muted-foreground">Calcul basé sur une donnée déclarée, non confirmée.</span>}
                {t.demo && <span className="text-sm font-semibold">DEMO, non officielle</span>}
              </span>
            </label>
            <Link href={t.kind === "quote" ? `/clients/${t.clientId}` : t.missionId ? `/missions/${t.missionId}` : LINKS[t.kind].href} className="flex min-h-11 items-center px-3 text-sm underline">
              {LINKS[t.kind].label}
            </Link>
          </li>
        ))}
      </ul>
      {overflow && (
        <p className="flex flex-wrap items-center justify-between gap-x-3 rounded-md border border-dashed bg-card">
          <span className="p-3 text-sm text-muted-foreground">{overflow.count} autre{overflow.count > 1 ? "s" : ""} tâche{overflow.count > 1 ? "s" : ""} dans ton sprint</span>
          <Link href={`/missions/${overflow.missionId}`} className="flex min-h-11 items-center px-3 text-sm underline">Voir la mission</Link>
        </p>
      )}
    </div>
  );
}

/** Lignes « paramètre manquant » : ce qui empêche une règle de produire une tâche, avec le lien pour le renseigner. */
export function MissingParameters({ lines }: { lines: MissingLine[] }) {
  if (!lines.length) return null;
  return (
    <ul className="flex flex-col gap-2" aria-label="Paramètres manquants">
      {lines.map((l) => (
        <li key={l.text} className="flex flex-wrap items-center justify-between gap-x-3 rounded-md border border-dashed bg-card">
          <p className="flex-1 p-3 text-sm text-muted-foreground">
            <span className="font-semibold">Paramètre manquant.</span> {l.text}
          </p>
          <Link href={l.link} className="flex min-h-11 items-center px-3 text-sm underline">
            {l.link === "/profil" ? "Voir le profil" : "Voir les règles"}
          </Link>
        </li>
      ))}
    </ul>
  );
}
