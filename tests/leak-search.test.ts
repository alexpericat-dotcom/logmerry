/**
 * Test de fuite de la recherche par sens entre deux comptes fictifs (story 8.7).
 * À rejouer après chaque migration touchant `note_chunks` ou `match_chunks` : npm run test:leak
 *
 * Même garde-fous que tests/isolation.test.ts : clé PUBLIQUE, comptes @example.com seulement, notes
 * préfixées [leak-test] supprimées à la fin. Différence : de VRAIS vecteurs `mistral-embed` (appel réseau,
 * environ 10 textes fictifs) et des sujets proches entre A et B, pour que la recherche ait de quoi se tromper.
 * Hors de `npm test` (réseau + identifiants + clé Mistral dans .env.local).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createClient } from "@supabase/supabase-js";

import { testAccount } from "./helpers/accounts.ts";

import { MATCH_COUNT, MATCH_THRESHOLD } from "../lib/domain/matching.ts";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
}

const PREFIX = "[leak-test]";
const newClient = () =>
  createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function signIn(who: "A" | "B") {
  const { email, password } = testAccount(who);
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Connexion impossible pour compte de test ${who} : ${error?.message ?? "?"}`);
  return { client, userId: data.user.id };
}
type Account = Awaited<ReturnType<typeof signIn>>;

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.mistral.ai/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("MISTRAL_API_KEY")}` },
    body: JSON.stringify({ model: "mistral-embed", input: texts }),
    signal: AbortSignal.timeout(20_000),
  });
  // Un échec ici n'est pas une fuite : message distinct pour ne pas être pris pour un échec d'isolation.
  if (!res.ok) throw new Error(`TEST NON CONCLUANT (pas une fuite) : Mistral a répondu ${res.status}`);
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  if (json.data?.length !== texts.length || json.data.some((d) => d.embedding.length !== 1024)) {
    throw new Error("TEST NON CONCLUANT (pas une fuite) : réponse d'embeddings inattendue");
  }
  return json.data.sort((x, y) => x.index - y.index).map((d) => d.embedding);
}

/** Notes fictives : mêmes thèmes (factures, clients, abonnements), faits différents. Les secrets de A et de B sont distincts. */
const NOTES = {
  A: [
    ["Tarif confidentiel Alpha", "Le client Alpha paie un tarif journalier de 650 euros avec une remise de fidélité de 10 pour cent."],
    ["Recouvrement des factures", "Si une facture reste impayée après 30 jours, envoyer une mise en demeure par courrier recommandé."],
    ["Rendez-vous Beta", "Beta voudrait automatiser l'envoi des quittances de loyer chaque mois dès réception du virement."],
  ],
  B: [
    ["Tarif confidentiel Gamma", "Le client Gamma règle un forfait mensuel de 2 400 euros pour un accompagnement no-code."],
    ["Relance des paiements", "Après 15 jours de retard, envoyer un rappel par e-mail puis appeler le client."],
    ["Abonnement Delta", "Delta souhaite suspendre son abonnement mensuel pendant les vacances d'été."],
  ],
} as const;

/** Questions de chaque compte sur les sujets de l'AUTRE compte (les plus propres à provoquer une fuite). */
const QUESTIONS_ON_THE_OTHER = {
  A: ["Quel forfait mensuel paie le client Gamma ?", "Que faire après 15 jours de retard de paiement ?", "Delta peut-il suspendre son abonnement ?"],
  B: ["Quel tarif journalier paie le client Alpha ?", "Que faire d'une facture impayée après 30 jours ?", "Que veut automatiser Beta ?"],
} as const;

/** Les extraits reçus qui appartiennent à l'AUTRE compte (liste interdite) : doit toujours être vide. */
export function leaked(rows: { id: string }[], forbiddenChunkIds: Set<string>): { id: string }[] {
  return rows.filter((r) => forbiddenChunkIds.has(r.id));
}

