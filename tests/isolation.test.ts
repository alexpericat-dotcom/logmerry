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
