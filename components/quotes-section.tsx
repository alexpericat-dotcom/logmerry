"use client";

import { CircleCheck, FileText, Send, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  acceptQuote,
  createQuote,
  deleteQuote,
  refuseQuote,
  sendQuote,
  updateQuote,
  type QuoteActionState,
  type QuoteFormState,
  type QuoteFormValues,
} from "@/app/(app)/clients/quote-actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmPanel } from "@/components/confirm-panel";
import { ErrorSummary, FocusOnMount, selectClass, useFormFields } from "@/components/form-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canAcceptQuote, canDeleteQuote, canEditQuote, canRefuseQuote, canSendQuote, centsToInput, formatCents, QUOTE_STATUS_LABELS, totalCents, type QuoteStatus } from "@/lib/domain/quotes";
import { selectableMissions } from "@/lib/domain/missions";
import { formatDate } from "@/lib/format";

export type QuoteItem = {
  id: string;
  mission_id: string | null;
  amount_ht_cents: number;
  tax_cents: number | null;
  sent_on: string | null;
  status: QuoteStatus;
};
type MissionOption = { id: string; title: string; status: string };


const BADGE = {
  draft: { icon: FileText, variant: "outline" },
  sent: { icon: Send, variant: "secondary" },
  accepted: { icon: CircleCheck, variant: "success" },
  refused: { icon: X, variant: "warning" },
} as const;

/** Pastille de statut : une icône et un mot (jamais la couleur seule). */
function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { icon: Icon, variant } = BADGE[status];
  return (
    <Badge variant={variant}>
      <Icon size={11} aria-hidden="true" />
      {QUOTE_STATUS_LABELS[status]}
    </Badge>
  );
}

