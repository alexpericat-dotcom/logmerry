"use client";

import { useActionState, useState } from "react";

import { createRule, type RuleFormState } from "@/app/(app)/regles/actions";
import { ErrorLine, ErrorSummary, FocusOnMount, selectClass } from "@/components/form-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ruleKeyDef, visibleFields } from "@/lib/domain/finance/rule-keys";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/domain/finance/rules";
import { fieldProps } from "@/lib/form";
import { submitWith } from "@/lib/submit-with";


/**
 * Nouvelle règle ou nouvelle version : les paramètres de la version la plus récente sont repris (ce sont tes données), jamais la source ni les dates.
 * La version démarre toujours « À vérifier » ; elle ne passe « Vérifiée » qu'avec un lien officiel (bouton sur la version).
 */
export function RuleForm({ ruleKey, initialParams, hasVersions }: { ruleKey: string; initialParams: Record<string, string>; hasVersions: boolean }) {
  const def = ruleKeyDef(ruleKey)!;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<RuleFormState, FormData>(createRule.bind(null, ruleKey), {});
  const [params, setParams] = useState<Record<string, string>>(initialParams);
  // Une réponse « enregistré » referme le formulaire (ajustement pendant le rendu, pas d'effet).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.saved) setOpen(false);
  }
  // Les erreurs et le message d'une réponse déjà vue à l'ouverture ne reviennent pas quand on rouvre le formulaire.
  const [dismissed, setDismissed] = useState<RuleFormState | null>(null);
  const current = state === dismissed ? ({} as RuleFormState) : state;

  if (!open)
    return (
      <div className="flex flex-col gap-1">
        <div>
          <Button size="sm" variant="outline" onClick={() => { setParams(initialParams); setDismissed(state); setOpen(true); }}>
            {hasVersions ? "Nouvelle version" : "Saisir la règle"}
          </Button>
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {current.saved ? "Règle enregistrée (à vérifier)." : ""}
        </p>
      </div>
    );

  const e = current.errors ?? {};
  const id = (n: string) => `rf-${ruleKey}-${n}`;
  const prefix = `rf-${ruleKey}`;
  const field = (name: string, error?: string) => fieldProps(prefix, name, error);
  const err = (name: string, error?: string) => <ErrorLine id={id(name)} message={error} />;
  const summaryId = (key: string) => id(key.startsWith("param:") ? `p_${key.slice(6)}` : key); // une erreur « param:x » vise le champ « p_x »

  return (
    <FocusOnMount>
      <form
        onSubmit={submitWith(formAction)}
        noValidate
        onKeyDown={(ev) => {
          if (ev.key === "Escape" && !pending) {
            ev.preventDefault();
            setOpen(false);
          }
        }}
        className="flex max-w-2xl flex-col gap-4 rounded-md border bg-card p-3"
      >
        <ErrorSummary errors={e} token={current} idOf={summaryId} prefix={prefix} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={id("activity_category")}>Catégorie d&apos;activité</Label>
            <select {...field("activity_category", e.activity_category)} defaultValue="" className={selectClass} aria-required="true">
              <option value="">Choisis…</option>
              {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {err("activity_category", e.activity_category)}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id("effective_from")}>Date d&apos;effet</Label>
            <Input {...field("effective_from", e.effective_from)} type="date" aria-required="true" />
            {err("effective_from", e.effective_from)}
          </div>
          {visibleFields(def, params).map((f) => {
            const error = e[`param:${f.name}`];
            const props = { ...field(`p_${f.name}`, error), id: id(`p_${f.name}`) };
            return (
              <div key={f.name} className="grid gap-2">
                <Label htmlFor={props.id}>{f.label}</Label>
                {f.kind === "select" ? (
                  <select {...props} value={params[f.name] ?? ""} onChange={(ev) => setParams({ ...params, [f.name]: ev.target.value })} className={selectClass} aria-required="true">
                    <option value="">Choisis…</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    {...props}
                    value={params[f.name] ?? ""}
                    onChange={(ev) => setParams({ ...params, [f.name]: ev.target.value })}
                    inputMode={f.kind === "euros" ? "decimal" : f.kind === "int" ? "numeric" : undefined}
                    autoComplete="off"
                    aria-required="true"
                  />
                )}
                {err(`p_${f.name}`, error)}
              </div>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={id("source")}>Source officielle (lien)</Label>
            <Input {...field("source", e.source)} type="text" inputMode="url" placeholder="https://…" autoComplete="off" aria-required="true" />
            {err("source", e.source)}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id("verified_on")}>Date de vérification</Label>
            <Input {...field("verified_on", e.verified_on)} type="date" aria-required="true" />
            {err("verified_on", e.verified_on)}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id("revalidate_after")}>À revérifier avant le</Label>
            <Input {...field("revalidate_after", e.revalidate_after)} type="date" aria-required="true" />
            {err("revalidate_after", e.revalidate_after)}
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={id("description")}>Note (facultatif)</Label>
            <Input {...field("description", e.description)} type="text" maxLength={500} autoComplete="off" />
            {err("description", e.description)}
          </div>
        </div>
        {current.message && (
          <p role="alert" className="text-sm text-destructive">
            {current.message}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" aria-disabled={pending} onClick={(ev) => pending && ev.preventDefault()}>
            {pending ? "Enregistrement…" : "Enregistrer (à vérifier)"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => !pending && setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </FocusOnMount>
  );
}
