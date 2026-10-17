"use client";

import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { composeSprint, placeStoriesInSprint, type ComposeState } from "@/app/(app)/missions/sprint-composition-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import { CAPACITY_MAX, capacityVerdict, pointsTotal } from "@/lib/domain/sprint-composition";
import { SPRINT_GOAL_MAX } from "@/lib/domain/sprints";
import { HINT_MAX } from "@/lib/domain/tasks";

type Result = Extract<ComposeState, { ok: true }>;

/**
 * « Composer avec l'IA » d'un sprint non clos : capacité visée et précision facultatives en entrée, stories du backlog proposées (cochables) et objectif modifiable en sortie.
 * Rien n'est placé avant « Placer » ; fermer le panneau oublie la proposition, la capacité et la précision ne sont stockées nulle part.
 */
export function SprintComposer({ sprintId, sprintName }: { sprintId: string; sprintName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState("");
  const [goalChecked, setGoalChecked] = useState(true);
  const [error, setError] = useState("");
  // Une seule région vocale, montée en permanence et hors du panneau (qui se ferme après « Placer ») ; espace insécable alternée pour répéter une phrase.
  const [announce, setAnnounceState] = useState("");
  const flip = useRef(false);
  const setAnnounce = useCallback((text: string) => {
    flip.current = !flip.current;
    setAnnounceState(text ? text + (flip.current ? " " : "") : "");
  }, []);
  // `pending` : une proposition est attendue (fermer la libère, son résultat tardif est jeté) ; `placing` : un placement est en cours (le panneau ne se ferme pas).
  const [pending, setPending] = useState(false);
  const [placing, setPlacing] = useState(false);
  const placingNow = useRef(false);
  const closing = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const run = useRef(0);
  const titleId = useId();

  const closePanel = useCallback(() => {
    if (placingNow.current && !closing.current) return;
    run.current++; // une proposition en cours est abandonnée : son résultat ne remplira pas un panneau fermé
    setOpen(false);
    setResult(null);
    setChecked(new Set());
    setError("");
    setPending(false);
  }, []);
  // Le focus va à la capacité à l'ouverture et revient au bouton d'ouverture à la fermeture (le bouton n'existe qu'après le rendu : d'où l'effet).
  useEffect(() => {
    if (open) panel.current?.querySelector("input")?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const generate = async () => {
    if (pending || placing) return;
    setError("");
    setResult(null);
    setAnnounce("");
    setPending(true);
    const mine = ++run.current;
    try {
      const r = await composeSprint(sprintId, capacity, hint);
      if (mine !== run.current) return; // annulé ou fermé entre-temps
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult(r);
      setChecked(new Set(r.stories.map((s) => s.id)));
      setGoal(r.goal ?? "");
      setGoalChecked(true);
    } catch (e) {
      if (mine !== run.current) return;
      if (isRedirect(e)) throw e;
      setError(UNREACHABLE);
    } finally {
      if (mine === run.current) setPending(false);
    }
  };

  const chosen = result ? result.stories.filter((s) => checked.has(s.id)) : [];
  const verdict = result ? capacityVerdict({ proposed: pointsTotal(chosen), placed: result.placedPoints, capacity: result.capacity, noPoints: chosen.filter((s) => s.points === null).length }) : null;
  const goalTooLong = [...goal].length > SPRINT_GOAL_MAX;
  const useGoal = !!result?.goal && goalChecked && goal.trim() !== "";

  const place = async () => {
    if (!result || placingNow.current || chosen.length === 0 || (useGoal && goalTooLong)) return;
    placingNow.current = true;
    setPlacing(true);
    setError("");
    try {
      const r = await placeStoriesInSprint(
        sprintId,
        chosen.map((s) => s.id),
        useGoal ? goal : null,
      );
      if (!r.ok) {
        setError(r.error);
        if (r.gone) {
          // La proposition est périmée (ou partiellement appliquée) : on l'efface, un nouveau « Placer » ne ferait que répéter l'erreur ; il faut recomposer.
          setResult(null);
          setChecked(new Set());
          if (r.placed) setAnnounce(r.error);
          router.refresh();
        }
        return;
      }
      setAnnounce(
        `${r.placed} stor${r.placed > 1 ? "ies placées" : "y placée"} dans le sprint « ${sprintName} »${r.goalSet ? ", objectif mis à jour" : r.goalSkipped ? ", objectif inchangé : le sprint en avait déjà un" : r.goalFailed ? ", objectif non enregistré (réessaie depuis « Modifier »)" : ""}.`,
      );
      closing.current = true;
      closePanel();
      closing.current = false;
    } catch (e) {
      if (isRedirect(e)) throw e;
      setError(UNREACHABLE);
    } finally {
      placingNow.current = false;
      setPlacing(false);
    }
  };

  const status = (
    <p role="status" aria-live="polite" className="sr-only">
      {announce}
    </p>
  );

  if (!open) {
    return (
      <>
        <Button ref={openButton} type="button" variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
          <Sparkles aria-hidden="true" />
          Composer avec l&apos;IA<span className="sr-only"> le sprint {sprintName}</span>
        </Button>
        {status}
      </>
    );
  }

  return (
    <>
      <div
        ref={panel}
        role="group"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          // Échap dans un champ ne doit pas faire perdre la saisie : seuls « Ignorer » et la croix ferment alors.
          if ((e.target as HTMLElement).closest("textarea, input:not([type=checkbox]), select, form")) return;
          e.preventDefault();
          closePanel();
        }}
        className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/10 p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <h4 id={titleId} className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} aria-hidden="true" />
            Composer le sprint avec l&apos;IA
          </h4>
          <Button type="button" variant="ghost" size="icon" className="max-md:size-11" disabled={placing} onClick={closePanel} aria-label={pending ? "Annuler et fermer le panneau" : "Fermer le panneau"}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor={`${titleId}-capacity`}>Capacité visée en points (facultatif)</Label>
          <Input id={`${titleId}-capacity`} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, "").slice(0, 3))} placeholder={`1 à ${CAPACITY_MAX}`} autoComplete="off" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${titleId}-hint`}>Précision (facultatif)</Label>
          <Textarea
            id={`${titleId}-hint`}
            rows={3}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={HINT_MAX}
            placeholder="Ce que l'IA doit savoir de plus : une contrainte, une priorité du moment, une absence…"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Le titre de la mission, le nom du client, le sprint, ses stories, le backlog (titres, points, rôles, critères), ta capacité et ta précision sont envoyés à Anthropic pour la proposition. N&apos;y mets pas de données réelles de clients. Rien n&apos;est
          placé tant que tu ne cliques pas sur « Placer ».
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={generate} aria-disabled={pending || placing}>
            {pending ? "L'IA compose…" : result ? "Composer à nouveau" : "Composer"}
          </Button>
          <button type="button" disabled={placing} onClick={closePanel} className="text-sm underline underline-offset-4 disabled:opacity-50 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            {pending ? "Annuler" : "Ignorer"}
          </button>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {pending
            ? "L'IA compose le sprint, cela peut prendre quelques secondes. « Annuler » arrête l'attente (l'appel, lui, va au bout)."
            : result
              ? `${result.stories.length} stor${result.stories.length > 1 ? "ies proposées" : "y proposée"}, dans l'ordre de priorité.`
              : ""}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {result && (
          <>
            <ol className="flex flex-col gap-2" aria-label="Stories proposées pour le sprint">
              {result.stories.map((s) => (
                <li key={s.id} className="rounded-md border bg-card p-3">
                  <label className="flex min-h-9 items-start gap-2 text-sm max-md:min-h-11">
                    <input
                      type="checkbox"
                      className="mt-1 size-4"
                      checked={checked.has(s.id)}
                      disabled={placing}
                      onChange={(e) =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(s.id);
                          else next.delete(s.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 break-words">
                      <span className="font-semibold">{s.title}</span> <span className="whitespace-nowrap text-xs text-muted-foreground">{s.points === null ? "sans points" : `${s.points} pts`}</span>
                      {s.reason && <span className="mt-1 block text-muted-foreground">{s.reason}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
            {verdict && (
              <p className={`text-sm font-semibold ${verdict.over > 0 ? "text-destructive" : ""}`}>
                {verdict.label}
              </p>
            )}
            {result.goal && (
              <div className="grid gap-2 rounded-md border bg-card p-3">
                <label className="flex min-h-9 items-center gap-2 text-sm font-semibold max-md:min-h-11">
                  <input type="checkbox" className="size-4" checked={goalChecked} disabled={placing} onChange={(e) => setGoalChecked(e.target.checked)} />
                  Objectif du sprint (modifiable)
                </label>
                <Textarea aria-label="Objectif proposé pour le sprint" rows={2} value={goal} disabled={placing || !goalChecked} onChange={(e) => setGoal(e.target.value)} maxLength={SPRINT_GOAL_MAX + 50} />
                {goalTooLong && (
                  <p role="alert" className="text-sm text-destructive">
                    L&apos;objectif doit faire {SPRINT_GOAL_MAX} caractères au plus.
                  </p>
                )}
              </div>
            )}
            {(result.dropped > 0 || result.droppedTexts > 0 || result.cutBacklog) && (
              <p className="text-sm text-muted-foreground">
                {[
                  result.dropped > 0 ? `${result.dropped} proposition${result.dropped > 1 ? "s écartées" : " écartée"} (story inconnue, déjà placée ou répétée).` : "",
                  result.droppedTexts > 0 ? `${result.droppedTexts} texte${result.droppedTexts > 1 ? "s retirés" : " retiré"} (chiffre absent de tes sources, ou trop long).` : "",
                  result.cutBacklog ? "Seules les 60 stories les plus prioritaires du backlog ont été envoyées." : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" size="sm" onClick={place} aria-disabled={placing || chosen.length === 0 || (useGoal && goalTooLong)}>
                {placing ? "Placement…" : `Placer ${chosen.length} stor${chosen.length > 1 ? "ies" : "y"}`}
              </Button>
            </div>
          </>
        )}
      </div>
      {/* Même place que dans l'état fermé : la région vocale survit à la fermeture du panneau, l'annonce du placement n'est pas perdue. */}
      {status}
    </>
  );
}