function QuoteForm({
  idPrefix,
  action,
  initial,
  missions,
  submitLabel,
  onDone,
  onCancel,
}: {
  idPrefix: string;
  action: (state: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
  initial: QuoteFormValues;
  missions: MissionOption[];
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(action, {});
  useEffect(() => {
    if (state.saved) onDone();
  }, [state.saved, onDone]);
  const values = state.values ?? initial;
  const e = state.errors ?? {};
  const id = (name: string) => `${idPrefix}-${name}`;
  const { field, errorLine } = useFormFields(idPrefix, e);

  return (
    <form
      action={formAction}
      noValidate
      onKeyDown={(ev) => {
        if (ev.key !== "Escape" || pending) return;
        ev.preventDefault();
        onCancel();
      }}
      className="flex max-w-2xl flex-col gap-4 rounded-md border bg-card p-3"
    >
      <ErrorSummary errors={e} prefix={idPrefix} token={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={id("amount_ht")}>Montant hors taxe, en € (obligatoire)</Label>
          <Input {...field("amount_ht")} inputMode="decimal" defaultValue={values.amount_ht} aria-required="true" autoComplete="off" />
          {errorLine("amount_ht")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("tax")}>Taxe, en € (vide si inconnue)</Label>
          <Input {...field("tax")} inputMode="decimal" defaultValue={values.tax} autoComplete="off" />
          {errorLine("tax")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("sent_on")}>Date d&apos;envoi</Label>
          <Input {...field("sent_on")} type="date" defaultValue={values.sent_on} />
          {errorLine("sent_on")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("mission_id")}>Mission liée (facultatif)</Label>
          <select {...field("mission_id")} defaultValue={values.mission_id} className={selectClass}>
            <option value="">Aucune</option>
            {selectableMissions(missions, values.mission_id).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          {errorLine("mission_id")}
        </div>
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

type Mode = "view" | "edit" | "send" | "accept" | "refuse" | "delete";

function QuoteRow({ quote, missions, clientStatus, today }: { quote: QuoteItem; missions: MissionOption[]; clientStatus: "prospect" | "client"; today: string }) {
  const [mode, setMode] = useState<Mode>("view");
  const [message, setMessage] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const [sendDate, setSendDate] = useState(quote.sent_on ?? today);
  const total = totalCents(quote);
  const mission = missions.find((m) => m.id === quote.mission_id);
  const s = quote.status;

  const [announce, setAnnounce] = useState("");
  const run = (fn: () => Promise<QuoteActionState>, done: string) =>
    start(async () => {
      try {
        const r = await fn();
        setMessage(r.message);
        setAnnounce(r.message ? "" : done);
        if (!r.message) setMode("view");
      } catch {
        setMessage("Opération impossible pour le moment. Rien n'a été modifié. Réessaie.");
      }
    });
  const back = () => {
    setMode("view");
    setMessage(undefined);
  };

  // Le focus suit le panneau : sur son premier contrôle à l'ouverture, sur la rangée d'actions à la fermeture (le bouton cliqué a disparu).
  const panelRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const open = mode !== "view" && mode !== "edit";
    // Date d'envoi : le champ (les confirmations donnent le focus à « Annuler » elles-mêmes : ConfirmPanel).
    if (mode === "send") panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    else if (!open && wasOpen.current) actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
    wasOpen.current = open;
  }, [mode]);
  const close = (ev: React.KeyboardEvent) => {
    if (ev.key !== "Escape" || pending) return;
    ev.preventDefault();
    back();
  };

  if (mode === "edit") {
    return (
      <li>
        <QuoteForm
          idPrefix={`edit-${quote.id}`}
          action={updateQuote.bind(null, quote.id)}
          initial={{ amount_ht: centsToInput(quote.amount_ht_cents), tax: quote.tax_cents === null ? "" : centsToInput(quote.tax_cents), sent_on: quote.sent_on ?? "", mission_id: quote.mission_id ?? "" }}
          missions={missions}
          submitLabel="Enregistrer"
          onDone={back}
          onCancel={back}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-semibold tabular-nums">{formatCents(quote.amount_ht_cents)} HT</span>
        <QuoteStatusBadge status={s} />
        <span className="text-sm text-muted-foreground">
          {quote.tax_cents === null ? "taxe inconnue" : `taxe ${formatCents(quote.tax_cents)}`}
          {total !== null && ` · ${formatCents(total)} TTC`}
        </span>
        {quote.sent_on && <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">envoyé le {formatDate(quote.sent_on)}</span>}
      </div>
      {mission && (
        <p className="text-sm">
          Mission :{" "}
          <Link href={`/missions/${mission.id}`} className="underline underline-offset-4">
            {mission.title}
          </Link>
        </p>
      )}

      {mode === "view" && (
        <div ref={actionsRef} className="flex flex-wrap gap-2">
          {canSendQuote(s) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("send")}>
              Marquer envoyé
            </Button>
          )}
          {canAcceptQuote(s) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("accept")}>
              Accepté
            </Button>
          )}
          {canRefuseQuote(s) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("refuse")}>
              Refusé
            </Button>
          )}
          {canEditQuote(s) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
              Modifier
            </Button>
          )}
          {canDeleteQuote(s) && (
            <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setMode("delete")}>
              Supprimer
            </Button>
          )}
        </div>
      )}

      {mode === "send" && (
        <div ref={panelRef} className="flex flex-wrap items-end gap-3" onKeyDown={close}>
          <div className="grid gap-2">
            <Label htmlFor={`send-${quote.id}`}>Date d&apos;envoi</Label>
            <Input id={`send-${quote.id}`} type="date" value={sendDate} onChange={(ev) => setSendDate(ev.target.value)} />
          </div>
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => sendQuote(quote.id, sendDate), "Devis marqué comme envoyé.")}>
            {pending ? "…" : "Marquer envoyé"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={back}>
            Annuler
          </Button>
        </div>
      )}
      {mode === "accept" && (
        <ConfirmPanel
          label="Confirmer l'acceptation"
          question="Marquer ce devis comme accepté ?"
          tone="neutral"
          size="compact"
          confirmLabel="Oui, accepté"
          pendingLabel="…"
          pending={pending}
          onCancel={back}
          onConfirm={() => run(() => acceptQuote(quote.id), "Devis accepté. Une mission à planifier est liée.")}
        >
          {quote.mission_id
            ? "Le devis sera figé : il ne pourra plus changer d'état."
            : clientStatus === "prospect"
              ? "Le devis sera figé, cette fiche deviendra un client et une mission « à planifier » sera créée."
              : "Le devis sera figé et une mission « à planifier » sera créée."}
        </ConfirmPanel>
      )}
      {mode === "refuse" && (
        <ConfirmPanel label="Confirmer le refus" question="Marquer ce devis comme refusé ?" size="compact" confirmLabel="Oui, refusé" pendingLabel="…" pending={pending} onCancel={back} onConfirm={() => run(() => refuseQuote(quote.id), "Devis marqué comme refusé.")}>
          C&apos;est définitif : si le client revient, tu créeras un nouveau devis.
        </ConfirmPanel>
      )}
      {mode === "delete" && (
        <ConfirmPanel label="Confirmer la suppression" question="Supprimer ce brouillon ?" size="compact" pendingLabel="…" pending={pending} onCancel={back} onConfirm={() => run(() => deleteQuote(quote.id), "Brouillon supprimé.")}>
          Cette action est définitive.
        </ConfirmPanel>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <span role="status" className="sr-only">
        {announce}
      </span>
    </li>
  );
}

export function QuotesSection({ clientId, clientStatus, quotes, missions, today }: { clientId: string; clientStatus: "prospect" | "client"; quotes: QuoteItem[]; missions: MissionOption[]; today: string }) {
  const [creating, setCreating] = useState(false);
  const close = () => setCreating(false);
  return (
    <section aria-labelledby="quotes-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="quotes-title" className="text-lg font-semibold">
          Devis
        </h2>
        {!creating && (
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            Nouveau devis
          </Button>
        )}
      </div>
      {creating && (
        <FocusOnMount>
          <QuoteForm
            idPrefix="new-quote"
            action={createQuote.bind(null, clientId)}
            initial={{ amount_ht: "", tax: "", sent_on: "", mission_id: "" }}
            missions={missions}
            submitLabel="Enregistrer le brouillon"
            onDone={close}
            onCancel={close}
          />
        </FocusOnMount>
      )}
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun devis pour cette fiche. Un nouveau devis commence en brouillon : il ne compte nulle part tant qu&apos;il n&apos;est pas envoyé.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {quotes.map((q) => (
            <QuoteRow key={q.id} quote={q} missions={missions} clientStatus={clientStatus} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}
