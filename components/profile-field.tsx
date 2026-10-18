"use client";

import { CheckCircle2, CircleDashed, CircleDot } from "lucide-react";
import { useActionState, useState } from "react";

import { saveProfile, type ProfileFormState } from "@/app/(app)/profil/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OTHER, OTHER_MAX, FREE_TEXT_MAX, THRESHOLDS, fieldState, type FieldState, type ProfileFieldDef } from "@/lib/domain/profile";
import { formatDateTime } from "@/lib/format";
import { submitWith } from "@/lib/submit-with";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";

/** État d'un champ : icône et mot, jamais la couleur seule. */
export function ConfirmationState({ state, confirmedAt }: { state: FieldState; confirmedAt: string | null }) {
  if (state === "confirmed")
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        <CheckCircle2 size={16} aria-hidden="true" /> Confirmé le {formatDateTime(confirmedAt as string).split(",")[0]}
      </span>
    );
  if (state === "declared")
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        <CircleDot size={16} aria-hidden="true" /> Déclaré
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
      <CircleDashed size={16} aria-hidden="true" /> À confirmer
    </span>
  );
}

export function ProfileField({ def, value, other, confirmedAt }: { def: ProfileFieldDef; value: string | null; other: string | null; confirmedAt: string | null }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(saveProfile.bind(null, def.key), {});
  const [draft, setDraft] = useState(value ?? "");
  const [draftOther, setDraftOther] = useState(other ?? "");
  const saved = fieldState(value, confirmedAt, def.key);
  // Comparé comme le serveur l'enregistre (espaces et NUL retirés) : sinon un texte « abc  » resterait « modifié » après l'envoi.
  const clean = (t: string) => t.replaceAll("\u0000", "").trim();
  const dirty = clean(draft) !== (value ?? "") || (draft === OTHER && clean(draftOther) !== (other ?? ""));
  const id = `pf-${def.key}`;
  // Le bouton cliqué annonce l'envoi ; aria-disabled plutôt que disabled : le focus n'est pas perdu pendant l'envoi.
  const [sending, setSending] = useState<"save" | "confirm">("save");
  const guard = (intent: "save" | "confirm") => (e: React.MouseEvent) => {
    if (pending) e.preventDefault();
    else setSending(intent);
  };

  return (
    <form onSubmit={submitWith(formAction)} noValidate className="flex max-w-2xl flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{def.label}</Label>
        <ConfirmationState state={saved} confirmedAt={confirmedAt} />
      </div>
      {def.kind === "choice" && (
        <>
          <select id={id} name="value" value={draft} onChange={(e) => setDraft(e.target.value)} className={selectClass} aria-describedby={state.error ? `${id}-error` : undefined}>
            <option value="">À confirmer</option>
            {def.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {def.allowOther && <option value={OTHER}>Autre</option>}
          </select>
          {def.allowOther && draft === OTHER && (
            <Input name="other" aria-describedby={state.error ? `${id}-error` : undefined} aria-label={`${def.label} : précise`} value={draftOther} onChange={(e) => setDraftOther(e.target.value)} maxLength={OTHER_MAX} autoComplete="off" />
          )}
        </>
      )}
      {def.kind === "date" && <Input id={id} name="value" type="date" value={draft} onChange={(e) => setDraft(e.target.value)} aria-describedby={state.error ? `${id}-error` : undefined} />}
      {def.kind === "text" && <Textarea id={id} name="value" aria-describedby={state.error ? `${id}-error` : undefined} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={FREE_TEXT_MAX} rows={3} />}
      {def.hint && <p className="text-sm text-muted-foreground">{def.hint}</p>}
      {saved === "declared" && !dirty && (
        <>
          <input type="hidden" name="expected" value={value ?? ""} />
          <input type="hidden" name="expected_other" value={other ?? ""} />
        </>
      )}
      {saved === "confirmed" && dirty && <input type="hidden" name="was_confirmed" value="1" />}
      {state.error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="intent" value="save" size="sm" aria-disabled={pending} onClick={guard("save")}>
          {pending && sending === "save" ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {saved === "declared" && !dirty && (
          <Button type="submit" name="intent" value="confirm" size="sm" variant="outline" aria-disabled={pending} onClick={guard("confirm")}>
            {pending && sending === "confirm" ? "Confirmation…" : "Confirmer"}
          </Button>
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    </form>
  );
}

export function AlertThresholds({ active }: { active: number[] }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(saveProfile.bind(null, "alert_thresholds"), {});
  return (
    <form onSubmit={submitWith(formAction)} noValidate className="flex max-w-2xl flex-col gap-2 rounded-md border bg-card p-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Seuils d&apos;alerte de plafond</legend>
        <div className="flex flex-wrap gap-4">
          {THRESHOLDS.map((t) => (
            <label key={t} className="flex min-h-9 items-center gap-2 text-sm max-md:min-h-11">
              <input type="checkbox" name="threshold" value={t} defaultChecked={active.includes(t)} className="size-4" />
              Alerter à {t} %
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" aria-disabled={pending} onClick={(e) => pending && e.preventDefault()}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    </form>
  );
}
