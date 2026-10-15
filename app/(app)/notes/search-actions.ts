"use server";

import { redirect } from "next/navigation";

import { listAllClients } from "@/lib/db/clients";
import { matchClients, type ClientOrigin, type ClientStatus } from "@/lib/domain/clients";
import { excerpt, type NoteType } from "@/lib/domain/notes";
import { normalizeQuery } from "@/lib/domain/search";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = { id: string; title: string; type: NoteType; excerpt: string };
export type ClientHit = { id: string; name: string; status: ClientStatus; origin: ClientOrigin };
export type SearchState = { results: SearchResult[]; clients: ClientHit[]; message?: string };

const SEARCH_FAILED = "Recherche impossible pour le moment. Réessaie.";

/** Recherche dans mes notes (fonction `search_notes`) et mes fiches (nom), sous RLS. Sans session : redirection vers la connexion. */
export async function searchNotes(raw: string): Promise<SearchState> {
  const query = normalizeQuery(String(raw ?? ""));
  let failed = false;
  let signedOut = false;
  let results: SearchResult[] = [];
  let clients: ClientHit[] = [];

  try {
    const supabase = await createClient();
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) {
      signedOut = true;
    } else if (query) {
      const [{ data, error }, all] = await Promise.all([supabase.rpc("search_notes", { query }), listAllClients()]);
      clients = matchClients(all, query).map((c) => ({ id: c.id, name: c.name, status: c.status, origin: c.origin }));
      if (error) failed = true;
      else {
        results = (data ?? []).map((n: { id: string; title: string; body: string; type: NoteType }) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          excerpt: excerpt(n.body, 100),
        }));
      }
    }
  } catch {
    failed = true;
  }

  // redirect() lève une exception : à appeler hors du try.
  if (signedOut) redirect("/auth/login");
  return failed ? { results: [], clients: [], message: SEARCH_FAILED } : { results, clients };
}
