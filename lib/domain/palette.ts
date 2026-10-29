/** Une ligne de la palette ⌘K : une note, une fiche ou une mission ; l'ordre de la liste est celui de la navigation au clavier. Les formes des résultats sont celles de l'appelant. */
export type PaletteItem<N, C, M> = { kind: "note"; id: string; note: N } | { kind: "client"; id: string; client: C } | { kind: "mission"; id: string; mission: M };

const ROUTES = { note: "notes", client: "clients", mission: "missions" } as const;
export const GROUP_LABELS = { note: "Notes", client: "Clients", mission: "Missions" } as const;
type Kind = keyof typeof ROUTES;

export const ASSISTANT_OPTION_ID = "search-assistant";
export const paletteOptionId = (item: { kind: string; id: string }) => `search-${item.kind}-${item.id}`;
export const itemHref = (item: { kind: Kind; id: string }) => `/${ROUTES[item.kind]}/${item.id}`;

/** Titre de groupe : seulement à la première ligne d'un type. */
export const startsGroup = (shown: { kind: string }[], i: number) => i === 0 || shown[i - 1].kind !== shown[i].kind;

/** ⌘K ou Ctrl+K (majuscule comprise), hors saisie en composition (IME). */
export const isPaletteShortcut = (e: { isComposing: boolean; key: string; metaKey: boolean; ctrlKey: boolean }) => !e.isComposing && e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);

/** Les résultats ne valent que pour la saisie à laquelle ils répondent (`done`) : notes, puis fiches, puis missions. */
export function paletteItems<N extends { id: string }, C extends { id: string }, M extends { id: string }>(done: boolean, notes: N[], clients: C[], missions: M[]): PaletteItem<N, C, M>[] {
  if (!done) return [];
  return [
    ...notes.map((note): PaletteItem<N, C, M> => ({ kind: "note", id: note.id, note })),
    ...clients.map((client): PaletteItem<N, C, M> => ({ kind: "client", id: client.id, client })),
    ...missions.map((mission): PaletteItem<N, C, M> => ({ kind: "mission", id: mission.id, mission })),
  ];
}

/**
 * Position dans la liste : l'entrée « Demander à l'assistant » est en tête dès qu'une requête `q` est saisie, les lignes suivent. `active` peut être périmé quand
 * les résultats changent : `current` le ramène dans la liste.
 */
export function paletteNav<T extends { kind: string; id: string }>(q: string, shown: T[], active: number) {
  const hasAssistant = !!q;
  const total = (hasAssistant ? 1 : 0) + shown.length;
  const current = Math.min(active, Math.max(total - 1, 0));
  const activeResult: T | undefined = hasAssistant ? shown[current - 1] : shown[current];
  const activeId = !total ? undefined : hasAssistant && current === 0 ? ASSISTANT_OPTION_ID : activeResult ? paletteOptionId(activeResult) : undefined;
  return { hasAssistant, total, current, activeResult, activeId };
}

/** Flèches : élément suivant ou précédent, avec bouclage ; `null` pour toute autre touche ou une liste vide. */
export function nextActive(key: string, current: number, total: number): number | null {
  if (!total) return null;
  if (key === "ArrowDown") return (current + 1) % total;
  if (key === "ArrowUp") return (current - 1 + total) % total;
  return null;
}

/** Entrée : l'assistant s'il est actif, sinon la ligne active, sinon rien. */
export function enterAction<T>(nav: { hasAssistant: boolean; current: number; activeResult: T | undefined }): { type: "assistant" } | { type: "item"; item: T } | null {
  if (nav.hasAssistant && nav.current === 0) return { type: "assistant" };
  return nav.activeResult ? { type: "item", item: nav.activeResult } : null;
}

/** Texte de la région vocale : le message de la réponse, sinon « Aucun résultat » ; vide tant que la réponse n'est pas arrivée. */
export function statusText(done: boolean, message: string | null, shownCount: number): string {
  return done ? (message ?? (shownCount ? "" : "Aucun résultat")) : "";
}
