"use client";

import { useActionState, useState } from "react";

import { updateRule, type RuleActionState } from "@/app/(app)/regles/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitWith } from "@/lib/submit-with";

const NONE: RuleActionState = {};

/** Boutons d'une version selon son statut (calculé côté serveur) ; la base impose les mêmes règles. Un seul état d'action : le message affiché est toujours celui du dernier envoi. */
export function RuleActions({ id, canVerify, canUnverify, canRevalidate, canDelete, missingLink }: { id: string; canVerify: boolean; canUnverify: boolean; canRevalidate: boolean; canDelete: boolean; missingLink: boolean }) {
  const [state, formAction, busy] = useActionState<RuleActionState, FormData>(updateRule.bind(null, id), NONE);
  const [mode, setMode] = useState<"none" | "revalidate" | "delete">("none");
  // Un envoi réussi referme le panneau ouvert (ajustement pendant le rendu, pas d'effet).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.done) setMode("none");
  }
  const guard = (e: React.MouseEvent) => busy && e.preventDefault();
  const submit = submitWith(formAction);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canVerify && (
          <form onSubmit={submit}>
            <Button type="submit" name="intent" value="verify" size="sm" aria-disabled={busy} onClick={guard}>
              Marquer vérifiée
            </Button>
          </form>
        )}
        {missingLink && <p className="text-sm text-muted-foreground">Pour la marquer « Vérifiée », il faut un lien officiel https dans la source : supprime cette version et saisis-la de nouveau.</p>}
        {canUnverify && (
          <form onSubmit={submit}>
            <Button type="submit" name="intent" value="unverify" size="sm" variant="outline" aria-disabled={busy} onClick={guard}>
              Repasser à vérifier
            </Button>
          </form>
        )}
        {canRevalidate && mode !== "revalidate" && (
          <Button size="sm" variant="outline" onClick={() => setMode("revalidate")}>
            Revérifier
          </Button>
        )}
        {canDelete && mode !== "delete" && (
          <Button size="sm" variant="ghost" onClick={() => setMode("delete")}>
            Supprimer
          </Button>
        )}
      </div>
      {canRevalidate && mode === "revalidate" && (
        <form onSubmit={submit} noValidate className="grid max-w-md gap-3 rounded-md border bg-card p-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`rv-${id}-v`}>Date de vérification</Label>
            <Input id={`rv-${id}-v`} name="verified_on" type="date" aria-required="true" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`rv-${id}-r`}>À revérifier avant le</Label>
            <Input id={`rv-${id}-r`} name="revalidate_after" type="date" aria-required="true" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" name="intent" value="revalidate" size="sm" aria-disabled={busy} onClick={guard}>
              Enregistrer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("none")}>
              Annuler
            </Button>
          </div>
        </form>
      )}
      {canDelete && mode === "delete" && (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border bg-card p-3">
          <p className="text-sm">Supprimer cette version « à vérifier » ? Si elle en avait fermé une autre, celle-ci reste close à sa date de fin : saisis alors une nouvelle version à partir de cette date.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" autoFocus onClick={() => setMode("none")}>
              Annuler
            </Button>
            <Button type="submit" name="intent" value="delete" size="sm" variant="destructive" aria-disabled={busy} onClick={guard}>
              Supprimer
            </Button>
          </div>
        </form>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Enregistrement…
        </p>
      )}
      {state.message && !busy && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}
