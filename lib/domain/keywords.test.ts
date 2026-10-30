import assert from "node:assert/strict";
import test from "node:test";

import { KEYWORDS_MAX, chunksMatchingKeywords, extractKeywords, mergeRetrieved } from "./keywords.ts";

test("la question du propriétaire est réduite à son mot-clé", () => {
  assert.deepEqual(extractKeywords("est ce que j'ai une note qui traite de quittance"), ["quittance"]);
});

test("mots vides, mots courts et mots méta retirés ; accents et ordre conservés ; pas de doublon", () => {
  assert.deepEqual(extractKeywords("Comment automatiser l'envoi des quittances de loyer ?"), ["automatiser", "envoi", "quittances", "loyer"]);
  assert.deepEqual(extractKeywords("Que contient la procédure de relance des factures impayées ? facture"), ["procédure", "relance", "factures", "impayées", "facture"]);
  assert.deepEqual(extractKeywords("Quelle est la capitale de l'Australie ?"), ["capitale", "australie"]);
});

test("les sigles de deux lettres sont des mots-clés (IA, RH), pas les mots vides courts", () => {
  assert.deepEqual(extractKeywords("des notes sur l'IA"), ["ia"]);
  assert.deepEqual(extractKeywords("la RH et le CV"), ["rh", "cv"]);
});

test("que des mots vides : aucun mot-clé ; texte vide : aucun mot-clé", () => {
  assert.deepEqual(extractKeywords("est-ce que oui ou non ?"), []);
  assert.deepEqual(extractKeywords("   "), []);
});

test("au-delà de cinq : les cinq plus longs, dans l'ordre de la question", () => {
  assert.deepEqual(extractKeywords("devis tarif automatisation quittance facturation relance prospect"), ["automatisation", "quittance", "facturation", "relance", "prospect"]);
});

test("« document » ou « fiche » peuvent être le sujet : ce ne sont pas des mots vides", () => {
  assert.deepEqual(extractKeywords("fiche de poste"), ["fiche", "poste"]);
});

test("extraits retenus : ceux qui contiennent un mot-clé ou une variante, les plus riches d'abord", () => {
  const chunks = [
    { id: "a", content: "Rien à voir ici." },
    { id: "b", content: "Automatiser l'envoi des quittances de loyer." },
    { id: "c", content: "Une quittance seule." },
  ];
  const out = chunksMatchingKeywords(chunks, ["quittance", "loyer"], 5);
  assert.deepEqual(out.map((c) => c.id), ["b", "c"]);
  assert.deepEqual(chunksMatchingKeywords(chunks, ["quittance"], 1).length, 1);
  assert.deepEqual(chunksMatchingKeywords(chunks, [], 5), []);
});

test("les accents ne comptent pas pour reconnaître une variante", () => {
  const out = chunksMatchingKeywords([{ id: "p", content: "La procédure de relance." }], ["procedure"], 5);
  assert.deepEqual(out.map((c) => c.id), ["p"]);
});

test("fusion : par sens d'abord, mots-clés ensuite, sans doublon, bornée", () => {
  type R = { id: string; score: number | null };
  const sense: R[] = [{ id: "1", score: 0.8 }, { id: "2", score: 0.77 }];
  const words: R[] = [{ id: "2", score: null }, { id: "3", score: null }, { id: "4", score: null }];
  assert.deepEqual(mergeRetrieved(sense, words, 10).map((c) => c.id), ["1", "2", "3", "4"]);
  assert.equal(mergeRetrieved(sense, words, 10).find((c) => c.id === "2")?.score, 0.77, "le score par sens est gardé pour un doublon");
  assert.equal(mergeRetrieved(sense, words, 3).length, 3);
  assert.deepEqual(mergeRetrieved([], [], 3), []);
});

test("la voie par sens ne chasse pas les extraits trouvés seulement par mots-clés : trois places réservées", () => {
  type R = { id: string; score: number | null };
  const sense: R[] = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, score: 0.9 - i / 100 }));
  const words: R[] = [{ id: "k1", score: null }, { id: "k2", score: null }, { id: "k3", score: null }, { id: "k4", score: null }];
  const out = mergeRetrieved(sense, words, 8).map((c) => c.id);
  assert.equal(out.length, 8);
  assert.deepEqual(out.slice(5), ["k1", "k2", "k3"], "les 3 premiers extraits par mots-clés prennent les 3 dernières places");
  assert.deepEqual(out.slice(0, 5), ["s0", "s1", "s2", "s3", "s4"], "les mieux notés par sens restent en tête");
  assert.equal(mergeRetrieved(sense.slice(0, 2), words, 8).length, 6, "pas de place perdue quand la voie par sens en a peu");
});

test("extractKeywords : jamais plus de KEYWORDS_MAX mots-clés, donc jamais plus de KEYWORDS_MAX requêtes en parallèle (une question de 300 caractères)", () => {
  const long = Array.from({ length: 40 }, (_, i) => `procedure${String.fromCharCode(97 + (i % 26))}${i}`).join(" ").slice(0, 300);
  const words = extractKeywords(long);
  assert.ok(words.length > 0 && words.length <= KEYWORDS_MAX, `${words.length} mots-clés`);
});
