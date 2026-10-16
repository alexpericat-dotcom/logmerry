import { MISSION_STATUS_LABELS, type MissionStatus } from "./missions.ts";
import { STORY_STATUS_LABELS, storySentence, type StoryStatus } from "./user-stories.ts";

/** Ce que le prompt contient de la mission : la mission seule, puis de plus en plus de son backlog. */
export const CONTEXT_LEVELS = ["mission", "backlog", "stories", "tasks"] as const;
export type ContextLevel = (typeof CONTEXT_LEVELS)[number];
export const CONTEXT_LEVEL_LABELS: Record<ContextLevel, string> = {
  mission: "La mission seule",
  backlog: "Avec le backlog (titres, statuts, points)",
  stories: "Avec les stories détaillées (rôle, bénéfice, critères)",
  tasks: "Avec les tâches (et leur état)",
};
export const parseContextLevel = (value: unknown): ContextLevel | null => CONTEXT_LEVELS.find((l) => l === value) ?? null;

/** Plafond du bloc de contexte (caractères) : au-delà, les dernières stories sont omises et le bloc le dit. */
export const CONTEXT_MAX = 30_000;

export type MissionForContext = { title: string; status: MissionStatus; start_date: string | null; end_date: string | null; clientName: string | null };
export type StoryForContext = { id: string; title: string; role: string | null; benefit: string | null; acceptance_criteria: string | null; points: number | null; status: StoryStatus };
export type TaskForContext = { story_id: string; title: string; done: boolean };

const indent = (text: string, pad: string) => text.split("\n").map((l) => (l.trim() ? pad + l : l)).join("\n");

function storyBlock(n: number, s: StoryForContext, tasks: TaskForContext[], level: ContextLevel): string {
  const points = s.points !== null ? ` — ${s.points} pts` : "";
  const lines = [`${n}. [${STORY_STATUS_LABELS[s.status]}] ${s.title}${points}`];
  if (level === "stories" || level === "tasks") {
    if (s.role || s.benefit) lines.push(`   - ${storySentence(s)}`);
    if (s.acceptance_criteria) lines.push(`   - Critères d'acceptation :\n${indent(s.acceptance_criteria, "     ")}`);
  }
  if (level === "tasks" && tasks.length) {
    const done = tasks.filter((t) => t.done).length;
    lines.push(`   - Tâches (${done} sur ${tasks.length} faites) :`);
    for (const t of tasks) lines.push(`     - [${t.done ? "x" : " "}] ${t.title}`);
  }
  return lines.join("\n");
}

/**
 * Bloc « Contexte » du prompt, en Markdown, construit par le code à partir des données (le modèle ne le recopie pas : il ne peut ni l'abîmer ni y inventer un fait).
 * Une valeur absente est omise, jamais écrite « null » ; le nom du client n'y figure que si `includeClient` ; stories dans l'ordre reçu (de la plus à la moins prioritaire) ;
 * au plus `CONTEXT_MAX` caractères : les dernières stories sont omises et le bloc le dit.
 */
export function buildMissionContext(input: { mission: MissionForContext; stories: StoryForContext[]; tasks: TaskForContext[]; level: ContextLevel; includeClient: boolean }): { text: string; omitted: number } {
  const { mission: m, level } = input;
  const head = ["## Contexte", "", "### Mission", `- Titre : ${m.title}`];
  if (input.includeClient && m.clientName) head.push(`- Client : ${m.clientName}`);
  head.push(`- Statut : ${MISSION_STATUS_LABELS[m.status]}`);
  if (m.start_date) head.push(`- Début : ${m.start_date}`);
  if (m.end_date) head.push(`- Fin : ${m.end_date}`);
  if (level === "mission") return { text: head.join("\n"), omitted: 0 };

  const total = input.stories.length;
  if (total === 0) return { text: [...head, "", "### Backlog", "Aucune user story pour l'instant."].join("\n"), omitted: 0 };

  const tasksOf = new Map<string, TaskForContext[]>();
  for (const t of input.tasks) tasksOf.set(t.story_id, [...(tasksOf.get(t.story_id) ?? []), t]);
  const heading = `### Backlog (${total} user stor${total > 1 ? "ies" : "y"}, de la plus à la moins prioritaire)`;
  let text = [...head, "", heading].join("\n");
  let kept = 0;
  for (const [i, s] of input.stories.entries()) {
    const block = storyBlock(i + 1, s, tasksOf.get(s.id) ?? [], level);
    // Marge pour la ligne d'omission qui suivra.
    if ([...text].length + [...block].length + 120 > CONTEXT_MAX) break;
    text += `\n${block}`;
    kept++;
  }
  const omitted = total - kept;
  if (omitted > 0) text += `\n\n… ${omitted} user stor${omitted > 1 ? "ies omises" : "y omise"} (le contexte est limité à ${CONTEXT_MAX.toLocaleString("fr-FR")} caractères).`;
  return { text, omitted };
}
