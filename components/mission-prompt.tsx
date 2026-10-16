"use client";

import { Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { generateMissionPrompt } from "@/app/(app)/missions/prompt-actions";
import { selectClass } from "@/components/story-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import { CONTEXT_LEVELS, CONTEXT_LEVEL_LABELS, type ContextLevel } from "@/lib/domain/mission-context";
import { OBJECTIVE_MAX, PROMPT_TARGETS, PROMPT_TARGET_LABELS, type PromptTarget } from "@/lib/domain/prompt-generation";

/**
 * Panneau « Générer un prompt avec l'IA » d'une mission : contenu, assistant visé et objectif en entrée, prompt modifiable en sortie.
 * Claude rédige la consigne, le code ajoute le contexte tel quel. Rien n'est enregistré ; fermer le panneau oublie le prompt.
 */
export function MissionPrompt({ missionId, hasClient }: { missionId: string; hasClient: boolean }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<ContextLevel>("tasks");
  const [target, setTarget] = useState<PromptTarget>("claude");
  const [objective, setObjective] = useState("");
  const [withoutClient, setWithoutClient] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [omitted, setOmitted] = useState(0);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  // L'annonce porte un numéro : la même phrase deux fois de suite remonte l'élément et est relue par les lecteurs d'écran.
  const [announce, setAnnounceState] = useState({ text: "", n: 0 });
  const setAnnounce = useCallback((text: string) => setAnnounceState((a) => ({ text, n: a.n + 1 })), []);
  const openButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const output = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(false);
  // Numéro de la génération en cours : fermer ou annuler l'invalide, et son résultat, s'il arrive, est jeté (le serveur, lui, va au bout de l'appel).
  const run = useRef(0);
  const id = useId();

  const closePanel = useCallback(() => {
    run.current++;
    setOpen(false);
    setPrompt("");
    setEdited(false);
    setError("");
    setOmitted(0);
    setPending(false);
    setAnnounceState({ text: "", n: 0 });
  }, []);
  // Le focus va au premier champ à l'ouverture et revient au bouton d'ouverture à la fermeture (le bouton n'existe qu'après le rendu : d'où l'effet).
  useEffect(() => {
    if (open) panel.current?.querySelector("select")?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const generate = async () => {
    if (pending) return;
    setError("");
    setPending(true);
    setAnnounce("");
    const mine = ++run.current;
    try {
      const result = await generateMissionPrompt(missionId, { level, target, objective, includeClient: !withoutClient });
      if (mine !== run.current) return; // annulé ou fermé entre-temps
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPrompt(result.prompt);
      setOmitted(result.omitted);
      setEdited(false);
      setAnnounce("Prompt prêt : relis-le, modifie-le si besoin, puis copie-le.");
      requestAnimationFrame(() => output.current?.focus());
    } catch (e) {
      if (mine !== run.current) return;
      if (isRedirect(e)) throw e;
      setError(UNREACHABLE);
    } finally {
      if (mine === run.current) setPending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output.current?.value ?? prompt);
      setAnnounce("Prompt copié.");
    } catch {
      // Presse-papiers refusé : le texte est sélectionné pour que Ctrl+C ou ⌘C marche.
      output.current?.focus();
      output.current?.select();
      setAnnounce("Copie impossible : le texte est sélectionné, copie-le avec Ctrl+C ou ⌘C.");
    }
  };

  if (!open) {
    return (
      <Button ref={openButton} type="button" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <Sparkles aria-hidden="true" />
        Générer un prompt avec l&apos;IA
      </Button>
    );
  }

  return (
    <div
      ref={panel}
      role="group"
      aria-labelledby={`${id}-title`}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Échap dans un champ ne doit pas faire perdre le prompt modifié : seuls « Fermer » et la croix ferment alors.
        if ((e.target as HTMLElement).closest("textarea, input, select")) return;
        e.preventDefault();
        closePanel();
      }}
      className="flex max-w-3xl flex-col gap-4 rounded-md border border-primary/30 bg-primary/10 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={`${id}-title`} className="flex items-center gap-2 font-semibold">
          <Sparkles size={16} aria-hidden="true" />
          Générer un prompt avec l&apos;IA
        </h3>
        <Button type="button" variant="ghost" size="icon" className="max-md:size-11" onClick={closePanel} aria-label={pending ? "Annuler et fermer le panneau" : "Fermer le panneau"}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-level`}>Ce que le prompt contient</Label>
          <select id={`${id}-level`} value={level} onChange={(e) => setLevel(e.target.value as ContextLevel)} className={selectClass}>
            {CONTEXT_LEVELS.map((l) => (
              <option key={l} value={l}>
                {CONTEXT_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-target`}>Pour quel assistant</Label>
          <select id={`${id}-target`} value={target} onChange={(e) => setTarget(e.target.value as PromptTarget)} className={selectClass}>
            {PROMPT_TARGETS.map((t) => (
              <option key={t} value={t}>
                {PROMPT_TARGET_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-objective`}>Ce que tu veux obtenir (facultatif)</Label>
        <Textarea id={`${id}-objective`} rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={OBJECTIVE_MAX} placeholder="Par exemple : un premier workflow pour relancer automatiquement les familles qui n'ont pas payé." />
      </div>
      {hasClient && (
        <label className="flex min-h-9 items-center gap-2 text-sm max-md:min-h-11">
          <input type="checkbox" className="size-4" checked={withoutClient} onChange={(e) => setWithoutClient(e.target.checked)} />
          Sans le nom du client
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        La mission et le backlog choisis sont envoyés à Anthropic pour rédiger le prompt, puis iront où tu colleras ce prompt. N&apos;y mets pas de données réelles de clients. Le nom du client peut être retiré, pas celui qui figurerait dans un titre. Rien n&apos;est enregistré.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={generate} disabled={pending}>
          {pending ? "L'IA rédige…" : prompt ? "Régénérer" : "Générer le prompt"}
        </Button>
        <button type="button" onClick={closePanel} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          {pending ? "Annuler" : "Fermer"}
        </button>
      </div>
      <p key={announce.n} role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {pending ? "L'IA rédige la consigne, cela peut prendre quelques secondes. « Annuler » arrête l'attente (l'appel, lui, va au bout)." : announce.text}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {prompt && (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-output`}>Prompt (modifiable)</Label>
          <Textarea
            id={`${id}-output`}
            ref={output}
            rows={16}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setEdited(true);
            }}
            className="font-mono text-xs"
          />
          {omitted > 0 && <p className="text-xs text-muted-foreground">{omitted} user stor{omitted > 1 ? "ies ont été omises" : "y a été omise"} du contexte (limité à 30 000 caractères).</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={copy}>
              Copier le prompt
            </Button>
            {edited && <span className="text-xs text-muted-foreground">Régénérer remplace tes modifications.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
