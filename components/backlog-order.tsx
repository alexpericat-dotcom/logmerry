"use client";

import { ArrowDown, ArrowUp, ListOrdered, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { applyBacklogOrder, proposeBacklogOrder, type OrderState } from "@/app/(app)/missions/backlog-order-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import { HINT_MAX } from "@/lib/domain/tasks";

type Result = Extract<OrderState, { ok: true }>;

/**
 * « Proposer un ordre logique » du backlog : précision facultative en entrée, nouvel ordre avec « place actuelle → nouvelle place » et une raison par story déplacée en sortie.
 * Rien n'est réordonné avant « Appliquer cet ordre » ; fermer le panneau oublie la proposition, la précision n'est stockée nulle part. Pour ajuster, on fait ensuite un glisser-déposer.
 */
export function BacklogOrder({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  // Une seule région vocale, montée en permanence et hors du panneau (qui se ferme après « Appliquer ») ; espace insécable alternée pour répéter une phrase.
  const [announce, setAnnounceState] = useState("");
  const flip = useRef(false);
  const setAnnounce = useCallback((text: string) => {
    flip.current = !flip.current;
    setAnnounceState(text ? text + (flip.current ? " " : "") : "");
  }, []);
  // `pending` : une proposition est attendue (fermer la libère, son résultat tardif est jeté) ; `applying` : l'ordre s'enregistre (le panneau ne se ferme pas).
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingNow = useRef(false);
  const closing = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const proposeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const run = useRef(0);
  const titleId = useId();

  const closePanel = useCallback(() => {
    if (applyingNow.current && !closing.current) return;
    run.current++; // une proposition en cours est abandonnée : son résultat ne remplira pas un panneau fermé
    setOpen(false);
    setResult(null);
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
      const r = await proposeBacklogOrder(missionId, hint);
      if (mine !== run.current) return; // annulé ou fermé entre-temps
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult(r);
    } catch (e) {
      if (mine !== run.current) return;
      if (isRedirect(e)) throw e;
      setError(UNREACHABLE);
    } finally {
      if (mine === run.current) setPending(false);
    }
  };

  const apply = async () => {
    if (!result || applyingNow.current || result.same) return;
    applyingNow.current = true;
    setApplying(true);
    setError("");
    try {
      const r = await applyBacklogOrder(
        missionId,
        result.baseIds,
        result.sentIds,
        result.items.map((i) => i.id),
      );
      if (!r.ok) {
        setError(r.error);
        if (r.gone) {
          // La proposition est périmée : on l'efface, un nouveau clic ne ferait que répéter l'erreur ; il faut en demander une autre. Le bouton « Appliquer » qui avait le focus
          // disparaît avec elle : le focus va à « Proposer à nouveau ».
          setResult(null);
          requestAnimationFrame(() => proposeButton.current?.focus());
          router.refresh();
        }
        return;
      }
      setAnnounce(`Backlog réordonné : ${r.moved} stor${r.moved > 1 ? "ies déplacées" : "y déplacée"}.`);
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
        <Button ref={openButton} type="button" variant="outline" className="self-start" onClick={() => setOpen(true)}>
          <ListOrdered aria-hidden="true" />
          Proposer un ordre logique
        </Button>
        {status}
      </>
    );
  }

  const moved = result ? result.items.filter((i) => i.from !== i.to) : [];
  return (
    <>
      <div
        ref={panel}
        role="group"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          // Échap dans la précision ne doit pas faire perdre la saisie : seuls « Ignorer » et la croix ferment alors.
          if ((e.target as HTMLElement).closest("textarea, input:not([type=checkbox]), select, form")) return;
          e.preventDefault();
          closePanel();
        }}
        className="flex max-w-3xl flex-col gap-3 rounded-md border border-primary/30 bg-primary/10 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={titleId} className="flex items-center gap-2 font-semibold">
            <ListOrdered size={16} aria-hidden="true" />
            Proposer un ordre logique
          </h3>
          <Button type="button" variant="ghost" size="icon" className="max-md:size-11" aria-disabled={applying} onClick={closePanel} aria-label={pending ? "Annuler et fermer le panneau" : "Fermer le panneau"}>
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
            placeholder="Ce que l'IA doit savoir de plus : une contrainte, une échéance du client, ce qui doit venir en premier…"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Le titre de la mission, le nom du client, les stories du backlog (titres, points, rôles, critères), les titres des stories déjà en sprint et ta précision sont envoyés à Anthropic pour la proposition. N&apos;y
          mets pas de données réelles de clients. Rien n&apos;est réordonné tant que tu ne cliques pas sur « Appliquer cet ordre ».
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button ref={proposeButton} type="button" onClick={generate} aria-disabled={pending || applying}>
            {pending ? "L'IA réfléchit…" : result ? "Proposer à nouveau" : "Proposer un ordre"}
          </Button>
          <button type="button" aria-disabled={applying} onClick={closePanel} className="text-sm underline underline-offset-4 aria-disabled:opacity-50 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            {pending ? "Annuler" : "Ignorer"}
          </button>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {pending
            ? "L'IA ordonne le backlog, cela peut prendre quelques secondes. « Annuler » arrête l'attente (l'appel, lui, va au bout)."
            : result
              ? result.same
                ? ""
                : `${moved.length} stor${moved.length > 1 ? "ies déplacées" : "y déplacée"} sur ${result.items.length}.`
              : ""}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {result?.same && result.omitted === 0 && <p className="text-sm">L&apos;ordre actuel te semble déjà logique à l&apos;IA.</p>}
        {result && !result.same && (
          <ol className="flex flex-col gap-2" aria-label="Ordre proposé pour le backlog">
            {result.items.map((it) => (
              <li key={it.id} className="rounded-md border bg-card p-3">
                <p className="flex flex-wrap items-baseline gap-x-2 break-words text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{it.to}.</span>
                  <span className="font-semibold">{it.title}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{it.points === null ? "sans points" : `${it.points} pts`}</span>
                  <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap text-xs">
                    {it.from === it.to ? (
                      <span className="text-muted-foreground">inchangée</span>
                    ) : (
                      <>
                        {it.to < it.from ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
                        <span>
                          {it.from} → {it.to}
                          <span className="sr-only">
                            {" "}
                            : passe de la place {it.from} à la place {it.to}
                          </span>
                        </span>
                      </>
                    )}
                  </span>
                </p>
                {it.reason && <p className="mt-1 break-words text-sm text-muted-foreground">{it.reason}</p>}
              </li>
            ))}
          </ol>
        )}
        {result && (result.dropped > 0 || result.droppedTexts > 0 || result.omitted > 0 || result.cut) && (
          <p className="text-sm text-muted-foreground">
            {[
              result.omitted > 0 ? `${result.omitted} stor${result.omitted > 1 ? "ies non classées par l'IA sont" : "y non classée par l'IA est"} à la suite, dans l'ordre actuel.` : "",
              result.dropped > 0 ? `${result.dropped} élément${result.dropped > 1 ? "s écartés" : " écarté"} (story inconnue ou répétée).` : "",
              result.droppedTexts > 0 ? `${result.droppedTexts} raison${result.droppedTexts > 1 ? "s retirées" : " retirée"} (chiffre absent de tes sources).` : "",
              result.cut ? "Seules les 60 premières stories ouvertes ont été envoyées ; les suivantes gardent leur place." : "",
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
        {result && !result.same && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={apply} aria-disabled={applying}>
              {applying ? "Enregistrement…" : "Appliquer cet ordre"}
            </Button>
            <p className="text-xs text-muted-foreground">Pour ajuster, glisse ensuite les stories par leur poignée.</p>
          </div>
        )}
      </div>
      {/* Même place que dans l'état fermé : la région vocale survit à la fermeture du panneau, l'annonce n'est pas perdue. */}
      {status}
    </>
  );
}
