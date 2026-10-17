"use client";

import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { applyStoryReview, reviewStory, type ReviewState } from "@/app/(app)/missions/story-review-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import { FIELD_LABELS, FIELD_NAMES, REMARK_LABELS, type ReviewField } from "@/lib/domain/story-review";
import { HINT_MAX } from "@/lib/domain/tasks";

type Result = Extract<ReviewState, { ok: true }>;

/**
 * « Relire avec l'IA » d'une user story : précision facultative en entrée, remarques et version améliorée (champ par champ) en sortie.
 * Rien n'est enregistré tant que « Appliquer » n'est pas cliqué ; fermer le panneau oublie la relecture, la précision n'est stockée nulle part.
 */
export function StoryReview({ storyId, storyTitle }: { storyId: string; storyTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [checked, setChecked] = useState<Set<ReviewField>>(new Set());
  const [error, setError] = useState("");
  // L'annonce vit hors du panneau (qui se ferme après « Appliquer ») ; elle porte un numéro : la même phrase deux fois de suite est relue.
  const [announce, setAnnounceState] = useState("");
  // Une seule région vocale, montée en permanence : le texte change, la région reste (une région insérée déjà pleine n'est pas annoncée de façon fiable).
  // Une espace insécable alternée en fin de phrase permet de répéter la même phrase.
  const flip = useRef(false);
  const setAnnounce = useCallback((text: string) => {
    flip.current = !flip.current;
    setAnnounceState(text ? text + (flip.current ? "\u00a0" : "") : "");
  }, []);
  // `pending` : une relecture est attendue (fermer le panneau la libère, son résultat tardif est jeté) ; `applying` : un enregistrement est en cours.
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingNow = useRef(false);
  const closing = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const run = useRef(0);
  const titleId = useId();

  const closePanel = useCallback(() => {
    // Pendant l'enregistrement le panneau ne se ferme pas (un échec tardif écrirait son erreur dans un panneau fermé) ; `apply` ferme lui-même au succès.
    if (applyingNow.current && !closing.current) return;
    run.current++; // une relecture en cours est abandonnée : son résultat ne remplira pas un panneau fermé
    setOpen(false);
    setResult(null);
    setChecked(new Set());
    setError("");
    setPending(false);
  }, []);
  // Le focus va à la précision à l'ouverture et revient au bouton d'ouverture à la fermeture (le bouton n'existe qu'après le rendu : d'où l'effet).
  useEffect(() => {
    if (open) panel.current?.querySelector("textarea")?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const generate = async () => {
    if (pending || applying) return;
    setError("");
    setResult(null);
    setAnnounce("");
    setPending(true);
    const mine = ++run.current;
    try {
      const r = await reviewStory(storyId, hint);
      if (mine !== run.current) return; // annulé ou fermé entre-temps
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult(r);
      setChecked(new Set(r.changes.map((c) => c.field)));
    } catch (e) {
      if (mine !== run.current) return;
      if (isRedirect(e)) throw e;
      setError(UNREACHABLE);
    } finally {
      if (mine === run.current) setPending(false);
    }
  };

  const apply = async () => {
    if (!result || applyingNow.current) return;
    const chosen = Object.fromEntries(result.changes.filter((c) => checked.has(c.field)).map((c) => [c.field, c.proposed]));
    if (Object.keys(chosen).length === 0) return;
    applyingNow.current = true;
    setApplying(true);
    setError("");
    try {
      const r = await applyStoryReview(storyId, result.base, chosen);
      if (!r.ok) {
        setError(r.error);
        if (r.gone) router.refresh();
        return;
      }
      setAnnounce(`Story mise à jour : ${r.applied.map((f) => FIELD_NAMES[f]).join(", ")}.`);
      closing.current = true;
      closePanel();
      closing.current = false;
    } catch (e) {
      if (isRedirect(e)) throw e;
      setError(UNREACHABLE);
    } finally {
      applyingNow.current = false;
      setApplying(false);
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
          Relire avec l&apos;IA<span className="sr-only"> la user story {storyTitle}</span>
        </Button>
        {status}
      </>
    );
  }

  const nothing = result && result.remarks.length === 0 && result.changes.length === 0 && result.dropped === 0;
  return (
    <>
      <div
        ref={panel}
        role="group"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          // Échap dans la précision ne doit pas faire perdre la saisie : seuls « Fermer » et la croix ferment alors.
          if ((e.target as HTMLElement).closest("textarea, input:not([type=checkbox]), select, form")) return;
          e.preventDefault();
          closePanel();
        }}
        className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/10 p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <h4 id={titleId} className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} aria-hidden="true" />
            Relire la user story avec l&apos;IA
          </h4>
          <Button type="button" variant="ghost" size="icon" className="max-md:size-11" disabled={applying} onClick={closePanel} aria-label={pending ? "Annuler et fermer le panneau" : "Fermer le panneau"}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${titleId}-hint`}>Précision (facultatif)</Label>
          <Textarea
            id={`${titleId}-hint`}
            rows={3}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={HINT_MAX}
            placeholder="Ce que l'IA doit savoir de plus : une contrainte, ce qui te gêne dans cette story…"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Le texte de la story, sa note d&apos;origine, les titres des autres stories et ta précision sont envoyés à Anthropic pour la relecture. N&apos;y mets pas de données réelles de clients. Rien n&apos;est
          enregistré tant que tu n&apos;appliques pas.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={generate} disabled={pending || applying}>
            {pending ? "L'IA relit…" : result ? "Relire à nouveau" : "Relire"}
          </Button>
          <button type="button" disabled={applying} onClick={closePanel} className="text-sm underline underline-offset-4 disabled:opacity-50 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            {pending ? "Annuler" : "Ignorer"}
          </button>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {pending
            ? "L'IA relit la story, cela peut prendre quelques secondes. « Annuler » arrête l'attente (l'appel, lui, va au bout)."
            : result
              ? nothing
                ? ""
                : `${result.remarks.length} remarque${result.remarks.length > 1 ? "s" : ""}, ${result.changes.length} champ${result.changes.length > 1 ? "s" : ""} à relire.`
              : ""}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {nothing && <p className="text-sm">L&apos;IA ne voit rien à améliorer dans cette story.</p>}
        {result && result.remarks.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm" aria-label="Remarques de l'IA">
            {result.remarks.map((r, i) => (
              <li key={i} className="break-words">
                <span className="font-semibold">{REMARK_LABELS[r.kind]} :</span> {r.text}
              </li>
            ))}
          </ul>
        )}
        {result && result.changes.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Version proposée, champ par champ">
            {result.changes.map((c) => (
              <li key={c.field} className="flex flex-col gap-2 rounded-md border bg-card p-3">
                <label className="flex min-h-9 items-center gap-2 text-sm font-semibold max-md:min-h-11">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={checked.has(c.field)}
                    disabled={applying}
                    onChange={(e) =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.field);
                        else next.delete(c.field);
                        return next;
                      })
                    }
                  />
                  Appliquer : {FIELD_LABELS[c.field]}
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Actuel</p>
                    <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{c.current || (c.field === "points" ? "Aucun" : "(vide)")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Proposé</p>
                    <p className="whitespace-pre-line break-words text-sm">{c.proposed}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {result && result.dropped > 0 && (
          <p className="text-sm text-muted-foreground">
            {result.dropped} proposition{result.dropped > 1 ? "s" : ""} écartée{result.dropped > 1 ? "s" : ""} (champ ou remarque invalide, ou chiffre absent de tes sources).
          </p>
        )}
        {result?.noteCut && <p className="text-sm text-muted-foreground">La note d&apos;origine n&apos;a pas été envoyée : trop de texte.</p>}
        {result && result.changes.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" onClick={apply} disabled={applying || checked.size === 0}>
              {applying ? "Enregistrement…" : `Appliquer la sélection (${checked.size})`}
            </Button>
          </div>
        )}
      </div>
      {/* Même place que dans l'état fermé : la région vocale survit à la fermeture du panneau, l'annonce de « Story mise à jour » n'est pas perdue. */}
      {status}
    </>
  );
}