describe("fuite de la recherche par sens entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  const chunkIds = { A: new Set<string>(), B: new Set<string>() };
  const noteIds = { A: new Set<string>(), B: new Set<string>() };

  // Les questions sont vectorisées une seule fois (un appel réseau pour les six).
  const questionVectors = { A: [] as number[][], B: [] as number[][] };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      const del = await account.client.from("notes").delete().like("title", `${PREFIX}%`);
      if (del.error) throw new Error(`Nettoyage impossible : ${del.error.message}`);
      const left = await account.client.from("notes").select("id").like("title", `${PREFIX}%`);
      assert.deepEqual(left.data, [], "des notes de test restent en base");
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    assert.notEqual(a.userId, b.userId);
    await cleanup();
    const all = await embed([...QUESTIONS_ON_THE_OTHER.A, ...QUESTIONS_ON_THE_OTHER.B]);
    questionVectors.A = all.slice(0, 3);
    questionVectors.B = all.slice(3);
    for (const who of ["A", "B"] as const) {
      const account = who === "A" ? a : b;
      const vectors = await embed(NOTES[who].map(([title, body]) => `${PREFIX} ${title}\n\n${body}`));
      for (const [i, [title, body]] of NOTES[who].entries()) {
        const note = await account.client
          .from("notes").insert({ title: `${PREFIX} ${title}`, body, index_status: "indexed" }).select("id").single();
        assert.ifError(note.error);
        noteIds[who].add(note.data!.id);
        const chunk = await account.client.from("note_chunks").insert({
          note_id: note.data!.id, chunk_index: 0, content: body,
          embedding: JSON.stringify(vectors[i]), embedding_model: "mistral-embed",
        }).select("id").single();
        assert.ifError(chunk.error);
        chunkIds[who].add(chunk.data!.id);
      }
    }
  });

  after(cleanup);

  for (const who of ["A", "B"] as const) {
    const account = () => (who === "A" ? a : b);
    const other = who === "A" ? "B" : "A";

    test(`${who} pose les questions de ${other} avec un seuil à 0 : aucun extrait de ${other}, que les siens`, async () => {
      for (const [i, question] of QUESTIONS_ON_THE_OTHER[who].entries()) {
        const { data, error } = await account().client.rpc("match_chunks", {
          query_embedding: JSON.stringify(questionVectors[who][i]), match_threshold: -1, match_count: 20,
        });
        assert.ifError(error);
        const rows = data as { id: string; note_id: string; content: string }[];
        assert.ok(rows.length > 0, "le test n'est utile que si la recherche renvoie bien ses propres extraits");
        assert.ok(rows.some((r) => chunkIds[who].has(r.id)), "la recherche doit renvoyer au moins un de mes propres extraits");
        assert.deepEqual(leaked(rows, chunkIds[other]), [], `fuite pour « ${question} » : extrait de ${other} reçu`);
        assert.ok(!rows.some((r) => noteIds[other].has(r.note_id)), `une note de ${other} est référencée`);
        for (const [, body] of NOTES[other]) assert.ok(!rows.some((r) => r.content === body), `le texte de ${other} est apparu`);
      }
    });

    test(`${who} avec le seuil et la limite réels de l'application : rien de ${other} non plus`, async () => {
      // Le résultat peut être vide (c'est le but du seuil) : le test ne prouve rien là-dessus, le test à seuil 0 prouve.
      for (const [i] of QUESTIONS_ON_THE_OTHER[who].entries()) {
        const { data, error } = await account().client.rpc("match_chunks", {
          query_embedding: JSON.stringify(questionVectors[who][i]), match_threshold: MATCH_THRESHOLD, match_count: MATCH_COUNT,
        });
        assert.ifError(error);
        assert.deepEqual(leaked(data as { id: string }[], chunkIds[other]), []);
      }
    });

    test(`${who} ne lit aucun extrait de ${other} directement dans note_chunks`, async () => {
      const { data, error } = await account().client.from("note_chunks").select("id, note_id");
      assert.ifError(error);
      assert.deepEqual(leaked(data as { id: string }[], chunkIds[other]), []);
      const byNote = await account().client.from("note_chunks").select("id").in("note_id", [...noteIds[other]]);
      assert.ifError(byNote.error);
      assert.deepEqual(byNote.data, []);
    });
  }

  for (const who of ["A", "B"] as const) {
    const other = who === "A" ? "B" : "A";
    // Voie « par mots-clés » de l'assistant : la recherche plein texte (`search_notes`) puis la lecture des extraits de ces notes.
    test(`${who} cherche par mots-clés les mots propres à ${other} : aucune note ni extrait de ${other}`, async () => {
      const account = who === "A" ? a : b;
      const own = who === "A" ? NOTES.A : NOTES.B;
      assert.ok(own.length > 0);
      const theirs = other === "A" ? ["alpha", "recouvrement", "beta", "quittances"] : ["gamma", "relance", "delta", "abonnement"];
      for (const word of theirs) {
        const { data, error } = await account.client.rpc("search_notes", { query: word });
        assert.ifError(error);
        assert.deepEqual((data as { id: string }[]).filter((n) => noteIds[other].has(n.id)), [], `« ${word} » : note de ${other} reçue`);
        const chunks = await account.client.from("note_chunks").select("id").in("note_id", [...noteIds[other]]);
        assert.ifError(chunks.error);
        assert.deepEqual(chunks.data, [], "extraits de l'autre compte reçus");
      }
    });
  }

  test("sans connexion : aucune recherche par sens", async () => {
    const { data, error } = await newClient().rpc("match_chunks", {
      query_embedding: JSON.stringify(questionVectors.B[0]), match_threshold: -1, match_count: 20,
    });
    assert.ok(error || (Array.isArray(data) && data.length === 0), "un visiteur ne reçoit jamais d'extrait");
    assert.equal(error?.code, "42501", "refus par les droits attendu");
  });

  test("contrôle du détecteur : il signale un extrait interdit et laisse passer les siens", () => {
    const forbidden = new Set(["x"]);
    assert.deepEqual(leaked([{ id: "x" }, { id: "y" }], forbidden), [{ id: "x" }], "un seul extrait interdit doit être signalé");
    assert.deepEqual(leaked([{ id: "y" }], forbidden), []);
    assert.deepEqual(leaked([{ id: "x" }], new Set()), [], "liste interdite vide : rien à signaler (le test garde donc ses propres extraits connus)");
    assert.ok(chunkIds.A.size === 3 && chunkIds.B.size === 3, "les listes interdites du test ne sont pas vides");
  });
});
