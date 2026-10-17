"use client";

import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";

import { addStoryWithTasks, type StoryFormState } from "@/app/(app)/missions/story-actions";
import { proposeStories } from "@/app/(app)/missions/proposal-actions";
import { StoryForm } from "@/components/story-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRIEF_MAX, type Proposal } from "@/lib/domain/story-proposals";
import { TASK_TITLE_MAX } from "@/lib/domain/tasks";
import { storySentence } from "@/lib/domain/user-stories";
import { formatDate } from "@/lib/format";

export type LinkedNote = { id: string; title: string; created_at: string };

type Item = Proposal & { key: number };

type TaskRow = { id: number; text: string };

/** Les tâches proposées avec une story : chacune se modifie ou se retire avant de garder (l'ajout d'une tâche à la main se fait ensuite, dans la story). */
function TaskEditor({
  idPrefix,
  storyTitle,
  tasks,
  disabled,
  onChange,
  onRemoved,
}: {
  idPrefix: string;
  storyTitle: string;
  tasks: TaskRow[];
  /** Un « Garder » est en vol : les tâches ne bougent plus (la liste envoyée est celle du clic). */
  disabled: boolean;
  onChange: (next: TaskRow[]) => void;
  onRemoved: () => void;
}) {
  if (tasks.length === 0) return null;
  // Retirer une tâche emporte le bouton qui avait le focus : il va à la tâche voisine, ou à la carte s'il n'en reste aucune.
  const remove = (index: number) => {
    const next = tasks.filter((_, i) => i !== index);
    onChange(next);
    onRemoved();
    requestAnimationFrame(() => {
      const target = next[index] ?? next[index - 1];
      document.getElementById(target ? `${idPrefix}-task-${target.id}` : `${idPrefix}-card`)?.focus();
    });
  };
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold">{tasks.length > 1 ? `${tasks.length} tâches proposées` : "1 tâche proposée"}</p>
      <ol className="flex flex-col gap-1">
        {tasks.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-task-${t.id}`}
              aria-label={`Tâche ${i + 1} de la proposition ${storyTitle}`}
              value={t.text}
              disabled={disabled}
              maxLength={TASK_TITLE_MAX}
              onChange={(e) => onChange(tasks.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)))}
            />
            <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Retirer la tâche ${i + 1} de la proposition ${storyTitle}`} onClick={() => remove(i)}>
              <X size={16} aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Une proposition gardée telle quelle avec ses tâches : même ajout qu'à la main (mêmes règles, dernière place du backlog), tout ou rien ; la proposition disparaît quand c'est enregistré. */
function KeepButton({ missionId, proposal, tasks, onBusy, onKept }: { missionId: string; proposal: Proposal; tasks: string[]; onBusy: (busy: boolean) => void; onKept: (notice?: string) => void }) {
  // Les erreurs de champ (titre trop long…) sont dites avec le message : « Modifier » permet de les corriger. Le message s'efface dès qu'une tâche change.
  const stamp = tasks.join("\u0000");
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const [state, action, pending] = useActionState<StoryFormState, FormData>(async (prev, formData) => {
    setErrorFor(stamp);
    const result = await addStoryWithTasks(missionId, tasks, prev, formData);
    if (result.ok) onKept(result.notice);
    return result;
  }, {});
  // `pending` est immédiat ; un changement d'état fait dans l'action n'apparaît qu'à sa fin. Le nettoyage rend aussi l'état quand la carte disparaît pendant l'envoi.
  useEffect(() => {
    if (!pending) return;
    onBusy(true);
    return () => onBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seul `pending` déclenche ; onBusy change d'identité à chaque rendu
  }, [pending]);
  return (
    <form action={action} className="contents">
      <input type="hidden" name="title" value={proposal.title} />
      <input type="hidden" name="role" value={proposal.role ?? ""} />
      <input type="hidden" name="benefit" value={proposal.benefit ?? ""} />
      <input type="hidden" name="acceptance_criteria" value={proposal.acceptance_criteria ?? ""} />
      <input type="hidden" name="points" value={proposal.points === null ? "" : String(proposal.points)} />
      <input type="hidden" name="status" value="todo" />
      <input type="hidden" name="source_note_id" value={proposal.source_note_id ?? ""} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Ajout…" : "Garder"}
        <span className="sr-only"> la proposition {proposal.title}</span>
      </Button>
      {errorFor === stamp && (state.message || state.errors) && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {state.message ?? `${Object.values(state.errors ?? {})[0]} Utilise « Modifier » pour corriger.`}
        </p>
      )}
    </form>
  );
}

