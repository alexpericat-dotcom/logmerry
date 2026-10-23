import "server-only";


import { createClient } from "@/lib/supabase/server";
import type { Db } from "@/lib/supabase/server";

export type Session<T> = { status: "signed-out" } | { status: "failed" } | { status: "ok"; value: T };

/** Exécute `run` avec un client authentifié ; sans session, `run` n'est jamais appelé. */
export async function withSession<T>(run: (supabase: Db) => Promise<T>): Promise<Session<T>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return { status: "signed-out" };
    return { status: "ok", value: await run(supabase) };
  } catch {
    return { status: "failed" };
  }
}
