"use client";

import { useActionState, useState } from "react";

import { updateRule, type RuleActionState } from "@/app/(app)/regles/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitWith } from "@/lib/submit-with";

type Intent = "verify" | "unverify" | "revalidate" | "delete";
const NONE: RuleActionState = {};

/** Boutons d'une version selon son statut (calculé côté serveur) ; la base impose les mêmes règles. */
export function RuleActions({ id, canVerify, canUnverify, canRevalidate, canDelete, missingLink }: { id: string; canVerify: boolean; canUnverify: boolean; canRevalidate: boolean; canDelete: boolean; missingLink: boolean }) {
  const [verify, verifyAction, verifying] = useActionState<RuleActionState, FormData>(updateRule.bind(null, id, "verify" as Intent), NONE);
  const [unverify, unverifyAction, unverifying] = useActionState<RuleActionState, FormData>(updateRule.bind(null, id, "unverify" as Intent), NONE);
  const [revalidate, revalidateAction, revalidating] = useActionState<RuleActionState, FormData>(updateRule.bind(null, id, "revalidate" as Intent), NONE);
  const [del, deleteAction, deleting] = useActionState<RuleActionState, FormData>(updateRule.bind(null, id, "delete" as Intent), NONE);
  const [mode, setMode] = useState<"none" | "revalidate" | "delete">("none");
  const busy = verifying || unverifying || revalidating || deleting;
  const message = verify.message ?? unverify.message ?? revalidate.message ?? del.message;
  const guard = (e: React.MouseEvent) => busy && e.preventDefault();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canVerify && (
          <form onSubmit={submitWith(verifyAction)}>
            <Button type="submit" size="sm" aria-disabled={busy} onClick={guard}>
              {verifying ? "Vérification…" : "Marquer vérifiée"}
            </Button>
          </form>
        )}
        {missingLink && <p className="text-sm text-muted-foreground">Pour la marquer « Vérifiée », il faut un lien officiel https dans la source : supprime cette version et saisis-la de nouveau.</p>}
        {canUnverify && (
          <form onSubmit={submitWith(unverifyAction)}>
            <Button type="submit" size="sm" variant="outline" aria-disabled={busy} onClick={guard}>
              {unverifying ? "…" : "Repasser à vérifier"}
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
      {mode === "revalidate" && (
        <form onSubmit={submitWith(revalidateAction)} noValidate className="grid max-w-md gap-3 rounded-md border bg-card p-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`rv-${id}-v`}>Date de vérification</Label>
            <Input id={`rv-${id}-v`} name="verified_on" type="date" aria-required="true" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`rv-${id}-r`}>À revérifier avant le</Label>
            <Input id={`rv-${id}-r`} name="revalidate_after" type="date" aria-required="true" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" aria-disabled={busy} onClick={guard}>
              {revalidating ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("none")}>
              Annuler
            </Button>
          </div>
        </form>
      )}
      {mode === "delete" && (
        <form onSubmit={submitWith(deleteAction)} className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
          <p className="text-sm">Supprimer cette version « à vérifier » ?</p>
          <Button type="button" size="sm" variant="outline" autoFocus onClick={() => setMode("none")}>
            Annuler
          </Button>
          <Button type="submit" size="sm" variant="destructive" aria-disabled={busy} onClick={guard}>
            {deleting ? "Suppression…" : "Supprimer"}
          </Button>
        </form>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