function ProposalCard({
  missionId,
  item,
  noteTitle,
  onDone,
  onBusy,
  onNotice,
}: {
  missionId: string;
  item: Item;
  noteTitle: string | null;
  onDone: (kind: "kept" | "rejected", taskCount: number, notice?: string) => void;
  /** Un « Garder » est en vol (la carte, et la génération, ne doivent plus bouger). */
  onBusy: (busy: boolean) => void;
  onNotice: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const idPrefix = `proposal-${item.key}`;
  const busyNow = (b: boolean) => {
    setBusy(b);
    onBusy(b);
  };
  const [rows, setRows] = useState<TaskRow[]>(() => item.tasks.map((text, id) => ({ id, text })));
  const tasks = rows.map((r) => r.text);
  const close = useCallback(() => setEditing(false), []);
  if (editing) {
    return (
      <li id={`${idPrefix}-card`} tabIndex={-1} className="flex flex-col gap-3 outline-none">
        <TaskEditor idPrefix={idPrefix} storyTitle={item.title} tasks={rows} disabled={busy} onChange={setRows} onRemoved={() => onNotice("Tâche retirée.")} />
        <StoryForm
          idPrefix={idPrefix}
          action={async (prev, formData) => {
            // La note d'origine suit la proposition modifiée.
            formData.set("source_note_id", item.source_note_id ?? "");
            const result = await addStoryWithTasks(missionId, tasks, prev, formData);
            if (result.ok) onDone("kept", tasks.length, result.notice);
            return result;
          }}
          initial={{
            title: item.title,
            role: item.role ?? "",
            benefit: item.benefit ?? "",
            acceptance_criteria: item.acceptance_criteria ?? "",
            points: item.points === null ? "" : String(item.points),
            status: "todo",
          }}
          submitLabel="Ajouter la user story"
          onDone={close}
          onCancel={close}
        />
      </li>
    );
  }
  return (
    <li id={`${idPrefix}-card`} tabIndex={-1} className="flex flex-col gap-2 rounded-md border bg-card p-3 outline-none">
      <p className="break-words font-semibold">{storySentence(item)}</p>
      {item.acceptance_criteria && <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{item.acceptance_criteria}</p>}
      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
        {item.points !== null && <span>{item.points} pts</span>}
        {item.source_note_id && noteTitle && (
          <span>
            Source :{" "}
            <Link href={`/notes/${item.source_note_id}`} className="text-primary underline underline-offset-4">
              {noteTitle}
            </Link>
          </span>
        )}
      </p>
      <TaskEditor idPrefix={idPrefix} storyTitle={item.title} tasks={rows} disabled={busy} onChange={setRows} onRemoved={() => onNotice("Tâche retirée.")} />
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-filet pt-3">
        <Button type="button" variant="outline" size="sm" className="text-destructive" disabled={busy} onClick={() => onDone("rejected", 0)}>
          Rejeter<span className="sr-only"> la proposition {item.title}</span>
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(true)}>
          Modifier<span className="sr-only"> la proposition {item.title}</span>
        </Button>
        <KeepButton missionId={missionId} proposal={item} tasks={tasks} onBusy={busyNow} onKept={(notice) => onDone("kept", tasks.length, notice)} />
      </div>
    </li>
  );
}

/**
 * Panneau « Proposer des user stories avec l'IA » : brief et notes liées au client en entrée, propositions à relire en sortie.
 * Rien n'est enregistré tant qu'une proposition n'est pas gardée ; fermer le panneau les oublie, le brief n'est stocké nulle part.
 */
