/**
 * Test d'isolation à deux comptes fictifs (story 2.3).
 * À rejouer après chaque migration : npm run test:isolation
 *
 * Se connecte avec la clé PUBLIQUE (jamais service_role) en tant que « démo A » et « démo B ».
 * Identifiants : .env.test.local (ignoré par git). Écrit des notes préfixées [isolation-test]
 * dans la vraie base, puis les supprime. Refuse de tourner avec un compte hors @example.com.
 * Prérequis : les deux comptes existent (voir .env.test.local.example) ; sans ce fichier, Node
 * s'arrête avec « .env.test.local: not found ».
 * Hors de `npm test` (réseau + identifiants) : à lancer à la main après chaque migration.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createClient } from "@supabase/supabase-js";

import { setDeadlineDone } from "../lib/db/deadline-state.ts";
import { toHistory, type MessageRow } from "../lib/domain/history.ts";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
}

const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const PREFIX = "[isolation-test]";

const newClient = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(who: "A" | "B") {
  const email = env(`DEMO_${who}_EMAIL`);
  assert.ok(email.endsWith("@example.com"), `démo ${who} doit être un compte fictif @example.com`);
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: env(`DEMO_${who}_PASSWORD`),
  });
  if (error || !data.user) {
    throw new Error(`Connexion impossible pour démo ${who} : ${error?.message ?? "pas d'utilisateur"}`);
  }
  return { client, userId: data.user.id };
}

type Account = Awaited<ReturnType<typeof signIn>>;

describe("isolation des notes entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let noteA: { id: string; title: string; created_at: string; type: string };
  let noteB: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      await account.client.from("messages").delete().like("content", `${PREFIX}%`); // historique de test (les citations partent en cascade)
      const { error } = await account.client.from("notes").delete().like("title", `${PREFIX}%`);
      if (error) console.warn(`Nettoyage incomplet : ${error.message}`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    assert.notEqual(a.userId, b.userId);
    await cleanup(); // restes d'un essai interrompu
    const { data, error } = await a.client
      .from("notes")
      .insert({ title: `${PREFIX} note de A`, body: "texte de A" })
      .select("id, title, created_at, type")
      .single();
    assert.ifError(error);
    noteA = data!;
    const { data: dataB, error: errorB } = await b.client
      .from("notes")
      .insert({ title: `${PREFIX} note de B`, body: "texte de B" })
      .select("id")
      .single();
    assert.ifError(errorB);
    noteB = dataB!;
  });

  after(cleanup);

  test("A retrouve sa note ; owner_id est rempli par la base ; type par défaut « note »", async () => {
    const { data, error } = await a.client.from("notes").select("owner_id, type").eq("id", noteA.id).single();
    assert.ifError(error);
    assert.equal(data!.owner_id, a.userId);
    assert.equal(data!.type, "note");
  });

  test("chacun voit sa propre note (le test ne passe pas par un accès cassé)", async () => {
    const forA = await a.client.from("notes").select("id").eq("id", noteA.id).maybeSingle();
    const forB = await b.client.from("notes").select("id").eq("id", noteB.id).maybeSingle();
    assert.equal(forA.data?.id, noteA.id);
    assert.equal(forB.data?.id, noteB.id);
  });

  test("A ne voit pas la note de B, ni dans sa liste ni par son identifiant", async () => {
    const list = await a.client.from("notes").select("id");
    assert.ifError(list.error);
    assert.ok(!list.data!.some((n) => n.id === noteB.id));
    const direct = await a.client.from("notes").select("id").eq("id", noteB.id).maybeSingle();
    assert.ifError(direct.error);
    assert.equal(direct.data, null);
  });

  test("B ne voit pas la note de A dans sa liste", async () => {
    const { data, error } = await b.client.from("notes").select("id");
    assert.ifError(error);
    assert.ok(!data!.some((n) => n.id === noteA.id));
  });

  test("B ne voit pas la note de A en ouvrant son identifiant (adresse directe)", async () => {
    const { data, error } = await b.client.from("notes").select("id").eq("id", noteA.id).maybeSingle();
    assert.ifError(error);
    assert.equal(data, null);
  });

  test("B ne peut pas modifier la note de A (aucune ligne touchée, note inchangée)", async () => {
    const { data, error } = await b.client.from("notes").update({ title: `${PREFIX} piratée` }).eq("id", noteA.id).select("id");
    assert.ifError(error);
    assert.equal(data!.length, 0);
    const { data: after } = await a.client.from("notes").select("title").eq("id", noteA.id).single();
    assert.equal(after!.title, noteA.title);
  });

  test("B ne peut pas supprimer la note de A (aucune ligne touchée, note conservée)", async () => {
    const { data, error } = await b.client.from("notes").delete().eq("id", noteA.id).select("id");
    assert.ifError(error);
    assert.equal(data!.length, 0);
    const { data: still } = await a.client.from("notes").select("id").eq("id", noteA.id).maybeSingle();
    assert.equal(still?.id, noteA.id);
  });

  test("B ne peut pas créer une note au nom de A", async () => {
    const { error } = await b.client.from("notes").insert({ title: `${PREFIX} faux`, owner_id: a.userId });
    assert.equal(error?.code, "42501", "refus par la RLS attendu");
  });

  test("B ne peut pas donner une de ses notes à A", async () => {
    const { error } = await b.client.from("notes").update({ owner_id: a.userId }).eq("id", noteB.id);
    assert.equal(error?.code, "42501", "refus par la RLS attendu");
    // La note n'a pas changé de main : A ne la voit toujours pas, B reste propriétaire.
    const forA = await a.client.from("notes").select("id").eq("id", noteB.id).maybeSingle();
    assert.equal(forA.data, null);
    const forB = await b.client.from("notes").select("owner_id").eq("id", noteB.id).single();
    assert.equal(forB.data!.owner_id, b.userId);
  });

  test("sans connexion, aucune note n'est visible ni créable", async () => {
    const anon = newClient();
    const read = await anon.from("notes").select("id");
    assert.ifError(read.error);
    assert.deepEqual(read.data, []);
    const insert = await anon.from("notes").insert({ title: `${PREFIX} anonyme` });
    assert.equal(insert.error?.code, "42501", "refus par la RLS attendu");
    const update = await anon.from("notes").update({ title: `${PREFIX} anonyme` }).eq("id", noteA.id).select("id");
    assert.ifError(update.error);
    assert.deepEqual(update.data, []);
    const del = await anon.from("notes").delete().eq("id", noteA.id).select("id");
    assert.ifError(del.error);
    assert.deepEqual(del.data, []);
  });

  test("modifier sa note met à jour updated_at (déclencheur)", async () => {
    const { data, error } = await a.client
      .from("notes")
      .update({ body: "texte modifié" })
      .eq("id", noteA.id)
      .select("created_at, updated_at")
      .single();
    assert.ifError(error);
    assert.ok(Date.parse(data!.updated_at) > Date.parse(data!.created_at));
  });

  test("la base refuse un texte de plus de 50 000 caractères", async () => {
    const { error } = await a.client.from("notes").insert({ title: `${PREFIX} long`, body: "x".repeat(50_001) });
    assert.equal(error?.code, "23514");
  });

  test("la base refuse un titre vide ou d'espaces, et un type inconnu", async () => {
    const empty = await a.client.from("notes").insert({ title: "   " });
    assert.equal(empty.error?.code, "23514");
    const badType = await a.client.from("notes").insert({ title: `${PREFIX} type`, type: "inconnu" });
    assert.equal(badType.error?.code, "22P02");
  });

  test("recherche : A trouve sa note, B ne la trouve pas, sans connexion c'est refusé", async () => {
    const word = "isolation-test"; // présent dans le titre de A et de B (préfixe)
    const forA = await a.client.rpc("search_notes", { query: word });
    assert.ifError(forA.error);
    const idsA = forA.data!.map((n: { id: string }) => n.id);
    assert.ok(idsA.includes(noteA.id));
    assert.ok(!idsA.includes(noteB.id));
    const forB = await b.client.rpc("search_notes", { query: word });
    assert.ifError(forB.error);
    const idsB = forB.data!.map((n: { id: string }) => n.id);
    assert.ok(idsB.includes(noteB.id));
    assert.ok(!idsB.includes(noteA.id));
    const anon = await newClient().rpc("search_notes", { query: word });
    assert.ok(anon.error, "l'appel sans connexion doit être refusé");
  });

  test("recherche sans accents : « ecole » et « école » trouvent « École » (titre et corps), dans les deux sens ; B ne trouve rien de A", async () => {
    const mk = await a.client.from("notes").insert([{ title: `${PREFIX} École fictive`, body: "Le détail se trouve à la crèche." }]).select("id").single();
    assert.ifError(mk.error);
    const ids = async (c: Account, query: string) => ((await c.client.rpc("search_notes", { query })).data ?? []).map((n: { id: string }) => n.id);
    for (const q of ["ecole", "école", "ÉCOLE", "creche", "crèche", "ecole creche"]) {
      assert.ok((await ids(a, q)).includes(mk.data!.id), `« ${q} » devrait trouver la note`);
    }
    assert.ok(!(await ids(b, "ecole")).includes(mk.data!.id), "B ne trouve pas la note de A");
    assert.ok(!(await ids(a, "ecoles lointaines")).includes(mk.data!.id), "des mots absents ne trouvent rien");
  });

  test("recherche : corps seul, début de mot, classement, ponctuation, mots vides, limite de 20", async () => {
    const tag = `zq${Date.now().toString(36)}`; // mot unique à cette exécution
    const ins = async (title: string, body: string) => {
      const { data, error } = await a.client.from("notes").insert({ title: `${PREFIX} ${title}`, body }).select("id").single();
      assert.ifError(error);
      return data!.id as string;
    };
    const search = async (query: string) => {
      const { data, error } = await a.client.rpc("search_notes", { query });
      assert.ifError(error);
      return (data as { id: string }[]).map((n) => n.id);
    };
    const inBody = await ins("corps", `un ${tag}rendezvous dans le texte`);
    const inTitle = await ins(`${tag}rendezvous titre`, "rien");
    assert.deepEqual(await search(`${tag}rend`), [inTitle, inBody], "début de mot, titre avant corps");
    for (const q of ["", "   ", "!!! ???", "le de la", "& | ! ( ) : '"]) {
      assert.deepEqual(await search(q), [], `« ${q} » ne renvoie rien et ne lève pas d'erreur`);
    }
    const many = await Promise.all(Array.from({ length: 22 }, (_, i) => ins(`lot ${i}`, `${tag}lot`)));
    assert.equal(many.length, 22);
    assert.equal((await search(`${tag}lot`)).length, 20);
    const anon = await newClient().rpc("search_notes", { query: tag });
    assert.equal(anon.error?.code, "42501", "refus par les droits attendu");
  });

  test("extraits (note_chunks) : B ne voit, ne modifie, ne supprime ni ne crée rien chez A ; anonyme refusé ; cascade ; dimension", async () => {
    const chunk = { note_id: noteA.id, chunk_index: 0, content: "extrait de A", embedding_model: "test-model" };
    const own = await a.client.from("note_chunks").insert(chunk).select("id, owner_id").single();
    assert.ifError(own.error);
    assert.equal(own.data!.owner_id, a.userId);
    const id = own.data!.id;

    const read = await b.client.from("note_chunks").select("id");
    assert.ifError(read.error);
    assert.ok(!read.data!.some((c) => c.id === id), "B ne voit pas l'extrait de A");
    const upd = await b.client.from("note_chunks").update({ content: "piraté" }).eq("id", id).select("id");
    assert.ifError(upd.error);
    assert.equal(upd.data!.length, 0);
    const del = await b.client.from("note_chunks").delete().eq("id", id).select("id");
    assert.ifError(del.error);
    assert.equal(del.data!.length, 0);
    const fake = await b.client.from("note_chunks").insert({ ...chunk, chunk_index: 1, owner_id: a.userId });
    assert.equal(fake.error?.code, "42501", "B ne peut pas créer un extrait au nom de A");
    const still = await a.client.from("note_chunks").select("content").eq("id", id).single();
    assert.equal(still.data!.content, "extrait de A");

    const anon = newClient();
    const anonRead = await anon.from("note_chunks").select("id");
    assert.ifError(anonRead.error);
    assert.deepEqual(anonRead.data, []);
    const anonWrite = await anon.from("note_chunks").insert({ ...chunk, chunk_index: 2 });
    assert.equal(anonWrite.error?.code, "42501");

    const badDim = await a.client.from("note_chunks").insert({ ...chunk, chunk_index: 3, embedding: "[0.1,0.2,0.3]" });
    assert.match(badDim.error?.message ?? "", /dimension/i, "un vecteur de 3 valeurs est refusé (1024 attendues)");

    const { data: temp, error: tempError } = await a.client
      .from("notes").insert({ title: `${PREFIX} cascade`, body: "x" }).select("id").single();
    assert.ifError(tempError);
    const tempChunk = await a.client.from("note_chunks")
      .insert({ ...chunk, note_id: temp!.id }).select("id").single();
    assert.ifError(tempChunk.error);
    await a.client.from("notes").delete().eq("id", temp!.id);
    const gone = await a.client.from("note_chunks").select("id").eq("id", tempChunk.data!.id);
    assert.deepEqual(gone.data, [], "supprimer la note supprime ses extraits");
  });

  test("extraits : A ne peut pas rattacher un extrait à la note de B, ni déplacer un des siens vers elle", async () => {
    const chunk = { chunk_index: 0, content: "extrait", embedding_model: "test-model" };
    const onB = await a.client.from("note_chunks").insert({ ...chunk, note_id: noteB.id }).select("id");
    assert.equal(onB.error?.code, "42501", "refus par la RLS attendu");
    const mine = await a.client.from("note_chunks").insert({ ...chunk, chunk_index: 9, note_id: noteA.id }).select("id").single();
    assert.ifError(mine.error);
    const moved = await a.client.from("note_chunks").update({ note_id: noteB.id }).eq("id", mine.data!.id).select("id");
    assert.ok(moved.error || moved.data!.length === 0, "déplacement vers la note de B refusé");
    const seenByB = await b.client.from("note_chunks").select("id").eq("note_id", noteB.id);
    assert.deepEqual(seenByB.data, [], "B ne trouve aucun extrait étranger sur sa note");
  });

  test("état d'indexation : « en attente » par défaut, valeur inconnue refusée, invisible pour B", async () => {
    const own = await a.client.from("notes").select("index_status").eq("id", noteA.id).single();
    assert.ifError(own.error);
    assert.equal(own.data!.index_status, "pending");
    const set = await a.client.from("notes").update({ index_status: "indexed" }).eq("id", noteA.id).select("index_status").single();
    assert.ifError(set.error);
    assert.equal(set.data!.index_status, "indexed");
    const bad = await a.client.from("notes").update({ index_status: "inconnu" }).eq("id", noteA.id);
    assert.equal(bad.error?.code, "22P02");
    const forB = await b.client.from("notes").select("index_status").eq("id", noteA.id).maybeSingle();
    assert.ifError(forB.error);
    assert.equal(forB.data, null, "B ne voit ni la note ni l'état de A");
    const byB = await b.client.from("notes").update({ index_status: "failed" }).eq("id", noteA.id).select("id");
    assert.ifError(byB.error);
    assert.equal(byB.data!.length, 0, "B ne peut pas changer l'état de la note de A");
  });

  test("match_chunks : A retrouve ses extraits classés, sous le seuil rien, limite, B ne reçoit rien de A, anonyme refusé", async () => {
    // Vecteurs de base : une seule valeur à 1, donc des similarités exactes (1, 0,707 ou 0).
    const vec = (...hot: [number, number][]) => {
      const v = new Array(1024).fill(0);
      for (const [i, x] of hot) v[i] = x;
      return JSON.stringify(v);
    };
    const row = (note_id: string, chunk_index: number, content: string, embedding: string) => ({
      note_id, chunk_index, content, embedding, embedding_model: "test-model",
    });
    const ins = await a.client.from("note_chunks").insert([
      row(noteA.id, 20, "pile", vec([0, 1])),
      row(noteA.id, 21, "voisin", vec([0, 1], [1, 1])),
      row(noteA.id, 22, "loin", vec([2, 1])),
      row(noteA.id, 23, "sans vecteur", null as unknown as string),
    ]);
    assert.ifError(ins.error);
    const insB = await b.client.from("note_chunks").insert(row(noteB.id, 20, "secret de B", vec([0, 1])));
    assert.ifError(insB.error);

    const match = (c: typeof a.client, embedding: string, threshold: number, count = 5) =>
      c.rpc("match_chunks", { query_embedding: embedding, match_threshold: threshold, match_count: count });

    const near = await match(a.client, vec([0, 1]), 0.5);
    assert.ifError(near.error);
    const rows = near.data as { content: string; similarity: number }[];
    assert.deepEqual(rows.map((r) => r.content), ["pile", "voisin"], "classés du plus proche au moins proche ; « loin » et « sans vecteur » exclus");
    assert.ok(rows[0].similarity > 0.999 && Math.abs(rows[1].similarity - Math.SQRT1_2) < 0.001);

    const none = await match(a.client, vec([5, 1]), 0.5);
    assert.ifError(none.error);
    assert.deepEqual(none.data, [], "aucun extrait au-dessus du seuil : liste vide, pas d'erreur");

    const limited = await match(a.client, vec([0, 1]), -1, 1);
    assert.ifError(limited.error);
    assert.equal((limited.data as unknown[]).length, 1, "match_count borne le résultat");

    // Plafond de 20 : 22 extraits de plus, `match_count` à 100 ; 0 ou négatif : liste vide sans erreur.
    const lot = await a.client.from("note_chunks").insert(
      Array.from({ length: 22 }, (_, i) => row(noteA.id, 30 + i, `lot ${i}`, vec([7, 1]))),
    );
    assert.ifError(lot.error);
    const capped = await match(a.client, vec([7, 1]), 0.5, 100);
    assert.ifError(capped.error);
    assert.equal((capped.data as unknown[]).length, 20, "le résultat ne dépasse jamais 20 lignes");
    for (const count of [0, -5]) {
      const empty = await match(a.client, vec([7, 1]), 0.5, count);
      assert.ifError(empty.error);
      assert.deepEqual(empty.data, [], `match_count = ${count} : liste vide`);
    }

    const forB = await match(b.client, vec([0, 1]), -1, 20);
    assert.ifError(forB.error);
    const contentsB = (forB.data as { content: string }[]).map((r) => r.content);
    assert.ok(contentsB.includes("secret de B"), "B retrouve son propre extrait");
    for (const mine of ["pile", "voisin", "loin"]) assert.ok(!contentsB.includes(mine), `B ne reçoit pas « ${mine} » de A`);
    assert.ok(!contentsB.some((c) => c.startsWith("lot ")), "B ne reçoit aucun extrait du lot de A");

    const anon = await match(newClient(), vec([0, 1]), 0.5);
    assert.equal(anon.error?.code, "42501", "refus par les droits attendu");

    const bad = await match(a.client, "[0.1,0.2,0.3]", 0.5);
    assert.match(bad.error?.message ?? "", /dimension/i, "un vecteur de 3 valeurs est refusé (1024 attendues)");
  });

  test("historique : chacun ne voit que le sien ; une citation ne peut viser que mes notes et mes extraits ; rien ne se modifie ; suppression de la note : citation orpheline", async () => {
    const msg = (client: typeof a.client, role: "user" | "assistant", content: string) =>
      client.from("messages").insert({ role, content }).select("id").single();
    const mA = await msg(a.client, "assistant", `${PREFIX} réponse de A`);
    assert.ifError(mA.error);
    const mB = await msg(b.client, "assistant", `${PREFIX} réponse de B`);
    assert.ifError(mB.error);
    const own = await a.client.from("messages").select("owner_id").eq("id", mA.data!.id).single();
    assert.equal(own.data!.owner_id, a.userId, "owner_id rempli par la base");

    // Lecture : B ne voit pas les messages de A, ni par liste ni par identifiant.
    const listB = await b.client.from("messages").select("id");
    assert.ifError(listB.error);
    assert.ok(!listB.data!.some((m) => m.id === mA.data!.id));
    const directB = await b.client.from("messages").select("id").eq("id", mA.data!.id).maybeSingle();
    assert.equal(directB.data, null);

    // Écriture hostile : au nom d'un autre, ou une citation sur le message d'un autre, ou vers la note d'un autre.
    const fake = await b.client.from("messages").insert({ role: "user", content: `${PREFIX} faux`, owner_id: a.userId });
    assert.equal(fake.error?.code, "42501");
    const onOther = await b.client.from("message_citations").insert({ message_id: mA.data!.id, position: 0 });
    assert.equal(onOther.error?.code, "42501", "B ne peut pas ajouter une citation au message de A");
    const toOtherNote = await a.client.from("message_citations").insert({ message_id: mA.data!.id, position: 0, note_id: noteB.id });
    assert.equal(toOtherNote.error?.code, "42501", "A ne peut pas citer la note de B");

    // Citation légitime (note et extrait à moi), puis lecture jointe, immutabilité et suppression de la note.
    const temp = await a.client.from("notes").insert({ title: `${PREFIX} citée puis supprimée`, body: "x" }).select("id").single();
    assert.ifError(temp.error);
    const chunkA = await a.client.from("note_chunks")
      .insert({ note_id: temp.data!.id, chunk_index: 0, content: "extrait cité", embedding_model: "test-model" }).select("id").single();
    assert.ifError(chunkA.error);
    const chunkB = await b.client.from("note_chunks")
      .insert({ note_id: noteB.id, chunk_index: 50, content: "extrait de B", embedding_model: "test-model" }).select("id").single();
    assert.ifError(chunkB.error);
    const toOtherChunk = await a.client.from("message_citations").insert({ message_id: mA.data!.id, position: 0, chunk_id: chunkB.data!.id });
    assert.equal(toOtherChunk.error?.code, "42501", "A ne peut pas citer l'extrait de B");
    const ok = await a.client.from("message_citations")
      .insert({ message_id: mA.data!.id, position: 0, note_id: temp.data!.id, chunk_id: chunkA.data!.id }).select("id").single();
    assert.ifError(ok.error);

    // Lecture jointe réelle (même requête que l'application) : forme renvoyée par la base, ordre, isolation.
    const JOINED = "id, role, content, created_at, message_citations(id, position, note_id, chunk_id, notes(title), note_chunks(content))";
    const read = await a.client.from("messages").select(JOINED).like("content", `${PREFIX}%`).order("created_at", { ascending: false });
    assert.ifError(read.error);
    const history = toHistory(read.data as unknown as MessageRow[]);
    assert.deepEqual(history.map((m) => m.text), [], "un message de réponse seul n'ouvre pas l'historique (pas de question avant)");
    const withQuestion = await a.client.from("messages").insert({ role: "user", content: `${PREFIX} question de A`, created_at: new Date(Date.now() - 1000).toISOString() });
    assert.ifError(withQuestion.error);
    const read2 = await a.client.from("messages").select(JOINED).like("content", `${PREFIX}%`).order("created_at", { ascending: false });
    assert.ifError(read2.error);
    const h2 = toHistory(read2.data as unknown as MessageRow[]);
    assert.deepEqual(h2.map((m) => m.role), ["user", "assistant"]);
    assert.deepEqual(h2[1].sources[0], { id: ok.data!.id, noteId: temp.data!.id, title: `${PREFIX} citée puis supprimée`, content: "extrait cité" });
    const readB = await b.client.from("messages").select(JOINED).like("content", `${PREFIX}%`);
    assert.ifError(readB.error);
    assert.ok(!(readB.data as { content: string }[]).some((m) => m.content.includes("de A")), "B ne lit rien de l'historique de A");
    const seenB = await b.client.from("message_citations").select("id");
    assert.ifError(seenB.error);
    assert.ok(!seenB.data!.some((c) => c.id === ok.data!.id), "B ne voit pas la citation de A");
    const upd = await a.client.from("messages").update({ content: "changé" }).eq("id", mA.data!.id).select("id");
    assert.ok(upd.error || upd.data!.length === 0, "un message ne se modifie pas");
    const updC = await a.client.from("message_citations").update({ position: 5 }).eq("id", ok.data!.id).select("id");
    assert.ok(updC.error || updC.data!.length === 0, "une citation ne se modifie pas");
    const dup = await a.client.from("message_citations").insert({ message_id: mA.data!.id, position: 0 });
    assert.equal(dup.error?.code, "23505", "une position par message");

    await a.client.from("notes").delete().eq("id", temp.data!.id);
    const after = await a.client.from("message_citations").select("note_id").eq("id", ok.data!.id).single();
    assert.ifError(after.error);
    assert.equal(after.data!.note_id, null, "la note supprimée : la citation reste, sans référence (« source supprimée »)");

    const delB = await b.client.from("messages").delete().eq("id", mA.data!.id).select("id");
    assert.equal(delB.data?.length ?? 0, 0, "B ne supprime pas le message de A");
    const anon = await newClient().from("messages").select("id");
    assert.ifError(anon.error);
    assert.deepEqual(anon.data, []);
  });
});

describe("isolation des fiches clients entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let fA: { id: string };
  let fB: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      const { error } = await account.client.from("clients").delete().like("name", `${PREFIX}%`);
      if (error) console.warn(`Nettoyage des fiches incomplet : ${error.message}`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const ra = await a.client.from("clients").insert({ name: `${PREFIX} fiche de A`, origin: "demo" }).select("id").single();
    assert.ifError(ra.error);
    fA = ra.data!;
    const rb = await b.client.from("clients").insert({ name: `${PREFIX} fiche de B`, origin: "friend", status: "client" }).select("id").single();
    assert.ifError(rb.error);
    fB = rb.data!;
  });

  after(cleanup);

  test("A retrouve sa fiche ; owner_id rempli par la base ; statut par défaut « prospect » ; chacun voit la sienne", async () => {
    const { data, error } = await a.client.from("clients").select("owner_id, status, origin").eq("id", fA.id).single();
    assert.ifError(error);
    assert.deepEqual(data, { owner_id: a.userId, status: "prospect", origin: "demo" });
    const forB = await b.client.from("clients").select("id").eq("id", fB.id).maybeSingle();
    assert.equal(forB.data?.id, fB.id);
  });

  test("A ne voit pas la fiche de B (liste ni identifiant) et inversement", async () => {
    const listA = await a.client.from("clients").select("id");
    assert.ifError(listA.error);
    assert.ok(!listA.data!.some((c) => c.id === fB.id));
    const listB = await b.client.from("clients").select("id");
    assert.ok(!listB.data!.some((c) => c.id === fA.id));
    const direct = await a.client.from("clients").select("id").eq("id", fB.id).maybeSingle();
    assert.equal(direct.data, null);
  });

  test("B ne modifie ni ne supprime la fiche de A ; B ne crée pas de fiche au nom de A ni ne lui donne la sienne", async () => {
    const upd = await b.client.from("clients").update({ name: `${PREFIX} piratée` }).eq("id", fA.id).select("id");
    assert.ok(upd.error || upd.data!.length === 0, "mise à jour refusée");
    const del = await b.client.from("clients").delete().eq("id", fA.id).select("id");
    assert.equal(del.data?.length ?? 0, 0);
    const still = await a.client.from("clients").select("name").eq("id", fA.id).single();
    assert.equal(still.data!.name, `${PREFIX} fiche de A`);
    const forged = await b.client.from("clients").insert({ name: `${PREFIX} forgée`, origin: "demo", owner_id: a.userId });
    assert.equal(forged.error?.code, "42501");
    const give = await b.client.from("clients").update({ owner_id: a.userId }).eq("id", fB.id).select("id");
    assert.ok(give.error || give.data!.length === 0, "donner sa fiche à A refusé");
  });

  test("sans connexion : rien de visible, rien de créable ni de supprimable", async () => {
    const anon = newClient();
    const read = await anon.from("clients").select("id");
    assert.ok(read.error || read.data!.length === 0);
    const ins = await anon.from("clients").insert({ name: `${PREFIX} anonyme`, origin: "demo" });
    assert.ok(ins.error);
    const del = await anon.from("clients").delete().eq("id", fA.id).select("id");
    assert.equal(del.data?.length ?? 0, 0);
  });

  test("la base refuse un nom vide ou d'espaces, un nom de plus de 200 caractères, un statut ou une origine inconnus, une origine absente", async () => {
    for (const [label, row] of [
      ["nom vide", { name: "", origin: "demo" }],
      ["nom d'espaces", { name: "   ", origin: "demo" }],
      ["nom trop long", { name: "x".repeat(201), origin: "demo" }],
      ["statut inconnu", { name: `${PREFIX} s`, origin: "demo", status: "perdu" }],
      ["origine inconnue", { name: `${PREFIX} o`, origin: "inconnue" }],
      ["origine absente", { name: `${PREFIX} a` }],
    ] as const) {
      const r = await a.client.from("clients").insert(row);
      assert.ok(r.error, `« ${label} » aurait dû être refusé`);
    }
  });

  test("modifier une fiche met à jour updated_at (déclencheur) ; passer en client ne change ni l'identifiant ni la date de création", async () => {
    const before = await a.client.from("clients").select("created_at, updated_at").eq("id", fA.id).single();
    await new Promise((r) => setTimeout(r, 50));
    const upd = await a.client.from("clients").update({ status: "client" }).eq("id", fA.id).select("id, status, created_at, updated_at").single();
    assert.ifError(upd.error);
    assert.equal(upd.data!.id, fA.id);
    assert.equal(upd.data!.status, "client");
    assert.equal(upd.data!.created_at, before.data!.created_at);
    assert.ok(new Date(upd.data!.updated_at) > new Date(before.data!.updated_at));
  });
});

describe("isolation des contacts entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let clientA: { id: string };
  let clientB: { id: string };
  let cA: { id: string };
  let cB: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // La suppression des fiches de test emporte leurs contacts (cascade).
      const { error } = await account.client.from("clients").delete().like("name", `${PREFIX}%`);
      if (error) console.warn(`Nettoyage des contacts incomplet : ${error.message}`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const fa = await a.client.from("clients").insert({ name: `${PREFIX} fiche contacts A`, origin: "demo" }).select("id").single();
    assert.ifError(fa.error);
    clientA = fa.data!;
    const fb = await b.client.from("clients").insert({ name: `${PREFIX} fiche contacts B`, origin: "demo" }).select("id").single();
    assert.ifError(fb.error);
    clientB = fb.data!;
    const ca = await a.client.from("contacts").insert({ client_id: clientA.id, name: "Claire de A", email: "claire@a.example", phone: "06 00 00 00 01", address: "1 rue A\nParis", job_title: "Directrice" }).select("id").single();
    assert.ifError(ca.error);
    cA = ca.data!;
    const cb = await b.client.from("contacts").insert({ client_id: clientB.id, name: "Basile de B" }).select("id").single();
    assert.ifError(cb.error);
    cB = cb.data!;
  });

  after(cleanup);

  test("chacun voit ses contacts ; owner_id rempli par la base ; champs facultatifs absents = null", async () => {
    const own = await a.client.from("contacts").select("owner_id, email, phone").eq("id", cA.id).single();
    assert.ifError(own.error);
    assert.equal(own.data!.owner_id, a.userId);
    const bare = await b.client.from("contacts").select("job_title, email, phone, address").eq("id", cB.id).single();
    assert.deepEqual(bare.data, { job_title: null, email: null, phone: null, address: null });
  });

  test("A ne voit pas le contact de B (liste ni identifiant) et inversement", async () => {
    const listA = await a.client.from("contacts").select("id");
    assert.ok(!listA.data!.some((c) => c.id === cB.id));
    assert.ok(!(await b.client.from("contacts").select("id")).data!.some((c) => c.id === cA.id));
    assert.equal((await a.client.from("contacts").select("id").eq("id", cB.id).maybeSingle()).data, null);
  });

  test("B ne modifie ni ne supprime le contact de A", async () => {
    const upd = await b.client.from("contacts").update({ name: "piraté" }).eq("id", cA.id).select("id");
    assert.ok(upd.error || upd.data!.length === 0);
    const del = await b.client.from("contacts").delete().eq("id", cA.id).select("id");
    assert.equal(del.data?.length ?? 0, 0);
    assert.equal((await a.client.from("contacts").select("name").eq("id", cA.id).single()).data!.name, "Claire de A");
  });

  test("B ne peut pas rattacher un contact à la fiche de A (même avec son propre owner_id), ni déplacer le sien vers elle", async () => {
    const onA = await b.client.from("contacts").insert({ client_id: clientA.id, name: `${PREFIX} intrus` });
    assert.equal(onA.error?.code, "42501", "insertion sur la fiche d'un autre refusée");
    const move = await b.client.from("contacts").update({ client_id: clientA.id }).eq("id", cB.id).select("id");
    assert.ok(move.error || move.data!.length === 0, "déplacement vers la fiche d'un autre refusé");
    const forged = await b.client.from("contacts").insert({ client_id: clientB.id, name: `${PREFIX} forgé`, owner_id: a.userId });
    assert.equal(forged.error?.code, "42501", "owner_id d'un autre refusé");
    const give = await b.client.from("contacts").update({ owner_id: a.userId }).eq("id", cB.id).select("id");
    assert.ok(give.error || give.data!.length === 0, "donner son contact à A refusé");
    assert.equal((await a.client.from("contacts").select("id").eq("client_id", clientA.id)).data!.length, 1, "la fiche de A n'a reçu aucun contact étranger");
  });

  test("sans connexion : rien de visible, rien de créable ni de supprimable", async () => {
    const anon = newClient();
    const read = await anon.from("contacts").select("id");
    assert.ok(read.error || read.data!.length === 0);
    assert.ok((await anon.from("contacts").insert({ client_id: clientA.id, name: `${PREFIX} anonyme` })).error);
    assert.equal((await anon.from("contacts").delete().eq("id", cA.id).select("id")).data?.length ?? 0, 0);
  });

  test("la base refuse : nom vide, fonction ou adresse vides ou trop longues, e-mail mal formé ou trop long, téléphone trop long, fiche absente", async () => {
    const ok = { client_id: clientA.id };
    for (const [label, row] of [
      ["nom vide", { ...ok, name: "  " }],
      ["nom trop long", { ...ok, name: "x".repeat(201) }],
      ["fonction vide", { ...ok, name: "n", job_title: "" }],
      ["fonction trop longue", { ...ok, name: "n", job_title: "j".repeat(201) }],
      ["e-mail sans @", { ...ok, name: "n", email: "pas-un-mail" }],
      ["e-mail avec espace", { ...ok, name: "n", email: "a b@c.fr" }],
      ["e-mail trop long", { ...ok, name: "n", email: `${"a".repeat(250)}@x.fr` }],
      ["téléphone trop long", { ...ok, name: "n", phone: "1".repeat(31) }],
      ["téléphone vide", { ...ok, name: "n", phone: "" }],
      ["adresse trop longue", { ...ok, name: "n", address: "a".repeat(501) }],
      ["sans fiche", { name: "n" }],
      ["fiche inexistante", { client_id: "00000000-0000-0000-0000-000000000000", name: "n" }],
    ] as const) {
      const r = await a.client.from("contacts").insert(row);
      assert.ok(r.error, `« ${label} » aurait dû être refusé`);
    }
  });

  test("modifier un contact met à jour updated_at ; supprimer la fiche supprime ses contacts (cascade)", async () => {
    const before = await a.client.from("contacts").select("updated_at").eq("id", cA.id).single();
    await new Promise((r) => setTimeout(r, 50));
    const upd = await a.client.from("contacts").update({ job_title: "Gérante" }).eq("id", cA.id).select("updated_at").single();
    assert.ifError(upd.error);
    assert.ok(new Date(upd.data!.updated_at) > new Date(before.data!.updated_at));
    const extra = await a.client.from("clients").insert({ name: `${PREFIX} fiche éphémère`, origin: "demo" }).select("id").single();
    const ephem = await a.client.from("contacts").insert({ client_id: extra.data!.id, name: "Éphémère" }).select("id").single();
    assert.ifError(ephem.error);
    await a.client.from("clients").delete().eq("id", extra.data!.id);
    assert.equal((await a.client.from("contacts").select("id").eq("id", ephem.data!.id).maybeSingle()).data, null, "le contact a disparu avec sa fiche");
  });

  test("passer en client : le statut change, les contacts restent", async () => {
    const reset = await a.client.from("clients").update({ status: "prospect" }).eq("id", clientA.id).select("status").single();
    assert.ifError(reset.error);
    assert.equal(reset.data!.status, "prospect", "départ : prospect");
    const up = await a.client.from("clients").update({ status: "client" }).eq("id", clientA.id).select("status").single();
    assert.ifError(up.error);
    assert.equal(up.data!.status, "client");
    assert.equal((await a.client.from("contacts").select("id").eq("client_id", clientA.id)).data!.length, 1);
  });
});

describe("lien d'une note à une fiche entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let clientA: { id: string };
  let clientB: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      await account.client.from("notes").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const fa = await a.client.from("clients").insert({ name: `${PREFIX} fiche liée A`, origin: "demo" }).select("id").single();
    assert.ifError(fa.error);
    clientA = fa.data!;
    const fb = await b.client.from("clients").insert({ name: `${PREFIX} fiche liée B`, origin: "demo" }).select("id").single();
    assert.ifError(fb.error);
    clientB = fb.data!;
  });

  after(cleanup);

  test("lier à sa fiche marche ; B ne peut pas lier ni déplacer une note vers la fiche de A", async () => {
    const own = await a.client.from("notes").insert({ title: `${PREFIX} note liée A`, client_id: clientA.id }).select("id, client_id").single();
    assert.ifError(own.error);
    assert.equal(own.data!.client_id, clientA.id);
    const onA = await b.client.from("notes").insert({ title: `${PREFIX} intrus`, client_id: clientA.id });
    assert.equal(onA.error?.code, "42501", "insertion liée à la fiche d'un autre refusée");
    const mine = await b.client.from("notes").insert({ title: `${PREFIX} note B`, client_id: clientB.id }).select("id").single();
    assert.ifError(mine.error);
    const move = await b.client.from("notes").update({ client_id: clientA.id }).eq("id", mine.data!.id).select("id");
    assert.ok(move.error || move.data!.length === 0, "déplacement vers la fiche d'un autre refusé");
    const seen = await b.client.from("notes").select("id").eq("client_id", clientA.id);
    assert.equal(seen.data!.length, 0, "B ne voit aucune note de la fiche de A");
  });

  test("passer en client garde le lien ; supprimer la fiche garde la note, déliée", async () => {
    const n = await a.client.from("notes").insert({ title: `${PREFIX} note promue`, client_id: clientA.id }).select("id").single();
    assert.ifError(n.error);
    assert.ifError((await a.client.from("clients").update({ status: "client" }).eq("id", clientA.id)).error);
    assert.equal((await a.client.from("notes").select("client_id").eq("id", n.data!.id).single()).data!.client_id, clientA.id);
    assert.ifError((await a.client.from("clients").delete().eq("id", clientA.id)).error);
    const after = await a.client.from("notes").select("client_id").eq("id", n.data!.id).single();
    assert.ifError(after.error);
    assert.equal(after.data!.client_id, null, "note conservée, sans lien");
  });
});

describe("isolation des missions entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let clientA: { id: string };
  let clientB: { id: string };
  let mA: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const fa = await a.client.from("clients").insert({ name: `${PREFIX} fiche missions A`, origin: "demo" }).select("id").single();
    assert.ifError(fa.error);
    clientA = fa.data!;
    const fb = await b.client.from("clients").insert({ name: `${PREFIX} fiche missions B`, origin: "demo" }).select("id").single();
    assert.ifError(fb.error);
    clientB = fb.data!;
    const ma = await a.client.from("missions").insert({ client_id: clientA.id, title: `${PREFIX} mission A` }).select("id").single();
    assert.ifError(ma.error);
    mA = ma.data!;
  });

  after(cleanup);

  test("chacun voit ses missions ; owner_id et statut par défaut remplis par la base ; B ne voit rien de A", async () => {
    const own = await a.client.from("missions").select("owner_id, status").eq("id", mA.id).single();
    assert.ifError(own.error);
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.status, "in_progress");
    assert.ok(!(await b.client.from("missions").select("id")).data!.some((m) => m.id === mA.id));
    assert.equal((await b.client.from("missions").select("id").eq("id", mA.id).maybeSingle()).data, null);
  });

  test("B ne peut ni modifier ni supprimer la mission de A", async () => {
    const upd = await b.client.from("missions").update({ title: "piraté" }).eq("id", mA.id).select("id");
    assert.ok(upd.error || upd.data!.length === 0, "modification refusée");
    const del = await b.client.from("missions").delete().eq("id", mA.id).select("id");
    assert.ok(del.error || del.data!.length === 0, "suppression refusée");
    const after = await a.client.from("missions").select("title, status, client_id").eq("id", mA.id).single();
    assert.deepEqual(after.data, { title: `${PREFIX} mission A`, status: "in_progress", client_id: clientA.id }, "la mission de A est intacte");
  });

  test("B ne peut pas créer une mission sur la fiche de A, ni déplacer la sienne, ni forger un owner_id", async () => {
    const onA = await b.client.from("missions").insert({ client_id: clientA.id, title: `${PREFIX} intrus` });
    assert.equal(onA.error?.code, "42501", "création sur la fiche d'un autre refusée");
    const mine = await b.client.from("missions").insert({ client_id: clientB.id, title: `${PREFIX} mission B` }).select("id").single();
    assert.ifError(mine.error);
    const move = await b.client.from("missions").update({ client_id: clientA.id }).eq("id", mine.data!.id).select("id");
    assert.equal(move.error?.code, "42501", "déplacement vers la fiche d'un autre refusé par la RLS (et non par un autre motif)");
    const forged = await b.client.from("missions").insert({ client_id: clientB.id, title: `${PREFIX} forgé`, owner_id: a.userId });
    assert.equal(forged.error?.code, "42501", "owner_id d'un autre refusé");
    assert.equal((await a.client.from("missions").select("id").eq("client_id", clientA.id)).data!.length, 1, "la fiche de A n'a reçu aucune mission étrangère");
  });

  test("sans connexion : rien de visible, rien de créable ni de supprimable", async () => {
    const anon = newClient();
    const read = await anon.from("missions").select("id");
    assert.ok(read.error || read.data!.length === 0);
    assert.ok((await anon.from("missions").insert({ client_id: clientA.id, title: `${PREFIX} anonyme` })).error);
    assert.equal((await anon.from("missions").delete().eq("id", mA.id).select("id")).data?.length ?? 0, 0);
  });

  test("la base refuse : titre vide ou trop long, statut inconnu, fin avant début, fiche absente", async () => {
    const ok = { client_id: clientA.id };
    // Le code d'erreur prouve le motif : 23514 = contrainte « check », 22P02 = valeur d'enum invalide, 42501 = RLS (fiche absente ou étrangère).
    for (const [label, row, code] of [
      ["titre vide", { ...ok, title: "  " }, "23514"],
      ["titre trop long", { ...ok, title: "x".repeat(201) }, "23514"],
      ["statut inconnu", { ...ok, title: "t", status: "bientôt" }, "22P02"],
      ["fin avant début", { ...ok, title: "t", start_date: "2026-10-20", end_date: "2026-10-10" }, "23514"],
      ["fiche absente", { client_id: "00000000-0000-0000-0000-000000000000", title: "t" }, "42501"],
    ] as const) {
      assert.equal((await a.client.from("missions").insert(row)).error?.code, code, `${label} refusé pour le bon motif`);
    }
    assert.ifError((await a.client.from("missions").insert({ ...ok, title: `${PREFIX} dates égales`, start_date: "2026-10-10", end_date: "2026-10-10" })).error);
  });

  test("une fiche qui a des missions ne se supprime pas (la mission reste) ; sans mission, elle se supprime", async () => {
    const del = await a.client.from("clients").delete().eq("id", clientA.id).select("id");
    assert.equal(del.error?.code, "23503", "suppression refusée par la base");
    assert.equal((await a.client.from("missions").select("id").eq("id", mA.id)).data!.length, 1, "la mission est conservée");
    assert.ok((await a.client.from("clients").select("id").eq("id", clientA.id).maybeSingle()).data, "la fiche est conservée");
    assert.ifError((await a.client.from("missions").delete().like("title", `${PREFIX}%`)).error);
    assert.ifError((await a.client.from("clients").delete().eq("id", clientA.id)).error);
  });
});

describe("isolation des user stories entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let clientA: { id: string };
  let clientB: { id: string };
  let missionA: { id: string };
  let missionB: { id: string };
  let sA: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // Les stories partent avec leur mission (cascade) ; les missions doivent partir avant leur fiche (restrict).
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("notes").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const fa = await a.client.from("clients").insert({ name: `${PREFIX} fiche stories A`, origin: "demo" }).select("id").single();
    assert.ifError(fa.error);
    clientA = fa.data!;
    const fb = await b.client.from("clients").insert({ name: `${PREFIX} fiche stories B`, origin: "demo" }).select("id").single();
    assert.ifError(fb.error);
    clientB = fb.data!;
    const ma = await a.client.from("missions").insert({ client_id: clientA.id, title: `${PREFIX} mission stories A` }).select("id").single();
    assert.ifError(ma.error);
    missionA = ma.data!;
    const mb = await b.client.from("missions").insert({ client_id: clientB.id, title: `${PREFIX} mission stories B` }).select("id").single();
    assert.ifError(mb.error);
    missionB = mb.data!;
    const sa = await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "voir mes inscriptions", position: 0 }).select("id").single();
    assert.ifError(sa.error);
    sA = sa.data!;
  });

  after(cleanup);

  test("owner_id et statut par défaut remplis par la base ; B ne voit rien de A", async () => {
    const own = await a.client.from("user_stories").select("owner_id, status, points").eq("id", sA.id).single();
    assert.ifError(own.error);
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.status, "todo");
    assert.equal(own.data!.points, null);
    assert.ok(!(await b.client.from("user_stories").select("id")).data!.some((s) => s.id === sA.id));
  });

  test("B ne peut ni modifier ni supprimer la story de A", async () => {
    const upd = await b.client.from("user_stories").update({ title: "piraté" }).eq("id", sA.id).select("id");
    assert.ok(upd.error || upd.data!.length === 0, "modification refusée");
    const del = await b.client.from("user_stories").delete().eq("id", sA.id).select("id");
    assert.ok(del.error || del.data!.length === 0, "suppression refusée");
    const after = await a.client.from("user_stories").select("title, status, mission_id").eq("id", sA.id).single();
    assert.deepEqual(after.data, { title: "voir mes inscriptions", status: "todo", mission_id: missionA.id }, "la story de A est intacte");
  });

  test("B ne peut pas créer une story sur la mission de A, ni déplacer la sienne vers elle, ni forger un owner_id", async () => {
    const onA = await b.client.from("user_stories").insert({ mission_id: missionA.id, title: "intrus", position: 0 });
    assert.equal(onA.error?.code, "42501", "création sur la mission d'un autre refusée");
    const mine = await b.client.from("user_stories").insert({ mission_id: missionB.id, title: "ma story", position: 0 }).select("id").single();
    assert.ifError(mine.error);
    const move = await b.client.from("user_stories").update({ mission_id: missionA.id }).eq("id", mine.data!.id).select("id");
    assert.equal(move.error?.code, "42501", "déplacement vers la mission d'un autre refusé par la RLS");
    const forged = await b.client.from("user_stories").insert({ mission_id: missionB.id, title: "forgé", position: 1, owner_id: a.userId });
    assert.equal(forged.error?.code, "42501", "owner_id d'un autre refusé");
    assert.equal((await a.client.from("user_stories").select("id").eq("mission_id", missionA.id)).data!.length, 1, "la mission de A n'a reçu aucune story étrangère");
  });

  test("sans connexion : rien de visible, rien de créable ni de supprimable", async () => {
    const anon = newClient();
    const read = await anon.from("user_stories").select("id");
    assert.ok(read.error || read.data!.length === 0);
    assert.ok((await anon.from("user_stories").insert({ mission_id: missionA.id, title: "anonyme", position: 0 })).error);
    assert.equal((await anon.from("user_stories").delete().eq("id", sA.id).select("id")).data?.length ?? 0, 0);
  });

  test("la base refuse, pour le bon motif : titre vide ou trop long, critères trop longs, points hors suite, statut inconnu, position négative, mission absente", async () => {
    const ok = { mission_id: missionA.id, position: 5 };
    for (const [label, row, code] of [
      ["titre vide", { ...ok, title: "  " }, "23514"],
      ["titre trop long", { ...ok, title: "x".repeat(201) }, "23514"],
      ["rôle trop long", { ...ok, title: "t", role: "r".repeat(201) }, "23514"],
      ["bénéfice trop long", { ...ok, title: "t", benefit: "b".repeat(301) }, "23514"],
      ["critères trop longs", { ...ok, title: "t", acceptance_criteria: "c".repeat(4001) }, "23514"],
      ["points hors suite", { ...ok, title: "t", points: 4 }, "23514"],
      ["statut inconnu", { ...ok, title: "t", status: "bientôt" }, "22P02"],
      ["position négative", { mission_id: missionA.id, title: "t", position: -1 }, "23514"],
      ["mission absente", { mission_id: "00000000-0000-0000-0000-000000000000", title: "t", position: 0 }, "42501"],
    ] as const) {
      assert.equal((await a.client.from("user_stories").insert(row)).error?.code, code, `${label} refusé pour le bon motif`);
    }
    assert.ifError((await a.client.from("user_stories").insert({ ...ok, title: "avec points", points: 13 })).error);
  });

  test("note source : une story peut citer ma note ; la note d'un autre compte est refusée (insertion et mise à jour) ; supprimer la note retire le lien sans supprimer la story", async () => {
    const mine = await a.client.from("notes").insert({ title: `${PREFIX} note source A` }).select("id").single();
    assert.ifError(mine.error);
    const theirs = await b.client.from("notes").insert({ title: `${PREFIX} note source B` }).select("id").single();
    assert.ifError(theirs.error);
    const ok = await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "avec source", position: 7, source_note_id: mine.data!.id }).select("id, source_note_id").single();
    assert.ifError(ok.error);
    assert.equal(ok.data!.source_note_id, mine.data!.id);
    const forged = await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "source étrangère", position: 8, source_note_id: theirs.data!.id });
    assert.equal(forged.error?.code, "42501", "citer la note d'un autre compte refusé à l'insertion");
    const rewrite = await a.client.from("user_stories").update({ source_note_id: theirs.data!.id }).eq("id", ok.data!.id).select("id");
    assert.equal(rewrite.error?.code, "42501", "citer la note d'un autre compte refusé à la mise à jour");
    assert.equal((await a.client.from("user_stories").select("source_note_id").eq("id", ok.data!.id).single()).data!.source_note_id, mine.data!.id, "la source d'origine est conservée");
    assert.ifError((await a.client.from("notes").delete().eq("id", mine.data!.id)).error);
    const after = await a.client.from("user_stories").select("id, source_note_id").eq("id", ok.data!.id).single();
    assert.equal(after.data!.source_note_id, null, "le lien est retiré avec la note");
    assert.ok(after.data!.id, "la story reste");
    assert.ifError((await b.client.from("notes").delete().eq("id", theirs.data!.id)).error);
  });

  test("supprimer une mission emporte son backlog", async () => {
    const m = await a.client.from("missions").insert({ client_id: clientA.id, title: `${PREFIX} mission éphémère` }).select("id").single();
    assert.ifError(m.error);
    assert.ifError((await a.client.from("user_stories").insert({ mission_id: m.data!.id, title: "partira avec elle", position: 0 })).error);
    assert.ifError((await a.client.from("missions").delete().eq("id", m.data!.id)).error);
    assert.equal((await a.client.from("user_stories").select("id").eq("mission_id", m.data!.id)).data!.length, 0, "le backlog a disparu avec sa mission");
  });
});

describe("isolation des tâches entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let missionA: { id: string };
  let storyA: { id: string };
  let storyB: { id: string };
  let taskA: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // Les tâches partent avec leur story, les stories avec leur mission (cascade) ; les missions partent avant leur fiche (restrict).
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const mk = async (account: Account, who: string) => {
      const f = await account.client.from("clients").insert({ name: `${PREFIX} fiche tâches ${who}`, origin: "demo" }).select("id").single();
      assert.ifError(f.error);
      const m = await account.client.from("missions").insert({ client_id: f.data!.id, title: `${PREFIX} mission tâches ${who}` }).select("id").single();
      assert.ifError(m.error);
      const s = await account.client.from("user_stories").insert({ mission_id: m.data!.id, title: `story ${who}`, position: 0 }).select("id").single();
      assert.ifError(s.error);
      return { mission: m.data!, story: s.data! };
    };
    const ra = await mk(a, "A");
    const rb = await mk(b, "B");
    missionA = ra.mission;
    storyA = ra.story;
    storyB = rb.story;
    const t = await a.client.from("tasks").insert({ story_id: storyA.id, title: "écrire le plan", position: 0 }).select("id").single();
    assert.ifError(t.error);
    taskA = t.data!;
  });

  after(cleanup);

  test("chaque compte ne voit que ses tâches ; le propriétaire et l'état par défaut sont posés par la base", async () => {
    const own = await a.client.from("tasks").select("owner_id, done").eq("id", taskA.id).single();
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.done, false);
    assert.ok(!(await b.client.from("tasks").select("id")).data!.some((t) => t.id === taskA.id), "B ne voit pas la tâche de A");
  });

  test("B ne peut ni modifier, ni cocher, ni supprimer la tâche de A", async () => {
    const upd = await b.client.from("tasks").update({ title: "piraté", done: true }).eq("id", taskA.id).select("id");
    assert.equal(upd.data?.length ?? 0, 0);
    const del = await b.client.from("tasks").delete().eq("id", taskA.id).select("id");
    assert.equal(del.data?.length ?? 0, 0);
    const after = await a.client.from("tasks").select("title, done").eq("id", taskA.id).single();
    assert.deepEqual(after.data, { title: "écrire le plan", done: false });
  });

  test("B ne peut pas ajouter une tâche à la story de A, ni y déplacer la sienne, ni forger un autre propriétaire", async () => {
    assert.equal((await b.client.from("tasks").insert({ story_id: storyA.id, title: "intrus", position: 1 })).error?.code, "42501");
    const mine = await b.client.from("tasks").insert({ story_id: storyB.id, title: "ma tâche", position: 0 }).select("id").single();
    assert.ifError(mine.error);
    const move = await b.client.from("tasks").update({ story_id: storyA.id }).eq("id", mine.data!.id).select("id");
    assert.ok(move.error || (move.data?.length ?? 0) === 0, "le déplacement vers la story de A est refusé");
    assert.equal((await b.client.from("tasks").select("story_id").eq("id", mine.data!.id).single()).data!.story_id, storyB.id, "la tâche de B est restée dans la story de B");
    assert.equal((await a.client.from("tasks").insert({ story_id: storyB.id, title: "intrus de A", position: 9 })).error?.code, "42501", "A ne peut pas non plus écrire dans la story de B");
    assert.equal((await b.client.from("tasks").insert({ story_id: storyB.id, title: "forgée", position: 1, owner_id: a.userId })).error?.code, "42501");
    assert.equal((await a.client.from("tasks").select("id").eq("story_id", storyA.id)).data!.length, 1, "la story de A n'a reçu aucune tâche étrangère");
  });

  test("sans connexion : rien de visible, rien de créable ni de supprimable", async () => {
    const anon = newClient();
    const read = await anon.from("tasks").select("id");
    assert.ok(read.error || read.data!.length === 0);
    assert.ok((await anon.from("tasks").insert({ story_id: storyA.id, title: "anonyme", position: 0 })).error);
    assert.equal((await anon.from("tasks").delete().eq("id", taskA.id).select("id")).data?.length ?? 0, 0);
  });

  test("titre vide ou trop long, position négative : refusés pour le bon motif ; 200 caractères acceptés", async () => {
    const base = { story_id: storyA.id, position: 5 };
    for (const [label, row] of [
      ["titre vide", { ...base, title: "   " }],
      ["titre de 201 caractères", { ...base, title: "x".repeat(201) }],
      ["position négative", { ...base, title: "ok", position: -1 }],
    ] as const) {
      assert.equal((await a.client.from("tasks").insert(row)).error?.code, "23514", `${label} refusé`);
    }
    assert.ifError((await a.client.from("tasks").insert({ ...base, title: "x".repeat(200) })).error);
  });

  test("B ne peut pas renuméroter la tâche de A ; le propriétaire ne se change pas ; les contraintes valent aussi à la mise à jour ; cocher met à jour la date", async () => {
    const renum = await b.client.from("tasks").update({ position: 7 }).eq("id", taskA.id).select("id");
    assert.equal(renum.data?.length ?? 0, 0);
    assert.equal((await a.client.from("tasks").update({ owner_id: b.userId }).eq("id", taskA.id)).error?.code, "42501", "donner sa tâche à un autre compte est refusé");
    for (const [label, values] of [
      ["titre vide", { title: "   " }],
      ["titre de 201 caractères", { title: "x".repeat(201) }],
      ["position négative", { position: -1 }],
    ] as const) {
      assert.equal((await a.client.from("tasks").update(values).eq("id", taskA.id)).error?.code, "23514", `${label} refusé à la mise à jour`);
    }
    const before = (await a.client.from("tasks").select("updated_at").eq("id", taskA.id).single()).data!.updated_at;
    await new Promise((r) => setTimeout(r, 20));
    assert.ifError((await a.client.from("tasks").update({ done: true }).eq("id", taskA.id)).error);
    const after = await a.client.from("tasks").select("updated_at, done").eq("id", taskA.id).single();
    assert.equal(after.data!.done, true);
    assert.ok(after.data!.updated_at > before, "updated_at avance quand on coche");
    assert.ifError((await a.client.from("tasks").update({ done: false }).eq("id", taskA.id)).error);
  });

  test("ajout groupé (propositions de l'IA) : positions consécutives en une écriture ; une ligne invalide fait tout refuser, rien n'est écrit", async () => {
    const s = await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "groupée", position: 20 }).select("id").single();
    assert.ifError(s.error);
    const rows = ["un", "deux", "trois"].map((title, i) => ({ story_id: s.data!.id, title, position: i }));
    assert.ifError((await a.client.from("tasks").insert(rows)).error);
    const read = await a.client.from("tasks").select("title, position").eq("story_id", s.data!.id).order("position");
    assert.deepEqual(read.data, [{ title: "un", position: 0 }, { title: "deux", position: 1 }, { title: "trois", position: 2 }]);
    const bad = await a.client.from("tasks").insert([{ story_id: s.data!.id, title: "bonne", position: 3 }, { story_id: s.data!.id, title: "   ", position: 4 }]);
    assert.equal(bad.error?.code, "23514");
    assert.equal((await a.client.from("tasks").select("id").eq("story_id", s.data!.id)).data!.length, 3, "aucune ligne du lot refusé n'a été écrite");
    const foreign = await b.client.from("tasks").insert([{ story_id: storyB.id, title: "à moi", position: 5 }, { story_id: s.data!.id, title: "à elle", position: 6 }]);
    assert.equal(foreign.error?.code, "42501", "un lot qui vise la story d'un autre compte est refusé en entier");
    assert.equal((await b.client.from("tasks").select("id").eq("story_id", storyB.id).eq("title", "à moi")).data!.length, 0, "et sa ligne valide n'est pas écrite non plus");
  });

  test("supprimer une story, puis une mission, emporte les tâches", async () => {
    const s = await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "éphémère", position: 9 }).select("id").single();
    assert.ifError(s.error);
    assert.ifError((await a.client.from("tasks").insert({ story_id: s.data!.id, title: "partira avec elle", position: 0 })).error);
    assert.ifError((await a.client.from("user_stories").delete().eq("id", s.data!.id)).error);
    assert.equal((await a.client.from("tasks").select("id").eq("story_id", s.data!.id)).data!.length, 0, "la tâche a disparu avec sa story");
    assert.ok((await a.client.from("tasks").select("id").eq("story_id", storyA.id)).data!.length >= 1, "la story de A avait bien des tâches avant la suppression");
    assert.ifError((await a.client.from("missions").delete().eq("id", missionA.id)).error);
    assert.equal((await a.client.from("tasks").select("id").eq("story_id", storyA.id)).data!.length, 0, "les tâches ont disparu avec la mission");
    assert.equal((await b.client.from("tasks").select("id").eq("story_id", storyB.id)).data!.length, 1, "la tâche de B reste");
  });
});

describe("isolation des sprints entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let missionA: { id: string };
  let missionA2: { id: string };
  let missionB: { id: string };
  let sprintA: { id: string };
  let storyA: { id: string };
  let storyB: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // Sprints et stories partent avec leur mission (cascade) ; les missions partent avant leur fiche (restrict).
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const mk = async (account: Account, who: string, title: string) => {
      const f = await account.client.from("clients").insert({ name: `${PREFIX} fiche sprints ${who}${title}`, origin: "demo" }).select("id").single();
      assert.ifError(f.error);
      const m = await account.client.from("missions").insert({ client_id: f.data!.id, title: `${PREFIX} mission sprints ${who}${title}` }).select("id").single();
      assert.ifError(m.error);
      return m.data!;
    };
    missionA = await mk(a, "A", "");
    missionA2 = await mk(a, "A", " 2");
    missionB = await mk(b, "B", "");
    const sp = await a.client.from("sprints").insert({ mission_id: missionA.id, name: "Sprint 1", goal: "un objectif", start_date: "2026-10-19", end_date: "2026-10-30" }).select("id").single();
    assert.ifError(sp.error);
    sprintA = sp.data!;
    const sa = await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "story A", position: 0 }).select("id").single();
    assert.ifError(sa.error);
    storyA = sa.data!;
    const sb = await b.client.from("user_stories").insert({ mission_id: missionB.id, title: "story B", position: 0 }).select("id").single();
    assert.ifError(sb.error);
    storyB = sb.data!;
  });

  after(cleanup);

  test("propriétaire et état posés par la base ; B ne voit rien de A", async () => {
    const own = await a.client.from("sprints").select("owner_id, status").eq("id", sprintA.id).single();
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.status, "planned");
    assert.ok(!(await b.client.from("sprints").select("id")).data!.some((s) => s.id === sprintA.id));
  });

  test("B ne peut ni modifier, ni démarrer, ni supprimer le sprint de A", async () => {
    const upd = await b.client.from("sprints").update({ name: "piraté", status: "active" }).eq("id", sprintA.id).select("id");
    assert.equal(upd.data?.length ?? 0, 0);
    assert.equal((await b.client.from("sprints").delete().eq("id", sprintA.id).select("id")).data?.length ?? 0, 0);
    const after = await a.client.from("sprints").select("name, status").eq("id", sprintA.id).single();
    assert.deepEqual(after.data, { name: "Sprint 1", status: "planned" });
  });

  test("B ne peut pas créer un sprint sur la mission de A, ni déplacer le sien vers elle, ni forger un propriétaire", async () => {
    const base = { name: "intrus", start_date: "2026-10-19", end_date: "2026-10-30" };
    assert.equal((await b.client.from("sprints").insert({ ...base, mission_id: missionA.id })).error?.code, "42501");
    const mine = await b.client.from("sprints").insert({ ...base, mission_id: missionB.id }).select("id").single();
    assert.ifError(mine.error);
    const move = await b.client.from("sprints").update({ mission_id: missionA.id }).eq("id", mine.data!.id).select("id");
    assert.ok(move.error || (move.data?.length ?? 0) === 0);
    assert.equal((await b.client.from("sprints").select("mission_id").eq("id", mine.data!.id).single()).data!.mission_id, missionB.id, "le sprint de B est resté sur la mission de B");
    assert.equal((await b.client.from("sprints").insert({ ...base, mission_id: missionB.id, owner_id: a.userId })).error?.code, "42501");
  });

  test("sans connexion : rien de visible, rien de créable ni de supprimable", async () => {
    const anon = newClient();
    const read = await anon.from("sprints").select("id");
    assert.ok(read.error || read.data!.length === 0);
    assert.ok((await anon.from("sprints").insert({ mission_id: missionA.id, name: "anonyme", start_date: "2026-10-19", end_date: "2026-10-30" })).error);
    assert.equal((await anon.from("sprints").delete().eq("id", sprintA.id).select("id")).data?.length ?? 0, 0);
  });

  test("la base refuse, pour le bon motif : nom vide ou trop long, objectif trop long, fin avant début, dates absentes, état inconnu", async () => {
    const ok = { mission_id: missionA.id, name: "valide", start_date: "2026-11-02", end_date: "2026-11-13" };
    for (const [label, row, code] of [
      ["nom vide", { ...ok, name: "   " }, "23514"],
      ["nom de 121 caractères", { ...ok, name: "x".repeat(121) }, "23514"],
      ["objectif vide", { ...ok, goal: "  " }, "23514"],
      ["objectif de 301 caractères", { ...ok, goal: "x".repeat(301) }, "23514"],
      ["fin avant début", { ...ok, start_date: "2026-11-13", end_date: "2026-11-02" }, "23514"],
      ["début absent", { ...ok, start_date: null }, "23502"],
      ["fin absente", { ...ok, end_date: null }, "23502"],
      ["état inconnu", { ...ok, status: "pause" }, "22P02"],
    ] as const) {
      assert.equal((await a.client.from("sprints").insert(row)).error?.code, code, `${label} refusé pour le bon motif`);
    }
    assert.ifError((await a.client.from("sprints").insert({ ...ok, name: "x".repeat(120), start_date: "2026-11-02", end_date: "2026-11-02" })).error);
  });

  test("un seul sprint « en cours » par mission ; plusieurs autorisés dans deux missions ; démarrer deux fois le même est sans effet", async () => {
    const mk = async (mission: { id: string }, name: string) => {
      const r = await a.client.from("sprints").insert({ mission_id: mission.id, name, start_date: "2026-12-01", end_date: "2026-12-12" }).select("id").single();
      assert.ifError(r.error);
      return r.data!;
    };
    const s1 = await mk(missionA, "actif 1");
    const s2 = await mk(missionA, "actif 2");
    const other = await mk(missionA2, "autre mission");
    assert.ifError((await a.client.from("sprints").update({ status: "active" }).eq("id", s1.id)).error);
    assert.equal((await a.client.from("sprints").update({ status: "active" }).eq("id", s2.id)).error?.code, "23505", "deuxième sprint en cours refusé");
    assert.equal((await a.client.from("sprints").update({ status: "active" }).eq("id", other.id)).error?.message ?? null, null, "une autre mission peut avoir son sprint en cours");
    assert.equal((await a.client.from("sprints").update({ status: "active" }).eq("id", s1.id).eq("status", "planned").select("id")).data?.length ?? 0, 0, "déjà en cours : la condition « planifié » ne trouve rien");
    assert.ifError((await a.client.from("sprints").update({ status: "closed" }).eq("id", s1.id)).error);
    assert.equal((await a.client.from("sprints").update({ status: "active" }).eq("id", s2.id)).error?.message ?? null, null, "après la clôture, un autre sprint peut démarrer");
  });

  test("placer une story : mon sprint de la même mission oui ; sprint d'une autre mission, d'un autre compte ou inexistant refusés (insertion et mise à jour)", async () => {
    assert.ifError((await a.client.from("user_stories").update({ sprint_id: sprintA.id }).eq("id", storyA.id)).error);
    assert.equal((await a.client.from("user_stories").select("sprint_id").eq("id", storyA.id).single()).data!.sprint_id, sprintA.id);
    const other = await a.client.from("sprints").insert({ mission_id: missionA2.id, name: "autre mission", start_date: "2026-10-19", end_date: "2026-10-30" }).select("id").single();
    assert.ifError(other.error);
    assert.equal((await a.client.from("user_stories").update({ sprint_id: other.data!.id }).eq("id", storyA.id).select("id")).error?.code, "42501", "sprint d'une autre de mes missions refusé");
    assert.equal((await b.client.from("user_stories").update({ sprint_id: sprintA.id }).eq("id", storyB.id).select("id")).error?.code, "42501", "sprint d'un autre compte refusé");
    assert.equal((await b.client.from("user_stories").insert({ mission_id: missionB.id, title: "forgée", position: 5, sprint_id: sprintA.id })).error?.code, "42501");
    assert.equal((await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "sprint inexistant", position: 6, sprint_id: "00000000-0000-4000-8000-000000000000" })).error?.code, "42501");
    assert.equal((await b.client.from("user_stories").select("sprint_id").eq("id", storyB.id).single()).data!.sprint_id, null, "la story de B n'a pas bougé");
    assert.equal((await a.client.from("user_stories").update({ sprint_id: null }).eq("id", storyA.id)).error?.message ?? null, null, "retour au backlog");
  });

  test("supprimer un sprint renvoie ses stories au backlog ; supprimer une mission emporte ses sprints", async () => {
    const sp = await a.client.from("sprints").insert({ mission_id: missionA.id, name: "éphémère", start_date: "2026-10-19", end_date: "2026-10-30" }).select("id").single();
    assert.ifError(sp.error);
    assert.ifError((await a.client.from("user_stories").update({ sprint_id: sp.data!.id }).eq("id", storyA.id)).error);
    assert.ifError((await a.client.from("sprints").delete().eq("id", sp.data!.id)).error);
    const back = await a.client.from("user_stories").select("id, sprint_id").eq("id", storyA.id).single();
    assert.ok(back.data && back.data.sprint_id === null, "la story est restée, sans sprint");
    const m = await a.client.from("missions").insert({ client_id: (await a.client.from("clients").select("id").like("name", `${PREFIX}%`).limit(1).single()).data!.id, title: `${PREFIX} mission éphémère sprints` }).select("id").single();
    assert.ifError(m.error);
    assert.ifError((await a.client.from("sprints").insert({ mission_id: m.data!.id, name: "partira", start_date: "2026-10-19", end_date: "2026-10-30" })).error);
    assert.ifError((await a.client.from("missions").delete().eq("id", m.data!.id)).error);
    assert.equal((await a.client.from("sprints").select("id").eq("mission_id", m.data!.id)).data!.length, 0);
  });

  test("un sprint clos est figé en base : aucune story n'y entre ni n'en sort ; sa suppression renvoie ses stories au backlog", async () => {
    const mk = async (status: "planned" | "closed", name: string) => {
      const r = await a.client.from("sprints").insert({ mission_id: missionA.id, name, start_date: "2026-08-03", end_date: "2026-08-14", status }).select("id").single();
      assert.ifError(r.error);
      return r.data!;
    };
    const story = async (title: string, sprint_id: string | null) => {
      const r = await a.client.from("user_stories").insert({ mission_id: missionA.id, title, position: 90, sprint_id }).select("id").single();
      assert.ifError(r.error);
      return r.data!;
    };
    // Un sprint planifié reçoit une story, puis est clos : la story est dedans, figée.
    const sp = await mk("planned", "à clore");
    const inside = await story("dans le sprint", sp.id);
    assert.ifError((await a.client.from("sprints").update({ status: "closed" }).eq("id", sp.id)).error);
    const loose = await story("libre", null);
    assert.equal((await a.client.from("user_stories").update({ sprint_id: sp.id }).eq("id", loose.id)).error?.code, "23514", "entrer dans un sprint clos refusé");
    assert.equal((await a.client.from("user_stories").insert({ mission_id: missionA.id, title: "neuve", position: 91, sprint_id: sp.id })).error?.code, "23514", "créer une story dans un sprint clos refusé");
    assert.equal((await a.client.from("user_stories").update({ sprint_id: null }).eq("id", inside.id)).error?.code, "23514", "sortir d'un sprint clos refusé");
    const other = await mk("planned", "autre");
    assert.equal((await a.client.from("user_stories").update({ sprint_id: other.id }).eq("id", inside.id)).error?.code, "23514", "passer d'un sprint clos à un autre refusé");
    assert.ifError((await a.client.from("user_stories").update({ status: "done", title: "renommée" }).eq("id", inside.id)).error); // statut et texte restent modifiables
    assert.equal((await a.client.from("user_stories").select("sprint_id").eq("id", inside.id).single()).data!.sprint_id, sp.id);
    // Supprimer le sprint clos reste possible et renvoie ses stories au backlog.
    assert.ifError((await a.client.from("sprints").delete().eq("id", sp.id)).error);
    assert.equal((await a.client.from("user_stories").select("sprint_id").eq("id", inside.id).single()).data!.sprint_id, null);
  });
});

describe("isolation des devis entre deux comptes fictifs", () => {
  // Brouillons seulement : un devis envoyé, refusé ou accepté ne se supprime jamais (le cycle complet est dans tests/sql/quotes-lifecycle.sql).
  let a: Account;
  let b: Account;
  let clientA: { id: string };
  let clientB: { id: string };
  let missionA: { id: string };
  let quoteA: { id: string };

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const mk = async (account: Account, who: string) => {
      const f = await account.client.from("clients").insert({ name: `${PREFIX} fiche devis ${who}`, origin: "demo" }).select("id").single();
      assert.ifError(f.error);
      return f.data!;
    };
    clientA = await mk(a, "A");
    clientB = await mk(b, "B");
    const m = await a.client.from("missions").insert({ client_id: clientA.id, title: `${PREFIX} mission devis A` }).select("id").single();
    assert.ifError(m.error);
    missionA = m.data!;
    const q = await a.client.from("quotes").insert({ client_id: clientA.id, amount_ht_cents: 12345 }).select("id").single();
    assert.ifError(q.error);
    quoteA = q.data!;
  });

  after(async () => {
    // Les devis d'abord (restrict sur la fiche et la mission) ; seuls des brouillons sont créés ici.
    for (const account of [a, b]) if (account) await account.client.from("quotes").delete().in("client_id", [clientA?.id, clientB?.id].filter(Boolean) as string[]);
    await cleanup();
  });

  test("propriétaire et brouillon posés par la base ; B ne voit rien de A", async () => {
    const own = await a.client.from("quotes").select("owner_id, status, tax_cents").eq("id", quoteA.id).single();
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.status, "draft");
    assert.equal(own.data!.tax_cents, null, "taxe inconnue : jamais 0");
    const seen = await b.client.from("quotes").select("id").eq("id", quoteA.id);
    assert.deepEqual(seen.data, []);
  });

  test("B ne modifie ni ne supprime le devis de A", async () => {
    const upd = await b.client.from("quotes").update({ amount_ht_cents: 1 }).eq("id", quoteA.id).select("id");
    assert.deepEqual(upd.data, []);
    const del = await b.client.from("quotes").delete().eq("id", quoteA.id).select("id");
    assert.deepEqual(del.data, []);
    const still = await a.client.from("quotes").select("amount_ht_cents").eq("id", quoteA.id).single();
    assert.equal(still.data!.amount_ht_cents, 12345);
  });

  test("B ne crée pas de devis sur la fiche de A ni vers la mission de A ; A ne forge pas le propriétaire ni ne déplace son devis chez B", async () => {
    const onA = await b.client.from("quotes").insert({ client_id: clientA.id, amount_ht_cents: 100 });
    assert.equal(onA.error?.code, "42501");
    const withMission = await b.client.from("quotes").insert({ client_id: clientB.id, mission_id: missionA.id, amount_ht_cents: 100 });
    assert.equal(withMission.error?.code, "42501");
    const forged = await a.client.from("quotes").insert({ owner_id: b.userId, client_id: clientA.id, amount_ht_cents: 100 });
    assert.equal(forged.error?.code, "42501");
    const moved = await a.client.from("quotes").update({ client_id: clientB.id }).eq("id", quoteA.id);
    assert.equal(moved.error?.code, "42501");
  });

  test("accept_quote : un brouillon est refusé, le devis de A est introuvable pour B", async () => {
    const draft = await a.client.rpc("accept_quote", { p_quote_id: quoteA.id });
    assert.equal(draft.error?.code, "23514");
    const foreign = await b.client.rpc("accept_quote", { p_quote_id: quoteA.id });
    assert.equal(foreign.error?.code, "P0002");
  });

  test("sans connexion : rien de visible ni de créable, accept_quote refusée", async () => {
    const anon = newClient();
    const read = await anon.from("quotes").select("id");
    assert.ifError(read.error);
    assert.deepEqual(read.data, []);
    const write = await anon.from("quotes").insert({ client_id: clientA.id, amount_ht_cents: 100 });
    assert.equal(write.error?.code, "42501");
    const accept = await anon.rpc("accept_quote", { p_quote_id: quoteA.id });
    assert.equal(accept.error?.code, "42501");
  });

  test("la base refuse un montant nul, une taxe négative, un devis créé « envoyé », « accepté » ou « refusé » ; un brouillon se supprime", async () => {
    const zero = await a.client.from("quotes").insert({ client_id: clientA.id, amount_ht_cents: 0 });
    assert.equal(zero.error?.code, "23514");
    const tax = await a.client.from("quotes").insert({ client_id: clientA.id, amount_ht_cents: 100, tax_cents: -1 });
    assert.equal(tax.error?.code, "23514");
    for (const status of ["sent", "accepted", "refused"]) {
      const direct = await a.client.from("quotes").insert({ client_id: clientA.id, amount_ht_cents: 100, status, sent_on: "2026-10-19" });
      assert.equal(direct.error?.code, "42501", `création directe « ${status} » refusée`);
    }
    const del = await a.client.from("quotes").delete().eq("id", quoteA.id).select("id");
    assert.equal(del.data?.length, 1, "un brouillon se supprime");
  });
});

describe("isolation de la recherche de missions (⌘K) entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    for (const [account, who] of [[a, "A"], [b, "B"]] as const) {
      const f = await account.client.from("clients").insert({ name: `${PREFIX} fiche recherche ${who}`, origin: "demo" }).select("id").single();
      assert.ifError(f.error);
      const m = await account.client.from("missions").insert({ client_id: f.data!.id, title: `${PREFIX} mission recherche ${who}` }).select("id").single();
      assert.ifError(m.error);
    }
  });

  after(cleanup);

  test("la lecture qui alimente la recherche (missions et nom du client) ne renvoie que mes missions", async () => {
    const select = "id, title, status, client:clients(name)";
    const mineA = await a.client.from("missions").select(select).like("title", `${PREFIX} mission recherche%`);
    assert.ifError(mineA.error);
    assert.deepEqual((mineA.data as unknown as { title: string }[]).map((m) => m.title), [`${PREFIX} mission recherche A`]);
    const mineB = await b.client.from("missions").select(select).like("title", `${PREFIX} mission recherche%`);
    assert.deepEqual((mineB.data as unknown as { title: string }[]).map((m) => m.title), [`${PREFIX} mission recherche B`]);
    const embedded = (mineA.data as unknown as { client: { name: string } | null }[])[0].client;
    assert.equal(embedded?.name, `${PREFIX} fiche recherche A`, "le nom du client lié est lisible pour son propriétaire");
  });
});

describe("isolation du profil professionnel entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;

  // État de départ d'une ligne (champs, textes « Autre », dates de confirmation) ; le déclencheur gère les dates.
  const INITIAL = {
    legal_status: "micro_enterprise", legal_status_other: null, tax_regime: null, tax_regime_other: null, activity_category: "bnc",
    service_nature: null, service_nature_other: null, activity_start_date: null, urssaf_frequency: null, urssaf_frequency_other: null,
    vat_regime: null, vat_regime_other: null, acre: null, job_seeker: null, job_seeker_other: null,
    financial_goals: null, reserve_rates: null, notification_prefs: null, alert_thresholds: [90, 100],
    legal_status_confirmed_at: null, tax_regime_confirmed_at: null, activity_category_confirmed_at: null, service_nature_confirmed_at: null,
    activity_start_date_confirmed_at: null, urssaf_frequency_confirmed_at: null, vat_regime_confirmed_at: null, acre_confirmed_at: null,
    job_seeker_confirmed_at: null, financial_goals_confirmed_at: null, reserve_rates_confirmed_at: null, notification_prefs_confirmed_at: null,
  };

  // La ligne du profil ne se supprime pas (aucune règle de suppression) : les essais remettent le champ touché à vide.
  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      await account.client.from("professional_profile").update(INITIAL).eq("owner_id", account.userId);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    for (const account of [a, b]) {
      const { error } = await account.client.from("professional_profile").upsert({}, { onConflict: "owner_id", ignoreDuplicates: true });
      assert.ifError(error);
    }
    await cleanup();
  });

  after(cleanup);

  test("ma ligne porte mon propriétaire, statut et catégorie « Déclaré » (sans date), seuils 90 et 100 ; B ne voit que la sienne", async () => {
    const mine = await a.client.from("professional_profile").select("*");
    assert.ifError(mine.error);
    assert.equal(mine.data!.length, 1);
    assert.equal(mine.data![0].owner_id, a.userId);
    assert.equal(mine.data![0].legal_status, "micro_enterprise");
    assert.equal(mine.data![0].legal_status_confirmed_at, null);
    assert.equal(mine.data![0].activity_category, "bnc");
    assert.equal(mine.data![0].tax_regime, null);
    assert.equal(mine.data![0].activity_start_date, null);
    assert.deepEqual(mine.data![0].alert_thresholds, [90, 100]);
    const theirs = await b.client.from("professional_profile").select("owner_id").eq("owner_id", a.userId);
    assert.deepEqual(theirs.data, []);
  });

  test("B ne modifie ni ne supprime le profil de A", async () => {
    const upd = await b.client.from("professional_profile").update({ financial_goals: `${PREFIX} piraté` }).eq("owner_id", a.userId).select("owner_id");
    assert.ifError(upd.error);
    assert.deepEqual(upd.data, []);
    const del = await b.client.from("professional_profile").delete().eq("owner_id", a.userId).select("owner_id");
    assert.deepEqual(del.data, []);
    const del2 = await a.client.from("professional_profile").delete().eq("owner_id", a.userId).select("owner_id");
    assert.deepEqual(del2.data, [], "aucune règle de suppression, même pour le propriétaire");
    const still = await a.client.from("professional_profile").select("financial_goals");
    assert.equal(still.data![0].financial_goals, null);
  });

  test("B ne crée pas de ligne au nom de A ; A ne déplace pas sa ligne chez B", async () => {
    // Code exact : 42501 = refus de la RLS (une clé primaire déjà prise donnerait 23505 et masquerait un contrôle disparu).
    const ins = await b.client.from("professional_profile").insert({ owner_id: a.userId });
    assert.equal(ins.error?.code, "42501", "insertion au nom d'un autre refusée par la RLS");
    const ghost = await b.client.from("professional_profile").insert({ owner_id: crypto.randomUUID() });
    assert.equal(ghost.error?.code, "42501", "insertion au nom d'un compte inconnu refusée par la RLS");
    const move = await a.client.from("professional_profile").update({ owner_id: b.userId }).eq("owner_id", a.userId).select("owner_id");
    assert.ifError(move.error); // acceptée mais sans effet : le déclencheur garde le propriétaire
    const mine = await a.client.from("professional_profile").select("owner_id");
    assert.equal(mine.data![0].owner_id, a.userId, "la ligne reste chez A");
    const theirs = await b.client.from("professional_profile").select("owner_id");
    assert.deepEqual(theirs.data, [{ owner_id: b.userId }], "B n'a toujours que la sienne");
  });

  test("sans connexion : rien de visible ni de créable", async () => {
    const anon = newClient();
    const read = await anon.from("professional_profile").select("owner_id");
    assert.deepEqual(read.data ?? [], []);
    const ins = await anon.from("professional_profile").insert({});
    assert.equal(ins.error?.code, "42501");
  });

  test("modifier une valeur confirmée la repasse en « Déclaré » ; la confirmer pose la date ; la vider efface la date", async () => {
    const set = await a.client.from("professional_profile").update({ vat_regime: "franchise" }).eq("owner_id", a.userId).select("vat_regime, vat_regime_confirmed_at").single();
    assert.ifError(set.error);
    assert.equal(set.data!.vat_regime_confirmed_at, null);
    const conf = await a.client.from("professional_profile").update({ vat_regime_confirmed_at: new Date().toISOString() }).eq("owner_id", a.userId).select("vat_regime_confirmed_at").single();
    assert.ok(conf.data!.vat_regime_confirmed_at);
    const change = await a.client.from("professional_profile").update({ vat_regime: "normal" }).eq("owner_id", a.userId).select("vat_regime_confirmed_at").single();
    assert.equal(change.data!.vat_regime_confirmed_at, null, "valeur modifiée sans nouvelle date : Déclaré");
    await a.client.from("professional_profile").update({ vat_regime_confirmed_at: new Date().toISOString() }).eq("owner_id", a.userId);
    const clear = await a.client.from("professional_profile").update({ vat_regime: null }).eq("owner_id", a.userId).select("vat_regime_confirmed_at").single();
    assert.equal(clear.data!.vat_regime_confirmed_at, null, "champ vidé : date effacée");
  });

  test("la base refuse, pour le bon motif : « Autre » sans texte, texte sans « Autre », date de confirmation sans valeur, date inexistante, seuil inconnu ou doublon, texte trop long", async () => {
    const upd = (patch: Record<string, unknown>) => a.client.from("professional_profile").update(patch).eq("owner_id", a.userId).select("owner_id");
    const code = async (patch: Record<string, unknown>) => (await upd(patch)).error?.code;
    assert.equal(await code({ vat_regime: "other" }), "23514");
    assert.equal(await code({ vat_regime: "franchise", vat_regime_other: "x" }), "23514");
    assert.equal(await code({ vat_regime: "other", vat_regime_other: "   " }), "23514");
    assert.equal(await code({ vat_regime: null, vat_regime_confirmed_at: new Date().toISOString() }), "23514");
    assert.equal(await code({ activity_start_date: "2026-02-30" }), "22008");
    assert.equal(await code({ alert_thresholds: [60] }), "23514");
    assert.equal(await code({ alert_thresholds: [90, 90] }), "23514");
    assert.equal(await code({ financial_goals: "x".repeat(2001) }), "23514");
    assert.equal(await code({ vat_regime: "inconnu" }), "22P02");
    assert.equal((await upd({ activity_start_date: "2099-01-01" })).error, null, "date future permise");
    await upd({ activity_start_date: null });
    assert.equal((await upd({ alert_thresholds: [] })).error, null, "aucun seuil permis");
  });

  // Pour chacun des 12 champs : valeur valide, une autre valeur valide, et ce que la base doit refuser.
  const FIELDS: Record<string, [unknown, unknown]> = {
    legal_status: ["company", "sole_proprietorship"], tax_regime: ["micro_bnc", "controlled_declaration"], activity_category: ["bic", "bnc"],
    service_nature: ["services", "goods"], activity_start_date: ["2027-01-01", "2027-02-01"], urssaf_frequency: ["monthly", "quarterly"],
    vat_regime: ["franchise", "normal"], acre: ["eligible", "not_eligible"], job_seeker: ["registered", "not_registered"],
    financial_goals: ["a", "b"], reserve_rates: ["a", "b"], notification_prefs: ["a", "b"],
  };

  test("les 12 champs : changer la valeur repasse en « Déclaré », réenregistrer la même valeur garde « Confirmé », une date sans valeur est refusée", async () => {
    const upd = (patch: Record<string, unknown>) => a.client.from("professional_profile").update(patch).eq("owner_id", a.userId).select("*").single();
    for (const [field, [v1, v2]] of Object.entries(FIELDS)) {
      const at = `${field}_confirmed_at`;
      const set = await upd({ [field]: v1 });
      assert.ifError(set.error);
      assert.equal(set.data![at], null, `${field} : valeur posée = Déclaré`);
      const conf = await upd({ [at]: new Date().toISOString() });
      assert.ok(conf.data![at], `${field} : confirmé`);
      const same = await upd({ [field]: v1 });
      assert.ok(same.data![at], `${field} : même valeur réenregistrée, la confirmation survit`);
      const change = await upd({ [field]: v2 });
      assert.equal(change.data![at], null, `${field} : valeur changée = Déclaré`);
      const orphan = await a.client.from("professional_profile").update({ [field]: null, [at]: new Date().toISOString() }).eq("owner_id", a.userId);
      assert.equal(orphan.error?.code, "23514", `${field} : une date de confirmation sans valeur est refusée`);
      const clear = await upd({ [field]: null });
      assert.equal(clear.data![at], null);
    }
    await cleanup();
  });

  test("les 6 champs « Autre » : texte sans « Autre », « Autre » sans texte, texte vide ou trop long refusés ; changer le seul texte repasse en « Déclaré »", async () => {
    const upd = (patch: Record<string, unknown>) => a.client.from("professional_profile").update(patch).eq("owner_id", a.userId).select("*").single();
    for (const field of ["legal_status", "tax_regime", "service_nature", "urssaf_frequency", "vat_regime", "job_seeker"]) {
      const other = `${field}_other`;
      const at = `${field}_confirmed_at`;
      assert.equal((await upd({ [field]: null, [other]: "x" })).error?.code, "23514", `${field} : texte sans valeur`);
      assert.equal((await upd({ [other]: "x" })).error?.code, "23514", `${field} : texte sans « Autre »`);
      assert.equal((await upd({ [field]: "other" })).error?.code, "23514", `${field} : « Autre » sans texte`);
      assert.equal((await upd({ [field]: "other", [other]: "  " })).error?.code, "23514", `${field} : texte vide`);
      assert.equal((await upd({ [field]: "other", [other]: "x".repeat(201) })).error?.code, "23514", `${field} : 201 caractères`);
      assert.ifError((await upd({ [field]: "other", [other]: "x".repeat(200) })).error);
      await upd({ [at]: new Date().toISOString() });
      const textOnly = await upd({ [other]: "autre texte" });
      assert.equal(textOnly.data![at], null, `${field} : seul le texte « Autre » change = Déclaré`);
    }
    await cleanup();
  });

  test("textes libres : 2 000 caractères au plus ; created_at conservé et updated_at avancé ; la fonction du déclencheur n'est pas appelable", async () => {
    const upd = (patch: Record<string, unknown>) => a.client.from("professional_profile").update(patch).eq("owner_id", a.userId).select("*").single();
    for (const field of ["financial_goals", "reserve_rates", "notification_prefs"]) {
      assert.equal((await upd({ [field]: "x".repeat(2001) })).error?.code, "23514", field);
      assert.equal((await upd({ [field]: "   " })).error?.code, "23514", `${field} : vide`);
    }
    const before = (await a.client.from("professional_profile").select("created_at, updated_at").single()).data!;
    const after = await upd({ created_at: "2000-01-01T00:00:00Z", financial_goals: "essai" });
    assert.equal(new Date(after.data!.created_at).getTime(), new Date(before.created_at).getTime(), "created_at réécrit sans effet");
    assert.ok(new Date(after.data!.updated_at).getTime() > new Date(before.updated_at).getTime(), "updated_at avancé");
    const rpc = await a.client.rpc("professional_profile_guard");
    assert.ok(rpc.error, "la fonction du déclencheur n'est pas appelable par l'API");
    await cleanup();
  });
});

describe("isolation des règles réglementaires entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  const KEY = `${PREFIX.replace(/[^a-z-]/g, "")}rule`.replaceAll("-", "_"); // clé fictive : la base ne connaît pas le catalogue
  const SRC = "https://example.org/isolation";

  // Seules des règles « à vérifier » ou « essai » sont créées ici : elles se suppriment. Le cycle des règles vérifiées est dans tests/sql/rules-lifecycle.sql.
  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // Clés exactes (pas de `like` : « _ » est un joker).
      const { error } = await account.client.from("regulatory_rules").delete().in("rule_key", [KEY, `${KEY}_autre`, `${KEY}_x`, `${KEY}_demo`, `${KEY}_link`, `${KEY}_chain`]);
      if (error) console.warn(`Nettoyage incomplet : ${error.message}`);
    }
  };
  const create = (account: Account, over: Record<string, unknown> = {}) =>
    account.client.rpc("create_rule_version", {
      p_rule_key: KEY, p_activity_category: "bnc", p_effective_from: "2026-01-01", p_params: { v: 1 }, p_source: SRC, p_verified_on: "2026-10-01", p_revalidate_after: "2027-10-01", ...over,
    });

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
  });
  after(cleanup);

  test("créer une règle : propriétaire posé par la base, « à vérifier », en vigueur ; B ne voit rien", async () => {
    const r = await create(a);
    assert.ifError(r.error);
    const mine = await a.client.from("regulatory_rules").select("*").eq("rule_key", KEY);
    assert.equal(mine.data!.length, 1);
    assert.equal(mine.data![0].owner_id, a.userId);
    assert.equal(mine.data![0].status, "a_verifier");
    assert.equal(mine.data![0].effective_to, null);
    const theirs = await b.client.from("regulatory_rules").select("id").eq("rule_key", KEY);
    assert.deepEqual(theirs.data, []);
  });

  test("nouvelle version : la précédente est close à la date d'effet et chaînée ; une date qui chevauche est refusée (23P01)", async () => {
    const v2 = await create(a, { p_effective_from: "2026-07-01", p_params: { v: 2 } });
    assert.ifError(v2.error);
    const rows = await a.client.from("regulatory_rules").select("id, effective_from, effective_to, previous_version_id").eq("rule_key", KEY).order("effective_from");
    assert.equal(rows.data!.length, 2);
    assert.equal(rows.data![0].effective_to, "2026-07-01");
    assert.equal(rows.data![1].effective_to, null);
    assert.equal(rows.data![1].previous_version_id, rows.data![0].id);
    for (const from of ["2026-07-01", "2025-06-01", "2026-03-01"]) {
      const bad = await create(a, { p_effective_from: from });
      assert.equal(bad.error?.code, "23P01", `date d'effet ${from}`);
    }
    const after = await a.client.from("regulatory_rules").select("id").eq("rule_key", KEY);
    assert.equal(after.data!.length, 2, "les tentatives refusées ne laissent aucune trace");
  });

  test("B ne modifie ni ne supprime la règle de A, ne crée rien à son nom, et sa propre règle n'entre pas en conflit avec celle de A", async () => {
    const id = (await a.client.from("regulatory_rules").select("id").eq("rule_key", KEY).is("effective_to", null).single()).data!.id;
    const upd = await b.client.from("regulatory_rules").update({ description: "piraté" }).eq("id", id).select("id");
    assert.deepEqual(upd.data, []);
    const del = await b.client.from("regulatory_rules").delete().eq("id", id).select("id");
    assert.deepEqual(del.data, []);
    const forged = await b.client.from("regulatory_rules").insert({ owner_id: a.userId, rule_key: KEY, activity_category: "bic", params: {}, effective_from: "2026-01-01", source: SRC, verified_on: "2026-10-01", revalidate_after: "2027-10-01" });
    assert.equal(forged.error?.code, "42501");
    // B crée APRÈS la version de A (2026-07-01) : sans filtre sur le propriétaire, la fonction fermerait la version de A.
    const own = await create(b, { p_effective_from: "2027-01-01" });
    assert.ifError(own.error);
    const aStill = await a.client.from("regulatory_rules").select("effective_to").eq("id", id).single();
    assert.equal(aStill.data!.effective_to, null, "la création de B n'a pas fermé la version de A");
    const bRule = await b.client.from("regulatory_rules").select("previous_version_id").eq("rule_key", KEY).single();
    assert.equal(bRule.data!.previous_version_id, null, "la version de B n'est chaînée à rien");
  });

  test("chaînage forgé refusé par la RLS (fonction SECURITY DEFINER) : vers la version de A, vers une autre clé à soi", async () => {
    const aRule = (await a.client.from("regulatory_rules").select("id").eq("rule_key", KEY).is("effective_to", null).single()).data!.id;
    const row = { activity_category: "bnc", params: {}, effective_from: "2030-01-01", source: SRC, verified_on: "2026-10-01", revalidate_after: "2027-10-01" };
    const toA = await b.client.from("regulatory_rules").insert({ ...row, rule_key: KEY, previous_version_id: aRule });
    assert.equal(toA.error?.code, "42501", "B ne chaîne pas à la version de A");
    const otherKey = await a.client.from("regulatory_rules").insert({ ...row, rule_key: `${KEY}_autre`, previous_version_id: aRule });
    assert.equal(otherKey.error?.code, "42501", "A ne chaîne pas à une autre clé");
    const ok = await a.client.from("regulatory_rules").insert({ ...row, rule_key: KEY, previous_version_id: aRule });
    assert.equal(ok.error?.code, "23P01", "même clé, à soi : la RLS passe, c'est le chevauchement qui refuse");
  });

  test("la base refuse, pour le bon motif : « vérifiée » sans lien, DEMO sans essai, essai sans DEMO, source vide, fin à la main, dates incohérentes", async () => {
    const code = async (over: Record<string, unknown>) =>
      (await a.client.from("regulatory_rules").insert({ rule_key: `${KEY}_x`, activity_category: "bnc", params: {}, effective_from: "2026-01-01", source: SRC, verified_on: "2026-10-01", revalidate_after: "2027-10-01", ...over })).error?.code;
    assert.equal(await code({ status: "verifiee" }), "42501", "jamais « vérifiée » d'emblée");
    assert.equal(await code({ effective_to: "2026-02-01" }), "42501", "jamais déjà close à l'insertion");
    assert.equal(await code({ source: "DEMO" }), "23514");
    assert.equal(await code({ status: "essai" }), "23514");
    assert.equal(await code({ source: "" }), "23514");
    assert.equal(await code({ revalidate_after: "2026-09-30" }), "23514");
    assert.equal(await code({ params: [1] }), "23514");
    assert.equal(await code({ activity_category: "xyz" }), "23514");
    assert.equal(await code({ verified_on: null }), "23502");
    // « Vérifiée » exige un lien https (contrainte), contrôlé par une mise à jour puisque l'insertion est refusée.
    assert.ifError((await create(a, { p_rule_key: `${KEY}_link`, p_source: "texte libre" })).error);
    const noLinkVerify = await a.client.from("regulatory_rules").update({ status: "verifiee" }).eq("rule_key", `${KEY}_link`);
    assert.equal(noLinkVerify.error?.code, "23514", "« vérifiée » sans lien refusée");
    const httpVerify = await a.client.from("regulatory_rules").update({ status: "verifiee", source: "http://example.org" }).eq("rule_key", `${KEY}_link`);
    assert.equal(httpVerify.error?.code, "23514", "http n'est pas un lien officiel");
    const byFunction = await create(a, { p_rule_key: `${KEY}_link`, p_effective_from: "2030-01-01", p_status: "verifiee" });
    assert.equal(byFunction.error?.code, "42501", "create_rule_version refuse le statut « vérifiée »");
    const open = (await a.client.from("regulatory_rules").select("id").eq("rule_key", KEY).is("effective_to", null).single()).data!.id;
    const hand = await a.client.from("regulatory_rules").update({ effective_to: "2027-01-01" }).eq("id", open);
    assert.equal(hand.error?.code, "23514", "la date de fin ne se pose pas à la main");
    const key = await a.client.from("regulatory_rules").update({ rule_key: "autre" }).eq("id", open);
    assert.equal(key.error?.code, "23514", "la clé est figée");
    const verify = await a.client.from("regulatory_rules").update({ status: "verifiee" }).eq("id", open);
    assert.ifError(verify.error); // la source est un lien https : « vérifiée » passe…
    const noLink = await a.client.from("regulatory_rules").update({ source: "texte" }).eq("id", open);
    assert.equal(noLink.error?.code, "23514", "… mais la source d'une règle vérifiée ne change plus");
    const back = await a.client.from("regulatory_rules").update({ status: "a_verifier" }).eq("id", open).select("status").single();
    assert.equal(back.data!.status, "a_verifier", "repassée à vérifier pour pouvoir être nettoyée");
  });

  test("règle d'essai : source DEMO acceptée par la fonction ; sans connexion : rien de visible, fonction refusée", async () => {
    const demo = await create(a, { p_rule_key: `${KEY}_demo`, p_source: "DEMO", p_status: "essai" });
    assert.ifError(demo.error);
    const anon = newClient();
    const read = await anon.from("regulatory_rules").select("id");
    assert.deepEqual(read.data ?? [], []);
    const call = await anon.rpc("create_rule_version", { p_rule_key: KEY, p_activity_category: "bnc", p_effective_from: "2031-01-01", p_params: {}, p_source: SRC, p_verified_on: "2026-10-01", p_revalidate_after: "2027-10-01" });
    assert.ok(call.error);
    const guard = await a.client.rpc("regulatory_rules_guard");
    assert.ok(guard.error, "la fonction du déclencheur n'est pas appelable");
  });

  test("supprimer une version « à vérifier » qui a une successeure : acceptée, la successeure survit sans chaînage ; chaînage réécrit à la main refusé", async () => {
    const k = `${KEY}_chain`;
    assert.ifError((await create(a, { p_rule_key: k, p_effective_from: "2026-01-01" })).error);
    assert.ifError((await create(a, { p_rule_key: k, p_effective_from: "2026-06-01" })).error);
    const rows = (await a.client.from("regulatory_rules").select("id, effective_from, previous_version_id").eq("rule_key", k).order("effective_from")).data!;
    assert.equal(rows[1].previous_version_id, rows[0].id);
    const rewrite = await a.client.from("regulatory_rules").update({ previous_version_id: null }).eq("id", rows[1].id);
    assert.equal(rewrite.error?.code, "23514", "le chaînage ne se réécrit pas à la main");
    const del = await a.client.from("regulatory_rules").delete().eq("id", rows[0].id).select("id");
    assert.ifError(del.error);
    assert.equal(del.data!.length, 1);
    const left = (await a.client.from("regulatory_rules").select("id, previous_version_id, effective_to").eq("rule_key", k)).data!;
    assert.equal(left.length, 1);
    assert.equal(left[0].previous_version_id, null);
    assert.equal(left[0].effective_to, null);
  });
});

describe("isolation des factures entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let missionA: { id: string };
  let missionB: { id: string };
  let quoteA: { id: string };
  let quoteB: { id: string };
  let invoiceA: { id: string };

  const base = () => ({ mission_id: missionA.id, amount_ht_cents: 10000, due_on: "2026-11-30" });
  const parisToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // Les factures d'abord (pas de cascade vers la mission ni le devis), puis les devis (brouillons), les missions, les fiches.
      const mine = await account.client.from("missions").select("id").like("title", `${PREFIX}%`);
      const ids = (mine.data ?? []).map((m) => m.id);
      if (ids.length) await account.client.from("invoices").delete().in("mission_id", ids);
      const cl = await account.client.from("clients").select("id").like("name", `${PREFIX}%`);
      const cids = (cl.data ?? []).map((c) => c.id);
      if (cids.length) await account.client.from("quotes").delete().in("client_id", cids);
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const mk = async (account: Account, who: string) => {
      const f = await account.client.from("clients").insert({ name: `${PREFIX} fiche facture ${who}`, origin: "demo" }).select("id").single();
      assert.ifError(f.error);
      const m = await account.client.from("missions").insert({ client_id: f.data!.id, title: `${PREFIX} mission facture ${who}` }).select("id").single();
      assert.ifError(m.error);
      const q = await account.client.from("quotes").insert({ client_id: f.data!.id, amount_ht_cents: 5000 }).select("id").single();
      assert.ifError(q.error);
      return { client: f.data!, mission: m.data!, quote: q.data! };
    };
    const ra = await mk(a, "A");
    const rb = await mk(b, "B");
    missionA = ra.mission;
    missionB = rb.mission;
    quoteA = ra.quote;
    quoteB = rb.quote;
    const i = await a.client.from("invoices").insert({ ...base(), quote_id: quoteA.id }).select("id").single();
    assert.ifError(i.error);
    invoiceA = i.data!;
  });

  after(cleanup);

  test("propriétaire posé par la base, taxe inconnue = null (jamais 0) ; B ne voit rien de A", async () => {
    const own = await a.client.from("invoices").select("owner_id, tax_cents, issued_on, reference, note").eq("id", invoiceA.id).single();
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.tax_cents, null);
    assert.deepEqual([own.data!.issued_on, own.data!.reference, own.data!.note], [null, null, null]);
    const seen = await b.client.from("invoices").select("id").eq("id", invoiceA.id);
    assert.deepEqual(seen.data, []);
    const zero = await a.client.from("invoices").insert({ ...base(), tax_cents: 0 }).select("id, tax_cents").single();
    assert.equal(zero.data!.tax_cents, 0, "0 saisi reste 0");
  });

  test("B ne modifie ni ne supprime la facture de A", async () => {
    const upd = await b.client.from("invoices").update({ amount_ht_cents: 1 }).eq("id", invoiceA.id).select("id");
    assert.deepEqual(upd.data, []);
    const del = await b.client.from("invoices").delete().eq("id", invoiceA.id).select("id");
    assert.deepEqual(del.data, []);
    const still = await a.client.from("invoices").select("amount_ht_cents").eq("id", invoiceA.id).single();
    assert.equal(still.data!.amount_ht_cents, 10000);
  });

  test("B ne rattache pas de facture à la mission ou au devis de A ; A ne forge pas le propriétaire ni ne déplace sa facture chez B", async () => {
    const onMission = await b.client.from("invoices").insert({ ...base(), mission_id: missionA.id });
    assert.equal(onMission.error?.code, "42501");
    const withQuote = await b.client.from("invoices").insert({ ...base(), mission_id: missionB.id, quote_id: quoteA.id });
    assert.equal(withQuote.error?.code, "42501");
    // Mission ou devis supprimé entre l'ouverture du formulaire et l'envoi : même refus, pas une erreur d'un autre genre.
    const noMission = await a.client.from("invoices").insert({ ...base(), mission_id: crypto.randomUUID() });
    assert.equal(noMission.error?.code, "42501", "mission inexistante");
    const noQuote = await a.client.from("invoices").insert({ ...base(), quote_id: crypto.randomUUID() });
    assert.equal(noQuote.error?.code, "42501", "devis inexistant");
    const forged = await a.client.from("invoices").insert({ ...base(), owner_id: b.userId });
    assert.equal(forged.error?.code, "42501");
    const moved = await a.client.from("invoices").update({ mission_id: missionB.id }).eq("id", invoiceA.id);
    assert.equal(moved.error?.code, "42501");
    const relinked = await a.client.from("invoices").update({ quote_id: quoteB.id }).eq("id", invoiceA.id);
    assert.equal(relinked.error?.code, "42501");
    const stolen = await a.client.from("invoices").update({ owner_id: b.userId }).eq("id", invoiceA.id);
    assert.equal(stolen.error?.code, "23514", "le propriétaire ne change pas : le déclencheur refuse avant la RLS");
  });

  test("sans connexion : rien de visible ni de créable", async () => {
    const anon = newClient();
    const read = await anon.from("invoices").select("id");
    assert.ifError(read.error);
    assert.deepEqual(read.data, []);
    const write = await anon.from("invoices").insert(base());
    assert.equal(write.error?.code, "42501");
  });

  test("la base refuse montants hors bornes, dates incohérentes, textes trop longs ou vides, champs obligatoires absents", async () => {
    const refused = async (patch: Record<string, unknown>, code: string, label: string) => {
      const r = await a.client.from("invoices").insert({ ...base(), ...patch });
      assert.equal(r.error?.code, code, label);
    };
    await refused({ amount_ht_cents: 0 }, "23514", "hors taxe nul");
    await refused({ amount_ht_cents: -1 }, "23514", "hors taxe négatif");
    await refused({ amount_ht_cents: 100_000_001 }, "23514", "hors taxe au-delà de 1 000 000 €");
    await refused({ tax_cents: -1 }, "23514", "taxe négative");
    await refused({ tax_cents: 100_000_001 }, "23514", "taxe au-delà du garde-fou");
    await refused({ issued_on: "2026-10-20", due_on: "2026-10-19" }, "23514", "échéance avant l'émission");
    await refused({ reference: "" }, "23514", "référence vide");
    await refused({ reference: "a".repeat(61) }, "23514", "référence de 61 caractères");
    await refused({ note: "" }, "23514", "remarque vide");
    await refused({ note: "n".repeat(501) }, "23514", "remarque de 501 caractères");
    await refused({ due_on: null }, "23502", "échéance obligatoire");
    await refused({ mission_id: null }, "42501", "mission obligatoire (la RLS, qui exige une mission à moi, refuse avant la contrainte non nulle)");
    const edge = await a.client.from("invoices").insert({ ...base(), amount_ht_cents: 100_000_000, tax_cents: 100_000_000, reference: "a".repeat(60), note: "n".repeat(500), issued_on: parisToday }).select("id").single();
    assert.ifError(edge.error);
  });

  test("garde : émission jamais dans le futur (insertion et mise à jour), émission d'aujourd'hui permise, identité figée", async () => {
    const future = await a.client.from("invoices").insert({ ...base(), issued_on: "2999-01-01", due_on: "2999-02-01" });
    assert.equal(future.error?.code, "23514");
    // Demain à Paris est déjà le futur (calculé en UTC pur sur la date de Paris, sans second fuseau local).
    const tomorrow = new Date(Date.parse(`${parisToday}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const next = await a.client.from("invoices").insert({ ...base(), issued_on: tomorrow, due_on: "2999-02-01" });
    assert.equal(next.error?.code, "23514", "demain refusé");
    const today = await a.client.from("invoices").insert({ ...base(), issued_on: parisToday, due_on: parisToday }).select("id").single();
    assert.ifError(today.error);
    const later = await a.client.from("invoices").update({ issued_on: "2999-01-01", due_on: "2999-02-01" }).eq("id", invoiceA.id);
    assert.equal(later.error?.code, "23514");
    const id = await a.client.from("invoices").update({ id: crypto.randomUUID() }).eq("id", invoiceA.id);
    assert.equal(id.error?.code, "23514");
    const created = await a.client.from("invoices").update({ created_at: "2020-01-01T00:00:00Z" }).eq("id", invoiceA.id);
    assert.equal(created.error?.code, "23514");
  });

  test("une facture reste modifiable (montants, échéance, mission, devis) et se supprime ; mission et devis liés ne se suppriment pas tant qu'elle existe", async () => {
    const upd = await a.client.from("invoices").update({ amount_ht_cents: 20000, tax_cents: 4000, due_on: "2026-12-15", reference: "F-1" }).eq("id", invoiceA.id).select("amount_ht_cents, tax_cents");
    assert.ifError(upd.error);
    assert.deepEqual(upd.data, [{ amount_ht_cents: 20000, tax_cents: 4000 }]);
    const mission = await a.client.from("missions").delete().eq("id", missionA.id).select("id");
    assert.equal(mission.error?.code, "23503", "mission liée à une facture");
    const quote = await a.client.from("quotes").delete().eq("id", quoteA.id).select("id");
    assert.equal(quote.error?.code, "23503", "devis lié à une facture");
    const del = await a.client.from("invoices").delete().eq("id", invoiceA.id).select("id");
    assert.equal(del.data?.length, 1, "la facture se supprime");
    const quoteAfter = await a.client.from("quotes").delete().eq("id", quoteA.id).select("id");
    assert.equal(quoteAfter.data?.length, 1, "le devis (brouillon) se supprime une fois la facture partie");
  });
});

describe("isolation des encaissements entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let invoiceA: { id: string };
  let invoiceB: { id: string };
  let paymentA: { id: string };

  const parisToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const base = () => ({ invoice_id: invoiceA.id, amount_ht_cents: 10000, received_on: parisToday });

  const cleanup = async () => {
    for (const account of [a, b]) {
      if (!account) continue;
      // Les encaissements d'abord (pas de cascade vers la facture), puis les factures, les devis, les missions, les fiches.
      const ms = await account.client.from("missions").select("id").like("title", `${PREFIX}%`);
      const mids = (ms.data ?? []).map((m) => m.id);
      if (mids.length) {
        const inv = await account.client.from("invoices").select("id").in("mission_id", mids);
        const iids = (inv.data ?? []).map((i) => i.id);
        if (iids.length) {
          await account.client.from("payments").delete().in("invoice_id", iids);
          await account.client.from("invoices").delete().in("id", iids);
        }
      }
      const cl = await account.client.from("clients").select("id").like("name", `${PREFIX}%`);
      const cids = (cl.data ?? []).map((c) => c.id);
      if (cids.length) await account.client.from("quotes").delete().in("client_id", cids);
      await account.client.from("missions").delete().like("title", `${PREFIX}%`);
      await account.client.from("clients").delete().like("name", `${PREFIX}%`);
    }
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const mk = async (account: Account, who: string) => {
      const f = await account.client.from("clients").insert({ name: `${PREFIX} fiche encaissement ${who}`, origin: "demo" }).select("id").single();
      assert.ifError(f.error);
      const m = await account.client.from("missions").insert({ client_id: f.data!.id, title: `${PREFIX} mission encaissement ${who}` }).select("id").single();
      assert.ifError(m.error);
      const i = await account.client.from("invoices").insert({ mission_id: m.data!.id, amount_ht_cents: 100000, tax_cents: 20000, due_on: "2026-11-30" }).select("id").single();
      assert.ifError(i.error);
      return i.data!;
    };
    invoiceA = await mk(a, "A");
    invoiceB = await mk(b, "B");
    const p = await a.client.from("payments").insert(base()).select("id").single();
    assert.ifError(p.error);
    paymentA = p.data!;
  });

  after(cleanup);

  test("propriétaire posé par la base, taxe inconnue = null (jamais 0) ; B ne voit rien de A", async () => {
    const own = await a.client.from("payments").select("owner_id, tax_cents, note").eq("id", paymentA.id).single();
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.tax_cents, null);
    assert.equal(own.data!.note, null);
    const seen = await b.client.from("payments").select("id").eq("id", paymentA.id);
    assert.deepEqual(seen.data, []);
    const zero = await a.client.from("payments").insert({ ...base(), tax_cents: 0 }).select("tax_cents").single();
    assert.equal(zero.data!.tax_cents, 0, "0 saisi reste 0");
  });

  test("B ne modifie ni ne supprime l'encaissement de A", async () => {
    const upd = await b.client.from("payments").update({ amount_ht_cents: 1 }).eq("id", paymentA.id).select("id");
    assert.deepEqual(upd.data, []);
    const del = await b.client.from("payments").delete().eq("id", paymentA.id).select("id");
    assert.deepEqual(del.data, []);
    const still = await a.client.from("payments").select("amount_ht_cents").eq("id", paymentA.id).single();
    assert.equal(still.data!.amount_ht_cents, 10000);
  });

  test("B ne rattache pas d'encaissement à la facture de A, ni à une facture inexistante ; A ne forge pas le propriétaire ni ne déplace son encaissement", async () => {
    const onInvoice = await b.client.from("payments").insert(base());
    assert.equal(onInvoice.error?.code, "42501");
    const gone = await a.client.from("payments").insert({ ...base(), invoice_id: crypto.randomUUID() });
    assert.equal(gone.error?.code, "42501", "facture inexistante");
    const forged = await a.client.from("payments").insert({ ...base(), owner_id: b.userId });
    assert.equal(forged.error?.code, "42501");
    const moved = await a.client.from("payments").update({ invoice_id: invoiceB.id }).eq("id", paymentA.id);
    assert.equal(moved.error?.code, "23514", "la facture est figée : le déclencheur refuse avant la RLS");
    const stolen = await a.client.from("payments").update({ owner_id: b.userId }).eq("id", paymentA.id);
    assert.equal(stolen.error?.code, "23514", "le propriétaire ne change pas");
    const nullInvoice = await a.client.from("payments").insert({ ...base(), invoice_id: null });
    assert.equal(nullInvoice.error?.code, "42501", "facture obligatoire (la RLS exige une facture à moi, avant la contrainte non nulle)");
  });

  test("sans connexion : rien de visible ni de créable", async () => {
    const anon = newClient();
    const read = await anon.from("payments").select("id");
    assert.ifError(read.error);
    assert.deepEqual(read.data, []);
    const write = await anon.from("payments").insert(base());
    assert.equal(write.error?.code, "42501");
  });

  test("la base refuse montants hors bornes, remarques vides ou trop longues, date absente", async () => {
    const refused = async (patch: Record<string, unknown>, code: string, label: string) => {
      const r = await a.client.from("payments").insert({ ...base(), ...patch });
      assert.equal(r.error?.code, code, label);
    };
    await refused({ amount_ht_cents: 0 }, "23514", "hors taxe nul");
    await refused({ amount_ht_cents: -1 }, "23514", "hors taxe négatif");
    await refused({ amount_ht_cents: 100_000_001 }, "23514", "hors taxe au-delà de 1 000 000 €");
    await refused({ tax_cents: -1 }, "23514", "taxe négative");
    await refused({ tax_cents: 100_000_001 }, "23514", "taxe au-delà du garde-fou");
    await refused({ note: "" }, "23514", "remarque vide");
    await refused({ note: "n".repeat(501) }, "23514", "remarque de 501 caractères");
    await refused({ received_on: null }, "23502", "date obligatoire");
    const edge = await a.client.from("payments").insert({ ...base(), amount_ht_cents: 100_000_000, tax_cents: 100_000_000, note: "n".repeat(500) }).select("id").single();
    assert.ifError(edge.error);
  });

  test("garde : date jamais dans le futur (insertion et mise à jour), aujourd'hui permis, identité figée", async () => {
    const future = await a.client.from("payments").insert({ ...base(), received_on: "2999-01-01" });
    assert.equal(future.error?.code, "23514");
    const tomorrow = new Date(Date.parse(`${parisToday}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const next = await a.client.from("payments").insert({ ...base(), received_on: tomorrow });
    assert.equal(next.error?.code, "23514", "demain refusé");
    const later = await a.client.from("payments").update({ received_on: "2999-01-01" }).eq("id", paymentA.id);
    assert.equal(later.error?.code, "23514");
    const laterTomorrow = await a.client.from("payments").update({ received_on: tomorrow }).eq("id", paymentA.id);
    assert.equal(laterTomorrow.error?.code, "23514", "demain refusé aussi à la mise à jour");
    // Une mise à jour qui ne touche pas la date reste permise : une ligne ancienne s'édite toujours.
    const sameDay = await a.client.from("payments").update({ note: "sans changer la date" }).eq("id", paymentA.id).select("note");
    assert.ifError(sameDay.error);
    assert.deepEqual(sameDay.data, [{ note: "sans changer la date" }]);
    // Les contraintes valent aussi à la mise à jour, pas seulement à l'insertion.
    const refusedUpdate = async (patch: Record<string, unknown>, code: string, label: string) => {
      const r = await a.client.from("payments").update(patch).eq("id", paymentA.id);
      assert.equal(r.error?.code, code, label);
    };
    await refusedUpdate({ amount_ht_cents: 0 }, "23514", "hors taxe nul à la mise à jour");
    await refusedUpdate({ tax_cents: -1 }, "23514", "taxe négative à la mise à jour");
    await refusedUpdate({ note: "" }, "23514", "remarque vide à la mise à jour");
    await refusedUpdate({ received_on: null }, "23502", "date absente à la mise à jour");
    const id = await a.client.from("payments").update({ id: crypto.randomUUID() }).eq("id", paymentA.id);
    assert.equal(id.error?.code, "23514");
    const created = await a.client.from("payments").update({ created_at: "2020-01-01T00:00:00Z" }).eq("id", paymentA.id);
    assert.equal(created.error?.code, "23514");
  });

  test("plusieurs encaissements par facture ; modifiable et supprimable ; la facture ne se supprime pas tant qu'elle en a", async () => {
    const second = await a.client.from("payments").insert({ ...base(), amount_ht_cents: 5000, tax_cents: 1000, note: "acompte" }).select("id").single();
    assert.ifError(second.error);
    const count = await a.client.from("payments").select("id", { count: "exact", head: true }).eq("invoice_id", invoiceA.id);
    // paymentA, « 0 saisi », les bornes, puis cet acompte : quatre sur la même facture.
    assert.equal(count.count, 4, "plusieurs encaissements sur la même facture");
    const upd = await a.client.from("payments").update({ amount_ht_cents: 7000, tax_cents: null, note: "corrigé" }).eq("id", second.data!.id).select("amount_ht_cents, tax_cents");
    assert.ifError(upd.error);
    assert.deepEqual(upd.data, [{ amount_ht_cents: 7000, tax_cents: null }]);
    const blocked = await a.client.from("invoices").delete().eq("id", invoiceA.id).select("id");
    assert.equal(blocked.error?.code, "23503", "facture avec encaissements");
    const ids = (await a.client.from("payments").select("id").eq("invoice_id", invoiceA.id)).data!.map((p) => p.id);
    const del = await a.client.from("payments").delete().in("id", ids).select("id");
    assert.equal(del.data?.length, ids.length, "les encaissements se suppriment");
    const free = await a.client.from("invoices").delete().eq("id", invoiceA.id).select("id");
    assert.equal(free.data?.length, 1, "la facture se supprime une fois ses encaissements partis");
  });
});

describe("isolation des échéances entre deux comptes fictifs", () => {
  let a: Account;
  let b: Account;
  let deadlineA: { id: string };

  const base = () => ({ title: `${PREFIX} échéance`, due_on: "2026-11-30", category: "urssaf", source: "https://www.urssaf.fr/exemple" });
  const cleanup = async () => {
    for (const account of [a, b]) if (account) await account.client.from("deadlines").delete().like("title", `${PREFIX}%`);
  };

  before(async () => {
    a = await signIn("A");
    b = await signIn("B");
    await cleanup();
    const d = await a.client.from("deadlines").insert(base()).select("id").single();
    assert.ifError(d.error);
    deadlineA = d.data!;
  });

  after(cleanup);

  test("propriétaire posé par la base, à faire par défaut ; B ne voit rien de A", async () => {
    const own = await a.client.from("deadlines").select("owner_id, done_at, note").eq("id", deadlineA.id).single();
    assert.equal(own.data!.owner_id, a.userId);
    assert.equal(own.data!.done_at, null);
    assert.equal(own.data!.note, null);
    const seen = await b.client.from("deadlines").select("id").eq("id", deadlineA.id);
    assert.deepEqual(seen.data, []);
  });

  test("B ne modifie ni ne supprime l'échéance de A, ni ne la marque faite", async () => {
    const upd = await b.client.from("deadlines").update({ title: `${PREFIX} piraté` }).eq("id", deadlineA.id).select("id");
    assert.deepEqual(upd.data, []);
    const done = await b.client.from("deadlines").update({ done_at: new Date().toISOString() }).eq("id", deadlineA.id).select("id");
    assert.deepEqual(done.data, []);
    const del = await b.client.from("deadlines").delete().eq("id", deadlineA.id).select("id");
    assert.deepEqual(del.data, []);
    const still = await a.client.from("deadlines").select("title, done_at").eq("id", deadlineA.id).single();
    assert.deepEqual(still.data, { title: `${PREFIX} échéance`, done_at: null });
  });

  test("A ne forge pas le propriétaire ni ne donne son échéance à B ; sans connexion : rien de visible ni de créable", async () => {
    const forged = await a.client.from("deadlines").insert({ ...base(), owner_id: b.userId });
    assert.equal(forged.error?.code, "42501");
    const stolen = await a.client.from("deadlines").update({ owner_id: b.userId }).eq("id", deadlineA.id);
    assert.equal(stolen.error?.code, "23514", "le propriétaire ne change pas : le déclencheur refuse avant la RLS");
    const anon = newClient();
    const read = await anon.from("deadlines").select("id");
    assert.ifError(read.error);
    assert.deepEqual(read.data, []);
    const write = await anon.from("deadlines").insert(base());
    assert.equal(write.error?.code, "42501");
  });

  test("la base refuse titre vide ou trop long, source qui n'est pas un lien https://, remarque vide ou trop longue, date ou catégorie absente ou inconnue", async () => {
    const refused = async (patch: Record<string, unknown>, code: string, label: string) => {
      const r = await a.client.from("deadlines").insert({ ...base(), ...patch });
      assert.equal(r.error?.code, code, label);
    };
    await refused({ title: "" }, "23514", "titre vide");
    await refused({ title: "t".repeat(201) }, "23514", "titre de 201 caractères");
    for (const source of ["", "http://www.urssaf.fr", "urssaf.fr", "Courrier de l'Urssaf", "https://urssaf.fr/a b", "https://", "javascript:alert(1)", `https://x.fr/${"a".repeat(1988)}`, "HTTPS://X.FR", "https:// x", "https://x.fr/a\nb", "https://x.fr\t", "Courrier https://x.fr", "voir https://x.fr/a"]) {
      await refused({ source }, "23514", `source refusée : ${source.slice(0, 30)}`);
    }
    await refused({ note: "" }, "23514", "remarque vide");
    await refused({ note: "n".repeat(501) }, "23514", "remarque de 501 caractères");
    await refused({ due_on: null }, "23502", "date obligatoire");
    await refused({ category: null }, "23502", "catégorie obligatoire");
    await refused({ source: null }, "23502", "source obligatoire");
    await refused({ category: "autre" }, "22P02", "catégorie hors énumération");
    // Les émojis comptent un caractère chacun pour la base (char_length) : 200 acceptés, 201 refusés.
    const emoji200 = await a.client.from("deadlines").insert({ ...base(), title: "😀".repeat(200) }).select("title").single();
    assert.ifError(emoji200.error);
    assert.equal(Array.from(emoji200.data!.title).length, 200);
    await refused({ title: "😀".repeat(201) }, "23514", "201 émojis");
    const edge = await a.client.from("deadlines").insert({ ...base(), title: `${PREFIX} ${"t".repeat(200 - PREFIX.length - 1)}`, source: `https://x.fr/${"a".repeat(1987)}`, note: "n".repeat(500), due_on: "2020-01-01" }).select("id").single();
    assert.ifError(edge.error);
  });

  test("garde : « faite » jamais dans le futur (insertion et mise à jour), identité figée", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const future = await a.client.from("deadlines").insert({ ...base(), done_at: tomorrow });
    assert.equal(future.error?.code, "23514");
    const later = await a.client.from("deadlines").update({ done_at: tomorrow }).eq("id", deadlineA.id);
    assert.equal(later.error?.code, "23514");
    const id = await a.client.from("deadlines").update({ id: crypto.randomUUID() }).eq("id", deadlineA.id);
    assert.equal(id.error?.code, "23514");
    const created = await a.client.from("deadlines").update({ created_at: "2020-01-01T00:00:00Z" }).eq("id", deadlineA.id);
    assert.equal(created.error?.code, "23514");
  });

  test("cycle : marquer faite (instant posé), changer la date sans la rouvrir, rouvrir, supprimer ; une échéance faite se supprime", async () => {
    const now = new Date().toISOString();
    const done = await a.client.from("deadlines").update({ done_at: now }).eq("id", deadlineA.id).is("done_at", null).select("done_at");
    assert.ifError(done.error);
    assert.equal(done.data?.length, 1);
    const again = await a.client.from("deadlines").update({ done_at: new Date(Date.now() + 1000).toISOString() }).eq("id", deadlineA.id).is("done_at", null).select("id");
    assert.deepEqual(again.data, [], "déjà faite : la condition « à faire » n'écrase pas la date de réalisation");
    const moved = await a.client.from("deadlines").update({ due_on: "2027-01-15", title: `${PREFIX} décalée` }).eq("id", deadlineA.id).select("done_at, due_on");
    assert.ifError(moved.error);
    assert.equal(moved.data![0].due_on, "2027-01-15");
    assert.notEqual(moved.data![0].done_at, null, "changer la date ne rouvre pas");
    const reopened = await a.client.from("deadlines").update({ done_at: null }).eq("id", deadlineA.id).not("done_at", "is", null).select("done_at");
    assert.deepEqual(reopened.data, [{ done_at: null }]);
    const del = await a.client.from("deadlines").delete().eq("id", deadlineA.id).select("id");
    assert.equal(del.data?.length, 1, "toujours supprimable");
  });

  test("setDeadlineDone (la vraie requête des actions) : idempotent et réversible ; « gone » pour une ligne disparue ou d'un autre compte", async () => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const row = await a.client.from("deadlines").insert({ ...base(), title: `${PREFIX} faite` }).select("id").single();
    assert.ifError(row.error);
    const id = row.data!.id;
    const read = async () => (await a.client.from("deadlines").select("done_at").eq("id", id).single()).data!.done_at;
    assert.equal(await setDeadlineDone(a.client as never, id, true), "saved");
    const first = await read();
    assert.notEqual(first, null);
    await wait(30);
    assert.equal(await setDeadlineDone(a.client as never, id, true), "saved", "déjà faite : l'état voulu est atteint");
    assert.equal(await read(), first, "la date de réalisation n'est jamais écrasée (double clic, deux onglets)");
    assert.equal(await setDeadlineDone(b.client as never, id, true), "gone", "l'échéance de A est invisible pour B : jamais « saved »");
    assert.equal(await setDeadlineDone(b.client as never, id, false), "gone");
    assert.equal(await read(), first, "B n'a rien changé");
    assert.equal(await setDeadlineDone(a.client as never, id, false), "saved");
    assert.equal(await read(), null);
    assert.equal(await setDeadlineDone(a.client as never, id, false), "saved", "rouvrir deux fois : sans effet, sans erreur");
    assert.equal(await read(), null);
    assert.ifError((await a.client.from("deadlines").delete().eq("id", id)).error);
    assert.equal(await setDeadlineDone(a.client as never, id, true), "gone", "échéance supprimée entre l'ouverture et l'action");
    assert.equal(await setDeadlineDone(a.client as never, id, false), "gone");
  });

  test("garde : tolérance d'une minute pour « faite » (+30 s accepté, +5 min refusé), y compris vers une valeur déjà posée ; une date très ancienne est acceptée", async () => {
    const at = (ms: number) => new Date(Date.now() + ms).toISOString();
    const soon = await a.client.from("deadlines").insert({ ...base(), title: `${PREFIX} tolérance`, done_at: at(30_000) }).select("id").single();
    assert.ifError(soon.error);
    const tooLate = await a.client.from("deadlines").insert({ ...base(), title: `${PREFIX} trop tard`, done_at: at(5 * 60_000) });
    assert.equal(tooLate.error?.code, "23514", "+5 minutes refusé");
    const shift = await a.client.from("deadlines").update({ done_at: at(5 * 60_000) }).eq("id", soon.data!.id);
    assert.equal(shift.error?.code, "23514", "changer une date déjà posée vers le futur lointain");
    const old = await a.client.from("deadlines").update({ done_at: "2020-01-01T00:00:00Z" }).eq("id", soon.data!.id).select("done_at");
    assert.ifError(old.error);
    assert.equal(old.data?.length, 1, "une obligation faite bien avant son enregistrement est plausible : acceptée");
  });

  test("les contraintes valent aussi à la mise à jour, pas seulement à l'insertion", async () => {
    const row = await a.client.from("deadlines").insert({ ...base(), title: `${PREFIX} contraintes` }).select("id").single();
    assert.ifError(row.error);
    const refusedUpdate = async (patch: Record<string, unknown>, code: string, label: string) => {
      const r = await a.client.from("deadlines").update(patch).eq("id", row.data!.id);
      assert.equal(r.error?.code, code, label);
    };
    await refusedUpdate({ title: "" }, "23514", "titre vide");
    await refusedUpdate({ source: "http://urssaf.fr" }, "23514", "source en http");
    await refusedUpdate({ source: "Courrier https://x.fr" }, "23514", "texte avant le lien");
    await refusedUpdate({ note: "" }, "23514", "remarque vide");
    await refusedUpdate({ due_on: null }, "23502", "date absente");
    await refusedUpdate({ category: null }, "23502", "catégorie absente");
    await refusedUpdate({ category: "autre" }, "22P02", "catégorie inconnue");
  });
});
