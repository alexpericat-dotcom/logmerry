import assert from "node:assert/strict";
import test from "node:test";

import { inventedLinks, inventedNumbers, verifyCitations } from "./citations.ts";

test("citations valides : sans doublon, dans l'ordre", () => {
  assert.deepEqual(verifyCitations(["b", "a", "b"], ["a", "b", "c"]), ["b", "a"]);
  assert.deepEqual(verifyCitations([], ["a"]), [], "aucune citation : la réponse « les notes ne répondent pas » est permise");
});

test("une seule citation d'un extrait non envoyé : réponse rejetée", () => {
  assert.throws(() => verifyCitations(["a", "intrus"], ["a", "b"]), /non vérifiée/);
  assert.throws(() => verifyCitations(["x"], []), /non vérifiée/);
});

test("nombres présents dans les extraits : acceptés, quel que soit le format", () => {
  const extracts = ["Relance à 15 jours, mise en demeure à 30 jours.", "Forfait de 2 400 euros, remise de 7,5 %."];
  assert.deepEqual(inventedNumbers("- Relance à 15 jours. - Forfait de 2400 euros. - Remise de 7,5 %.", extracts), []);
});

test("un nombre qui ne figure nulle part est signalé", () => {
  assert.deepEqual(inventedNumbers("Le tarif est de 650 euros, soit 12,5 % de remise.", ["Un tarif sans chiffre."]), ["650", "12.5"]);
});

test("un nombre cité par la question est connu", () => {
  assert.deepEqual(inventedNumbers("Oui, 30 jours.", ["Délai de paiement."].concat(["Question : et après 30 jours ?"])), []);
});

test("petits entiers et décomptes ne comptent pas (« 3 étapes »), mais un décimal si", () => {
  assert.deepEqual(inventedNumbers("Il y a 3 étapes et 2 relances.", ["texte"]), []);
  assert.deepEqual(inventedNumbers("Compte 3,5 étapes.", ["texte"]), ["3.5"]);
});

test("aucun nombre : rien à signaler", () => {
  assert.deepEqual(inventedNumbers("Tes notes ne répondent pas.", []), []);
});

test("inventedLinks : une adresse présente dans les textes fournis est permise, même reformatée (schéma, www, barre finale, casse, ponctuation, guillemets français)", () => {
  const known = ["La procédure est sur https://aide.example.fr/relance et le contact est jean.dupont@example.fr."];
  assert.deepEqual(inventedLinks("Voir https://aide.example.fr/relance.", known), []);
  assert.deepEqual(inventedLinks("Écris à jean.dupont@example.fr", known), []);
  assert.deepEqual(inventedLinks("Va sur HTTPS://AIDE.EXAMPLE.FR/RELANCE", known), []);
  assert.deepEqual(inventedLinks("Voir « https://aide.example.fr/relance » ou http://www.aide.example.fr/relance/", known), []);
  assert.deepEqual(inventedLinks("Aucun lien ici, 12 étapes.", known), []);
});

test("inventedLinks : adresse inventée, tronquée ou d'un autre schéma : signalée (jamais acceptée comme simple sous-chaîne d'une adresse connue)", () => {
  const known = ["La procédure est sur https://aide.example.fr/relance/page et le contact est jean.aide@example.fr."];
  assert.deepEqual(inventedLinks("Clique sur https://pirate.example.net/login", known), ["pirate.example.net/login"]);
  assert.deepEqual(inventedLinks("Va sur www.pirate.example.net, ou écris à fraude@pirate.example.net !", known), ["pirate.example.net", "fraude@pirate.example.net"]);
  assert.deepEqual(inventedLinks("Voir https://aide.example.fr/rel", known), ["aide.example.fr/rel"], "adresse tronquée");
  assert.deepEqual(inventedLinks("Écris à aide@example.fr", known), ["aide@example.fr"], "e-mail tronqué (suffixe d'une adresse connue)");
  assert.deepEqual(inventedLinks("Ouvre javascript:alert(1) puis data:text/html,x, ftp://x.example.org ou mailto:a@b.fr ou //cdn.example.org/x.js", known), ["javascript:alert(1", "data:text/html,x", "ftp://x.example.org", "mailto:a@b.fr", "//cdn.example.org/x.js"]);
  assert.deepEqual(inventedLinks("https://x.example.fr https://x.example.fr", []), ["x.example.fr"], "sans doublon");
});
