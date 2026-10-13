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
