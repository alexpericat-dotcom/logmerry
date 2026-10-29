import { fake } from "../harness.ts";

/**
 * Doublure des modules `lib/ai/*` (appels à Claude) : aucun appel externe. Chaque fonction note ce qu'on lui a envoyé et répond ce que le test a posé
 * dans `fake.ai.replies[nom]` ; une `Error` posée est levée, comme un échec du modèle.
 */
function answer(name: string, args: unknown[], optional = false): unknown {
  fake.ai.calls.push({ name, message: Array.isArray(args[0]) ? (args[0] as string[]).join("\n") : String(args[0] ?? ""), args });
  const reply = fake.ai.replies[name];
  if (reply === undefined && !optional) fake.problems.push(`aucune réponse posée pour l'IA « ${name} »`); // un test qui l'oublie ne doit pas passer
  const value = typeof reply === "function" ? (reply as (...a: unknown[]) => unknown)(...args) : reply;
  if (value instanceof Error) throw value;
  return value;
}

export const orderWithClaude = async (...args: unknown[]) => answer("order", args) as Record<string, unknown>;
export const composeWithClaude = async (...args: unknown[]) => answer("compose", args) as Record<string, unknown>;
export const proposeWithClaude = async (...args: unknown[]) => answer("propose", args) as unknown[];
export const proposeTasksWithClaude = async (...args: unknown[]) => answer("tasks", args) as unknown[];
export const reviewWithClaude = async (...args: unknown[]) => answer("review", args) as Record<string, unknown>;
export const writePromptWithClaude = async (...args: unknown[]) => answer("prompt", args) as string;
export const askClaude = async (...args: unknown[]) => answer("ask", args, true) as { answer: string; citations: string[] };
export const summarizeWithClaude = async (...args: unknown[]) => answer("summary", args) as string;

export const EMBEDDING_MODEL = "mistral-embed";
/** Vectorisation (service externe) : on note les textes qui partiraient ; vecteur de trois valeurs par texte sauf réponse posée. */
export const embedTexts = async (...args: unknown[]) => {
  const texts = args[0] as string[];
  const value = answer("embed", args, true) as number[][] | undefined;
  return value ?? texts.map(() => [0, 0, 0]);
};
