"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Nom accessible du groupe, ex. « Supprimer la facture F-1 ». */
  label: string;
  /** La question posée, ex. « Supprimer cette facture ? ». */
  question: ReactNode;
  /** Ce que l'action entraîne (« Cette action est définitive. »…). */
  children?: ReactNode;
  /** Message d'échec de l'action, annoncé. */
  error?: string;
  pending: boolean;
  onCancel: () => void;
  confirmLabel?: string;
  pendingLabel?: string;
  /** « danger » : bordure destructive (suppression, refus) ; « neutral » : confirmation sans risque (acceptation). */
  tone?: "danger" | "neutral";
  /** « compact » : dans une ligne de liste (texte et boutons plus petits). */
  size?: "default" | "compact";
  /** Le panneau prend aussi la touche Échap pour lui seul (panneaux imbriqués dans un autre qui la lit). */
  stopEscape?: boolean;
  className?: string;
} & ({ action: (formData: FormData) => void; onConfirm?: never } | { onConfirm: () => void; action?: never });

/**
 * Confirmation d'une action qu'on ne défait pas (suppression, refus…) : le même panneau partout. « Annuler » reçoit le focus à l'ouverture (le choix sûr),
 * Échap ferme (sauf pendant l'action), le texte d'erreur est annoncé. L'appelant rend le focus à son bouton d'origine à la fermeture.
 * `action` : formulaire (Server Action via `useActionState`) ; `onConfirm` : l'appelant lance l'action lui-même.
 */
export function ConfirmPanel({ label, question, children, error, pending, onCancel, confirmLabel = "Oui, supprimer", pendingLabel = "Suppression…", tone = "danger", size = "default", stopEscape = false, className, action, onConfirm }: Props) {
  const cancel = useRef<HTMLButtonElement>(null);
  const detailsId = useId();
  useEffect(() => cancel.current?.focus(), []);
  const compact = size === "compact";
  return (
    <form
      action={action}
      role="group"
      aria-label={label}
      aria-describedby={children ? detailsId : undefined}
      onSubmit={
        onConfirm
          ? (e) => {
              e.preventDefault();
              if (!pending) onConfirm();
            }
          : undefined
      }
      onKeyDown={(e) => {
        if (e.key !== "Escape" || pending) return;
        e.preventDefault(); // la confirmation prend la touche : un panneau parent (assistant…) reste ouvert
        if (stopEscape) e.stopPropagation();
        onCancel();
      }}
      className={cn("flex max-w-2xl flex-col rounded-md border p-3", compact ? "gap-2" : "gap-3", tone === "danger" ? "border-destructive" : "border-input", className)}
    >
      <p className={cn("font-semibold", compact && "text-sm")}>
        {question}
      </p>
      {children && (
        <div id={detailsId} className="text-sm text-muted-foreground">
          {children}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" size={compact ? "sm" : "default"} variant={tone === "danger" ? "destructive" : "default"} disabled={action ? pending : undefined} aria-disabled={onConfirm ? pending : undefined}>
          {pending ? pendingLabel : confirmLabel}
        </Button>
        {/* aria-disabled et non disabled : le bouton qui a le focus ne le perd pas quand l'action démarre ; Échap et clic sont ignorés tant qu'elle tourne. */}
        <Button ref={cancel} type="button" size={compact ? "sm" : "default"} variant="outline" aria-disabled={pending} onClick={() => !pending && onCancel()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
