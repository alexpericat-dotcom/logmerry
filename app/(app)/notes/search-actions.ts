"use server";

import { redirect } from "next/navigation";

import { listAllClients } from "@/lib/db/clients";
import { listAllContactsForSearch } from "@/lib/db/contacts";
import { listAllMissions } from "@/lib/db/missions";
import { matchMissions, type MissionStatus } from "@/lib/domain/missions";
import { matchClients, type ClientOrigin, type ClientStatus } from "@/lib/domain/clients";
import { excerpt, type NoteType } from "@/lib/domain/notes";
import { normalizeQuery } from "@/lib/domain/search";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = { id: string; title: string; type: NoteType; excerpt: string };
/** `via` : le contact qui a fait trouver la fiche (absent quand c'est le nom de la fiche qui correspond). */
export type ClientHit = { id: string; name: string; status: ClientStatus; origin: ClientOrigin; via?: string };
/** `client` : nom de la fiche de la mission (vide si illisible). */
export type MissionHit = { id: string; title: string; status: MissionStatus; client: string };
export type SearchState = { results: SearchResult[]; clients: ClientHit[]; missions: MissionHit[]; message?: string };

const SEARCH_FAILED = "Recherche impossible pour le moment. Réessaie.";

/** Recherche dans mes notes (fonction `search_notes`), mes fiches (nom) et mes missions (titre ou nom du client), sous RLS. Sans session : redirection vers la connexion. */
export async function searchNotes(raw: string): Promise<SearchState> {
  const query = normalizeQuery(String(raw ?? ""));
  let failed = false;
  let signedOut = false;
  let results: SearchResult[] = [];
  let clients: ClientHit[] = [];
  let missions: MissionHit[] = [];

  try {
    const supabase = await createClient();
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) {
      signedOut = true;
    } else if (query) {
      const [{ data, error }, all, contacts, allMissions] = await Promise.all([supabase.rpc("search_notes", { query }), listAllClients(), listAllContactsForSearch(), listAllMissions()]);
      clients = matchClients(all, query, 8, contacts).map((c) => ({ id: c.id, name: c.name, status: c.status, origin: c.origin, via: c.via }));
      missions = matchMissions(allMissions, query, 8).map((m) => ({ id: m.id, title: m.title, status: m.status, client: m.client?.name ?? "" }));
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
  return failed ? { results: [], clients: [], missions: [], message: SEARCH_FAILED } : { results, clients, missions };
}