export function StoryProposals({ missionId, notes }: { missionId: string; notes: LinkedNote[] }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<Item[]>([]);
  const [withTasks, setWithTasks] = useState(true);
  // Nombre de « Garder » en vol : relancer une génération viderait les cartes pendant qu'une story s'enregistre.
  const [keeping, setKeeping] = useState(0);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [announce, setAnnounce] = useState("");
  const openButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(false);
  const counter = useRef(0);
  // Numéro de la génération en cours : fermer ou annuler l'invalide, et son résultat, s'il arrive, est jeté (le serveur, lui, va au bout de l'appel).
  const run = useRef(0);
  const noteTitles = new Map(notes.map((n) => [n.id, n.title]));

  const closePanel = useCallback(() => {
    run.current++; // une génération en cours est abandonnée : son résultat ne remplira pas un panneau fermé
    setOpen(false);
    setItems([]);
    setInfo("");
    setError("");
    setAnnounce("");
  }, []);
  // Le focus va au brief à l'ouverture et revient au bouton d'ouverture à la fermeture (le bouton n'existe qu'après le rendu : d'où l'effet).
  useEffect(() => {
    if (open) panel.current?.querySelector("textarea")?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
  }, [open]);
  // Une proposition gardée ou rejetée emporte le bouton qui avait le focus : il va au titre du panneau, et l'issue est annoncée.
  const done = useCallback((key: number, kind: "kept" | "rejected", taskCount: number, notice?: string) => {
    setItems((all) => all.filter((i) => i.key !== key));
    setAnnounce(
      notice ?? (kind === "kept" ? (taskCount > 0 ? `Proposition ajoutée au backlog avec ${taskCount} tâche${taskCount > 1 ? "s" : ""}.` : "Proposition ajoutée au backlog.") : "Proposition rejetée."),
    );
    heading.current?.focus();
  }, []);

  const generate = () => {
    if (pending || keeping > 0) return;
    setError("");
    setInfo("");
    setItems([]);
    setAnnounce("");
    const mine = ++run.current;
    startTransition(async () => {
      try {
        const result = await proposeStories(missionId, brief, [...checked], withTasks);
        if (mine !== run.current) return; // annulé ou fermé entre-temps
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setItems(result.proposals.map((p) => ({ ...p, key: counter.current++ })));
        const remarks = [
          result.dropped ? `${result.dropped} proposition${result.dropped > 1 ? "s écartées" : " écartée"} (invalide, doublon d'un titre du backlog, ou chiffre absent de tes sources).` : "",
          result.droppedTasks ? `${result.droppedTasks} tâche${result.droppedTasks > 1 ? "s écartées" : " écartée"} (invalide, doublon, au-delà de 6, ou chiffre absent de tes sources).` : "",
          result.cut ? `${result.cut} note${result.cut > 1 ? "s n'ont" : " n'a"} pas été envoyée${result.cut > 1 ? "s" : ""} : trop de texte.` : "",
        ].filter(Boolean);
        setInfo(remarks.join(" "));
      } catch (e) {
        if (mine !== run.current) return;
        if (typeof e === "object" && e !== null && String((e as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT")) throw e;
        setError("Le serveur ne répond pas. Réessaie dans un instant.");
      }
    });
  };

  if (!open) {
    return (
      <Button ref={openButton} type="button" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <Sparkles aria-hidden="true" />
        Proposer des user stories avec l&apos;IA
      </Button>
    );
  }

  return (
    <div
      ref={panel}
      role="group"
      aria-labelledby="proposals-title"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Échap dans un champ (brief, formulaire d'une proposition) ne doit pas faire perdre la saisie et les propositions : seuls « Fermer » et la croix ferment alors.
        if ((e.target as HTMLElement).closest("textarea, input, select, form")) return;
        e.preventDefault(); // le panneau prend la touche : l'assistant reste ouvert
        closePanel();
      }}
      className="flex max-w-3xl flex-col gap-4 rounded-md border border-primary/30 bg-primary/10 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id="proposals-title" ref={heading} tabIndex={-1} className="flex items-center gap-2 font-semibold outline-none">
          <Sparkles size={16} aria-hidden="true" />
          Proposer des user stories avec l&apos;IA
        </h3>
        <Button type="button" variant="ghost" size="icon" onClick={closePanel} aria-label={pending ? "Annuler et fermer le panneau" : "Fermer le panneau"}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="proposal-brief">Brief du client (facultatif si tu coches des notes)</Label>
        <Textarea id="proposal-brief" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={BRIEF_MAX} placeholder="Colle ici ce que le client attend : contexte, besoins, contraintes…" />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Notes liées à ce client que l&apos;IA peut lire</legend>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune note liée à cette fiche. Lie une note à ce client depuis son éditeur pour pouvoir la proposer ici.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {notes.map((n) => (
              <li key={n.id}>
                <label className="flex min-h-9 items-center gap-2 text-sm max-md:min-h-11">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={checked.has(n.id)}
                    onChange={(e) =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(n.id);
                        else next.delete(n.id);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 break-words">
                    {n.title} <span className="font-mono text-xs text-muted-foreground">{formatDate(n.created_at.slice(0, 10))}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <label className="flex min-h-9 items-center gap-2 text-sm max-md:min-h-11">
        <input type="checkbox" className="size-4" checked={withTasks} disabled={pending} onChange={(e) => setWithTasks(e.target.checked)} />
        Avec leurs tâches (jusqu&apos;à 6 par user story)
      </label>
      <p className="text-xs text-muted-foreground">Ton brief et les notes cochées sont envoyés à Anthropic pour générer les propositions. N&apos;y mets pas de données réelles de clients. Rien n&apos;est enregistré tant que tu ne gardes pas une proposition.</p>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={generate} disabled={pending || keeping > 0}>
          {pending ? "L'IA réfléchit…" : items.length ? "Proposer à nouveau" : "Proposer des user stories"}
        </Button>
        <button type="button" onClick={closePanel} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          {pending ? "Annuler" : "Fermer"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {pending ? "L'IA prépare des propositions, cela peut prendre une quinzaine de secondes. « Annuler » arrête l'attente (l'appel, lui, va au bout)." : announce || (items.length ? `${items.length} proposition${items.length > 1 ? "s" : ""} à relire.` : "")}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-muted-foreground">
          {info}
        </p>
      )}
      {items.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Propositions de l'IA">
          {items.map((item) => (
            <ProposalCard
              key={item.key}
              missionId={missionId}
              item={item}
              noteTitle={item.source_note_id ? (noteTitles.get(item.source_note_id) ?? null) : null}
              onDone={(kind, count, notice) => done(item.key, kind, count, notice)}
              onBusy={(b) => setKeeping((n) => Math.max(0, n + (b ? 1 : -1)))}
              onNotice={setAnnounce}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
