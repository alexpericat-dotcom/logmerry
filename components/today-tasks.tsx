"use client";

import { ChevronRight, FlaskConical, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { setTaskDone } from "@/app/(app)/missions/task-actions";
import { checkTask } from "@/app/(app)/aujourd-hui/actions";
import { Badge } from "@/components/ui/badge";
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
          const last = done && !overflow && tasks.every((x) => x === t || x.done);
          setAnnounce(done ? `${t.title} : fait.${last ? ` ${ALL_DONE}` : ""}` : `${t.title} : à refaire.`);
        }
      } catch {
        setError("Opération impossible pour le moment. Rien n'a été modifié. Réessaie.");
      }
    });
  };

  const allDone = tasks.length > 0 && !overflow && tasks.every((t) => t.done); // des tâches de sprint cachées restent à faire
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">{announce}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {allDone && <p className="rounded-md border bg-card p-3 font-semibold">{ALL_DONE}</p>}
      <ul className="flex flex-col gap-1.5">
        {tasks.map((t) => (
          <li key={`${t.kind}-${t.id}`} className="flex items-center justify-between gap-x-2 rounded-md border bg-card">
            <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-2 px-3 py-1.5">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={t.done} aria-busy={pending} onChange={() => toggle(t)} />
              <span className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={t.done ? "text-sm font-semibold line-through" : "text-sm font-semibold"}>{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.reason.charAt(0).toUpperCase() + t.reason.slice(1)}</span>
                  {t.declared && (
                    <Badge variant="warning" title="Calcul basé sur une donnée déclarée, non confirmée">
                      <TriangleAlert size={11} aria-hidden="true" />
                      À confirmer<span className="sr-only"> : calcul basé sur une donnée déclarée, non confirmée</span>
                    </Badge>
                  )}
                  {t.demo && (
                    <Badge variant="secondary" title="DEMO, non officielle">
                      <FlaskConical size={11} aria-hidden="true" />
                      DEMO<span className="sr-only">, non officielle</span>
                    </Badge>
                  )}
                </span>
                {t.context && <span className="text-xs text-muted-foreground">{t.context}</span>}
              </span>
            </label>
            <Link
              href={t.kind === "quote" ? `/clients/${t.clientId}` : t.missionId ? `/missions/${t.missionId}` : LINKS[t.kind].href}
              aria-label={`${LINKS[t.kind].label} : ${t.title}`}
              className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {overflow && (
        <p className="flex items-center justify-between gap-x-2 rounded-md border border-dashed bg-card">
          <span className="p-3 text-sm text-muted-foreground">{overflow.count} autre{overflow.count > 1 ? "s" : ""} tâche{overflow.count > 1 ? "s" : ""} dans ton sprint</span>
          <Link href={`/missions/${overflow.missionId}`} aria-label="Voir la mission" className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground">
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </p>
      )}
    </div>
  );
}

/** « Paramètre manquant » : une seule ligne repliée (N manquants), le détail et le lien de chacun à l'ouverture. Jamais une tâche. */
export function MissingParameters({ lines }: { lines: MissingLine[] }) {
  if (!lines.length) return null;
  return (
    <details className="rounded-md border border-dashed bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 p-3 text-sm">
        <TriangleAlert size={16} aria-hidden="true" />
        <span className="font-semibold">
          {lines.length} paramètre{lines.length > 1 ? "s" : ""} manquant{lines.length > 1 ? "s" : ""}
        </span>
      </summary>
      <ul aria-label="Paramètres manquants" className="flex flex-col border-t">
        {lines.map((l) => (
          <li key={l.text} className="flex items-center justify-between gap-x-2">
            <p className="flex-1 p-3 text-sm text-muted-foreground">{l.text}</p>
            <Link href={l.link} aria-label={l.link === "/profil" ? "Voir le profil" : "Voir les règles"} className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
