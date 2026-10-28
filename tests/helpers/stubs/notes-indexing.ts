import { fake } from "../harness.ts";

/** Doublure de l'indexation des notes : aucun appel à Mistral, on note seulement quelle note devait être indexée. */
export async function indexNote(_supabase: unknown, id: string): Promise<"indexed" | "failed"> {
  fake.indexed.push(id);
  return fake.indexResult;
}
