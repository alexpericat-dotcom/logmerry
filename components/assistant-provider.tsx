"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { purgeHistory } from "@/app/(app)/history-actions";
import type { HistoryMessage, StoredSource } from "@/lib/domain/history";

export type AssistantMessage = { id: string; role: "user" | "assistant"; text: string; sources?: StoredSource[] };

type Assistant = {
  isOpen: boolean;
  /** L'historique enregistré n'a pas pu être relu : le panneau le dit au lieu de paraître vide. */
  historyFailed: boolean;
  messages: AssistantMessage[];
  pending: boolean;
  error: string | null;
  /** Question à reproposer dans le champ (saisie conservée après une erreur). */
  draft: string;
  setDraft: (value: string) => void;
  openPanel: () => void;
  closePanel: () => void;
  ask: (question: string) => Promise<void>;
  retry: () => Promise<void>;
  /** Supprime tout l'historique enregistré puis vide le panneau ; rend `false` si la suppression a échoué (le panneau garde ses messages). */
  purge: () => Promise<boolean>;
};

const AssistantContext = createContext<Assistant | null>(null);

export function useAssistant(): Assistant {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant doit être utilisé dans AssistantProvider.");
  return ctx;
}

const GENERIC_ERROR = "L'assistant n'a pas pu répondre pour le moment.";
const TIMEOUT_MS = 70_000; // un peu plus que les 60 s de Claude côté serveur

/** État de l'assistant au niveau de la zone privée : la conversation survit au changement de page ; l'historique enregistré est relu au chargement. */
export function AssistantProvider({
  children,
  initialMessages = [],
  historyFailed = false,
}: {
  children: React.ReactNode;
  initialMessages?: HistoryMessage[];
  historyFailed?: boolean;
}) {
  const [isOpen, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const busy = useRef(false); // garde synchrone : deux envois très rapprochés ne partent pas deux fois
  const lastQuestion = useRef("");
  const opener = useRef<HTMLElement | null>(null);

  const openPanel = useCallback(() => {
    if (!isOpen) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, [isOpen]);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Le focus revient à l'élément qui l'avait avant l'ouverture.
    const target = opener.current;
    opener.current = null;
    if (target && document.contains(target)) requestAnimationFrame(() => target.focus());
    else requestAnimationFrame(() => document.querySelector<HTMLElement>("h1")?.focus());
  }, []);

  const send = useCallback(async (question: string, addMessage: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    lastQuestion.current = question;
    if (addMessage) setMessages((m) => [...m, { id: `local-${nextId.current++}`, role: "user", text: question }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json = (await res.json().catch(() => null)) as { answer?: string; sources?: StoredSource[]; error?: string } | null;
      if (!res.ok || !json?.answer) throw new Error(json?.error ?? GENERIC_ERROR);
      const answer = json.answer;
      setMessages((m) => [...m, { id: `local-${nextId.current++}`, role: "assistant", text: answer, sources: Array.isArray(json.sources) ? json.sources : [] }]);
    } catch (e) {
      setError(e instanceof Error && e.name !== "TimeoutError" && e.message ? e.message : GENERIC_ERROR);
      // Saisie conservée, sans écraser ce que j'ai tapé entre-temps.
      setDraft((d) => (d.trim() ? d : question));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      openPanel();
      if (busy.current) {
        setDraft(q); // une réponse est en cours : la question n'est pas perdue, elle attend dans le champ
        return;
      }
      setDraft("");
      await send(q, true);
    },
    [openPanel, send],
  );

  const retry = useCallback(async () => {
    if (!lastQuestion.current) return;
    await send(lastQuestion.current, false);
  }, [send]);

  const purge = useCallback(async () => {
    if (busy.current) return false; // pas de suppression pendant qu'une réponse arrive
    try {
      const r = await purgeHistory();
      if (!r.ok) return false;
    } catch {
      return false;
    }
    setMessages([]);
    setError(null);
    setDraft("");
    lastQuestion.current = "";
    return true;
  }, []);

  const value = useMemo(
    () => ({ isOpen, historyFailed, messages, pending, error, draft, setDraft, openPanel, closePanel, ask, retry, purge }),
    [isOpen, historyFailed, messages, pending, error, draft, openPanel, closePanel, ask, retry, purge],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
