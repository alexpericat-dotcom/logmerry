"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { searchNotes, type SearchResult } from "@/app/(app)/notes/search-actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NOTE_TYPE_LABELS } from "@/lib/domain/notes";
import { SEARCH_MAX, normalizeQuery } from "@/lib/domain/search";
import { cn } from "@/lib/utils";

const DELAY_MS = 200;

/** Bouton « Rechercher » + palette ⌘K / Ctrl+K (<dialog> natif : piège de focus, Échap et retour du focus). */
export function SearchPalette({ labelClass }: { labelClass: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const latest = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [answered, setAnswered] = useState(""); // requête à laquelle correspondent les résultats
  const [active, setActive] = useState(0);

  const open = () => dialog.current?.showModal();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      if (!dialog.current?.open) open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = normalizeQuery(query);

  useEffect(() => {
    const id = ++latest.current; // invalide aussi toute réponse en vol (saisie vidée, palette fermée)
    if (!q) return;
    const timer = setTimeout(async () => {
      let state: Awaited<ReturnType<typeof searchNotes>>;
      try {
        state = await searchNotes(q);
      } catch {
        state = { results: [], message: "Recherche impossible pour le moment. Réessaie." };
      }
      if (id !== latest.current) return; // réponse périmée
      setResults(state.results);
      setMessage(state.message ?? null);
      setActive(0);
      setAnswered(q);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [q]);

  // Les résultats ne valent que pour la saisie à laquelle ils répondent.
  const done = !!q && answered === q;
  const shown = useMemo(() => (done ? results : []), [done, results]);

  useEffect(() => {
    if (shown.length) document.getElementById(`search-${shown[active]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [active, shown]);

  const choose = (r: SearchResult) => {
    dialog.current?.close();
    router.push(`/notes/${r.id}`);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || !shown.length) return;
    if (e.key === "ArrowDown") setActive((active + 1) % shown.length);
    else if (e.key === "ArrowUp") setActive((active - 1 + shown.length) % shown.length);
    else if (e.key === "Enter") choose(shown[active]);
    else return;
    e.preventDefault();
  };

  const status = done ? (message ?? (shown.length ? "" : "Aucun résultat")) : "";

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Rechercher (⌘K)"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex h-9 w-full items-center gap-3 rounded-md border-l-[3px] border-transparent px-2 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Search size={16} aria-hidden="true" />
        <span className={labelClass}>Rechercher</span>
      </button>

      <dialog
        ref={dialog}
        aria-label="Rechercher dans mes notes"
        onClose={() => {
          setQuery("");
          setAnswered("");
        }}
        onClick={(e) => {
          // Seul le fond (hors du cadre) ferme ; le rembourrage du cadre ne ferme pas.
          const r = e.currentTarget.getBoundingClientRect();
          const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
          if (outside) e.currentTarget.close();
        }}
        className="m-auto mt-[15vh] w-[min(36rem,calc(100%-2rem))] rounded-lg border bg-background p-3 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <Input
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls="search-results"
          aria-activedescendant={shown.length ? `search-${shown[active].id}` : undefined}
          aria-label="Rechercher dans mes notes"
          placeholder="Rechercher dans mes notes…"
          maxLength={SEARCH_MAX}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
        />
        <ul id="search-results" role="listbox" aria-label="Résultats" className="mt-2 max-h-80 overflow-y-auto">
          {shown.map((r, i) => (
            <li
              key={r.id}
              id={`search-${r.id}`}
              role="option"
              aria-selected={i === active}
              onClick={() => choose(r)}
              onMouseMove={() => setActive(i)}
              className={cn("cursor-pointer rounded-md px-2 py-2", i === active && "bg-accent")}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{r.title}</span>
                <Badge variant="secondary">{NOTE_TYPE_LABELS[r.type]}</Badge>
              </div>
              {r.excerpt && <p className="truncate text-sm text-muted-foreground">{r.excerpt}</p>}
            </li>
          ))}
        </ul>
        <p role="status" className={cn("px-2 pt-2 text-sm text-muted-foreground", !status && "sr-only")}>
          {status}
        </p>
      </dialog>
    </>
  );
}
