"use client";

import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";

import { proposeTasks } from "@/app/(app)/missions/task-proposal-actions";
import { addTasks } from "@/app/(app)/missions/task-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import { HINT_MAX } from "@/lib/domain/task-proposals";

type Item = { key: number; title: string };

/** Garde des titres : renvoie le message d'erreur, ou `null` si c'est enregistré. */
type Keep = (keys: number[], titles: string[]) => Promise<string | null>;

function ProposalCard({ item, index, keep, onReject }: { item: Item; index: number; keep: Keep; onReject: () => void }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const save = (title: string) => {
    if (pending) return;
    startTransition(async () => {
      setError("");
      const message = await keep([item.key], [title]);
      if (message) setError(message);
    });
  };

  if (editing) {
    return (
      <li>
        <form
          className="flex flex-col gap-1"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation(); // la touche ferme la modification, pas le panneau
              setEditing(false);
            }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            save(String(new FormData(e.currentTarget).get("title") ?? ""));
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={inputId} className="sr-only">
              Titre de la tâche proposée {index + 1}
            </label>
            <Input id={inputId} name="title" defaultValue={item.title} maxLength={200} autoFocus className="min-w-0 flex-1" aria-invalid={error ? true : undefined} />
            <Button type="submit" size="sm" aria-disabled={pending}>
              {pending ? "Ajout…" : "Ajouter"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
        <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground" aria-hidden="true">
          {index + 1}
        </span>
        <p className="min-w-0 flex-1 basis-48 break-words text-sm">{item.title}</p>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onReject}>
            Rejeter<span className="sr-only"> la tâche {item.title}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Modifier<span className="sr-only"> la tâche {item.title}</span>
          </Button>
          <Button type="button" size="sm" aria-disabled={pending} onClick={() => save(item.title)}>
            {pending ? "Ajout…" : "Garder"}
            <span className="sr-only"> la tâche {item.title}</span>
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

/**
 * Panneau « Proposer des tâches avec l'IA » d'une user story : précision facultative en entrée, tâches ordonnées à relire en sortie.
 * Rien n'est enregistré tant qu'une tâche n'est pas gardée ; fermer le panneau les oublie, la précision n'est stockée nulle part.
 */
export function TaskProposals({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [pending, startTransition] = useTransition();
  const [keeping, startKeeping] = useTransition();
  const openButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(false);
  const counter = useRef(0);
  // Numéro de la génération en cours : fermer ou annuler l'invalide, et son résultat, s'il arrive, est jeté (le serveur, lui, va au bout de l'appel).
  const run = useRef(0);
  const titleId = useId();

  const closePanel = useCallback(() => {
    run.current++;
    setOpen(false);
    setItems([]);
    setInfo("");
    setError("");
    setAnnounce("");
  }, []);
  // Le focus va à la précision à l'ouverture et revient au bouton d'ouverture à la fermeture (le bouton n'existe qu'après le rendu : d'où l'effet).
  useEffect(() => {
    if (open) panel.current?.querySelector("textarea")?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const keep: Keep = async (keys, titles) => {
    try {
      const result = await addTasks(storyId, titles);
      if (result.error ?? result.message) {
        if (result.gone) router.refresh();
        return result.error ?? result.message ?? UNREACHABLE;
      }
      setItems((all) => all.filter((i) => !keys.includes(i.key)));
      setAnnounce(`${titles.length} tâche${titles.length > 1 ? "s ajoutées" : " ajoutée"}.`);
      heading.current?.focus(); // le bouton qui avait le focus a disparu avec sa proposition
      return null;
    } catch (e) {
      if (isRedirect(e)) throw e;
      return UNREACHABLE;
    }
  };
  const reject = (key: number) => {
    setItems((all) => all.filter((i) => i.key !== key));
    setAnnounce("Proposition rejetée.");
    heading.current?.focus();
  };

  const generate = () => {
    if (pending) return;
    setError("");
    setInfo("");
    setItems([]);
    setAnnounce("");
    const mine = ++run.current;
    startTransition(async () => {
      try {
        const result = await proposeTasks(storyId, hint);
        if (mine !== run.current) return; // annulé ou fermé entre-temps
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setItems(result.tasks.map((title) => ({ key: counter.current++, title })));
        setInfo(
          [
            result.duplicates ? `${result.duplicates} proposition${result.duplicates > 1 ? "s écartées" : " écartée"} (déjà dans la liste).` : "",
            result.dropped ? `${result.dropped} proposition${result.dropped > 1 ? "s écartées" : " écartée"} (invalide, ou chiffre absent de tes sources).` : "",
            result.noteCut ? "La note d'origine n'a pas été envoyée : trop de texte." : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      } catch (e) {
        if (mine !== run.current) return;
        if (isRedirect(e)) throw e;
        setError(UNREACHABLE);
      }
    });
  };

  if (!open) {
    return (
      <Button ref={openButton} type="button" variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Sparkles aria-hidden="true" />
        Proposer des tâches avec l&apos;IA
      </Button>
    );
  }

  return (
    <div
      ref={panel}
      role="group"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Échap dans un champ (précision, modification d'une proposition) ne doit pas faire perdre la saisie : seuls « Fermer » et la croix ferment alors.
        if ((e.target as HTMLElement).closest("textarea, input, select, form")) return;
        e.preventDefault();
        closePanel();
      }}
      className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/10 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 id={titleId} ref={heading} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold outline-none">
          <Sparkles size={16} aria-hidden="true" />
          Proposer des tâches avec l&apos;IA
        </h4>
        <Button type="button" variant="ghost" size="icon" className="max-md:size-11" onClick={closePanel} aria-label={pending ? "Annuler et fermer le panneau" : "Fermer le panneau"}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${titleId}-hint`}>Précision (facultatif)</Label>
        <Textarea id={`${titleId}-hint`} rows={3} value={hint} onChange={(e) => setHint(e.target.value)} maxLength={HINT_MAX} placeholder="Ce que l'IA doit savoir de plus : une contrainte, un outil, une étape à ne pas oublier…" />
      </div>
      <p className="text-xs text-muted-foreground">
        Le texte de la story, sa note d&apos;origine et ta précision sont envoyés à Anthropic pour générer les propositions. N&apos;y mets pas de données réelles de clients. Rien n&apos;est enregistré tant que tu ne gardes pas une tâche.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={generate} disabled={pending}>
          {pending ? "L'IA réfléchit…" : items.length ? "Proposer à nouveau" : "Proposer des tâches"}
        </Button>
        {items.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-disabled={keeping}
            onClick={() => {
              if (keeping) return;
              startKeeping(async () => {
                setError("");
                const message = await keep(
                  items.map((i) => i.key),
                  items.map((i) => i.title),
                );
                if (message) setError(message);
              });
            }}
          >
            {keeping ? "Ajout…" : `Tout garder (${items.length})`}
          </Button>
        )}
        <button type="button" onClick={closePanel} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          {pending ? "Annuler" : "Fermer"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {pending ? "L'IA prépare des tâches, cela peut prendre quelques secondes. « Annuler » arrête l'attente (l'appel, lui, va au bout)." : announce || (items.length ? `${items.length} tâche${items.length > 1 ? "s" : ""} à relire, dans l'ordre proposé.` : "")}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      {items.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Tâches proposées par l'IA">
          {items.map((item, i) => (
            <ProposalCard key={item.key} item={item} index={i} keep={keep} onReject={() => reject(item.key)} />
          ))}
        </ol>
      )}
    </div>
  );
}
