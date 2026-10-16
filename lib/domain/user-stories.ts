export const STORY_TITLE_MAX = 200;
export const STORY_ROLE_MAX = 200;
export const STORY_BENEFIT_MAX = 300;
export const STORY_CRITERIA_MAX = 4000;

export const STORY_STATUSES = ["todo", "in_progress", "done"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];
export const STORY_STATUS_LABELS: Record<StoryStatus, string> = { todo: "À faire", in_progress: "En cours", done: "Terminée" };

/** Suite de Fibonacci des points d'effort (jamais des heures). */
export const STORY_POINTS = [1, 2, 3, 5, 8, 13] as const;

export const parseStoryStatus = (value: unknown): StoryStatus | null => STORY_STATUSES.find((s) => s === value) ?? null;

export type StoryInput = { title: string; role: string; benefit: string; acceptance_criteria: string; points: string; status: string };
export type StoryValues = { title: string; role: string | null; benefit: string | null; acceptance_criteria: string | null; points: number | null; status: StoryStatus };
export type StoryErrors = { title?: string; role?: string; benefit?: string; acceptance_criteria?: string; points?: string; status?: string };

const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

/** Retire « afin » puis « de » / « d' » seulement s'ils introduisent un infinitif (« de connaître », « d'agir », « de ne rien oublier ») : « de Gaulle » et « d'abord » restent intacts. « afin que… » est gardé tel quel. */
function stripBenefitLead(text: string): string {
  const t = text.replace(/^afin\s+(?=d(?:e\s|['’])|qu)/i, "");
  const m = /^d(?:e\s+|['’]\s*)(\S+)/i.exec(t);
  if (m && /(?:er|ir|re|oir)$|^ne$|^n['’]/i.test(m[1])) return t.replace(/^d(?:e\s+|['’]\s*)/i, "");
  return t;
}

/** Valide une user story ; un champ facultatif vide devient `null` ; les points viennent de la suite de Fibonacci. */
export function validateStoryInput(input: StoryInput): { ok: true; value: StoryValues } | { ok: false; errors: StoryErrors } {
  // Le formulaire et l'IA écrivent parfois les mots de liaison que la phrase ajoute elle-même : « en tant que… », « afin de… ».
  // « je veux », « en tant que » et « afin de » sont ajoutés par la phrase.
  const title = stripNul(input.title).trim().replace(/^je veux\s+/i, "");
  const role = stripNul(input.role).trim().replace(/^en tant qu(?:e\s+|['’]\s*)/i, "");
  const benefit = stripBenefitLead(stripNul(input.benefit).trim());
  const criteria = stripNul(input.acceptance_criteria).trim();
  const status = parseStoryStatus(input.status);
  const pointsText = input.points.trim();
  // Entier écrit en chiffres seulement : « 5.0 », « 0x5 » ou « 5e0 » ne sont pas des points.
  const points = pointsText === "" ? null : /^\d+$/.test(pointsText) ? Number(pointsText) : Number.NaN;
  const errors: StoryErrors = {};
  if (!title) errors.title = "Saisis le titre de la user story (ce que tu veux faire).";
  else if (length(title) > STORY_TITLE_MAX) errors.title = `Le titre doit faire ${STORY_TITLE_MAX} caractères au plus.`;
  if (length(role) > STORY_ROLE_MAX) errors.role = `Le rôle doit faire ${STORY_ROLE_MAX} caractères au plus.`;
  if (length(benefit) > STORY_BENEFIT_MAX) errors.benefit = `Le bénéfice doit faire ${STORY_BENEFIT_MAX} caractères au plus.`;
  if (length(criteria) > STORY_CRITERIA_MAX) errors.acceptance_criteria = `Les critères doivent faire ${STORY_CRITERIA_MAX.toLocaleString("fr-FR")} caractères au plus.`;
  if (points !== null && !STORY_POINTS.some((p) => p === points)) errors.points = `Choisis des points parmi ${STORY_POINTS.join(", ")}.`;
  if (!status) errors.status = "Choisis un statut.";
  if (Object.keys(errors).length || !status) return { ok: false, errors };
  return { ok: true, value: { title, role: role || null, benefit: benefit || null, acceptance_criteria: criteria || null, points, status } };
}

/** Première lettre en minuscule dans la phrase quand le texte commence par un verbe à l'infinitif (« Suivre », « Se connecter ») : un nom propre, une marque ou un sigle (« Notion », « Excel », « PDF ») garde sa majuscule. */
const lowerFirst = (t: string) => (/^(?:Se |S['’])/.test(t) || /^[A-ZÀ-Ý][a-zà-ÿ]*(?:er|ir|re|oir)(?![a-zà-ÿ])/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

const VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;
/** Élision française devant une voyelle : « que » devient « qu' », « de » devient « d' ».
 * ponytail : voyelles seulement ; le « h » (muet ou aspiré) n'est pas traité, il demande un dictionnaire. */
const elide = (word: string, next: string) => (VOWEL.test(next) ? `${word.slice(0, -1)}'${next}` : `${word} ${next}`);

/** « En tant que {rôle}, je veux {titre}, afin de {bénéfice} » (avec élision) ; les parties absentes sont omises, le titre seul en dernier recours. */
export function storySentence(s: { title: string; role: string | null; benefit: string | null }): string {
  const parts = [
    s.role ? `En tant ${elide("que", lowerFirst(s.role))}` : null,
    `${s.role ? "je" : "Je"} veux ${lowerFirst(s.title)}`,
    s.benefit ? `afin ${/^qu(?:e\s|['’])/i.test(s.benefit) ? s.benefit : elide("de", lowerFirst(s.benefit))}` : null,
  ];
  return parts.filter(Boolean).join(", ");
}

export type StoryRow = { id: string; status: StoryStatus };

/** Progression d'un backlog : stories terminées sur stories totales. */
export function storyProgress(stories: StoryRow[]): { done: number; total: number } {
  return { done: stories.filter((s) => s.status === "done").length, total: stories.length };
}

/** « 2 sur 5 stories terminées » ; sans story, « Aucune user story » (jamais « 0 sur 0 »). */
export function progressLabel({ done, total }: { done: number; total: number }): string {
  if (total === 0) return "Aucune user story";
  return `${done} sur ${total} ${total > 1 ? "stories terminées" : "story terminée"}`;
}

/** Position de la prochaine story : la dernière place du backlog. */
export const nextPosition = (positions: number[]): number => (positions.length ? Math.max(...positions) + 1 : 0);

/** Vrai si `submitted` contient exactement les mêmes identifiants que `current`, une fois chacun (un réordonnancement ne perd, n'ajoute ni ne duplique rien : sinon la liste a changé entre-temps). */
export function isPermutation(current: string[], submitted: string[]): boolean {
  return current.length === submitted.length && new Set(submitted).size === submitted.length && submitted.every((id) => current.includes(id));
}

export const REORDER_MAX = 500;

/** Liste d'identifiants reçue d'un glisser-déposer : un tableau d'UUID (rendus en minuscules, comme la base) de 500 éléments au plus ; sinon `null`. */
export function parseReorderIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > REORDER_MAX) return null;
  if (!value.every((v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))) return null;
  return value.map((v: string) => v.toLowerCase());
}
