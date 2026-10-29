import assert from "node:assert/strict";
import test from "node:test";

import { ASSISTANT_OPTION_ID, enterAction, firstOfGroup, isPaletteShortcut, itemHref, nextActive, paletteItems, paletteNav, paletteOptionId, statusText } from "./palette.ts";

const note = (id: string) => ({ id, title: `Note ${id}` });
const client = (id: string) => ({ id, name: `Fiche ${id}` });
const mission = (id: string) => ({ id, title: `Mission ${id}` });
const ALL = paletteItems(true, [note("n1"), note("n2")], [client("c1")], [mission("m1")]);

test("lignes : notes, puis fiches, puis missions, chacune avec son type et son identifiant ; réponse pas encore reçue = rien", () => {
  assert.deepEqual(ALL.map((i) => [i.kind, i.id]), [["note", "n1"], ["note", "n2"], ["client", "c1"], ["mission", "m1"]]);
  assert.deepEqual(ALL[0], { kind: "note", id: "n1", note: note("n1") });
  assert.deepEqual(paletteItems(false, [note("n1")], [client("c1")], [mission("m1")]), []);
  assert.deepEqual(paletteItems(true, [], [], []), []);
});

test("raccourci : ⌘K, Ctrl+K, majuscule K ; pas k seul, ni ⌘J, ni saisie en composition", () => {
  const key = (k: string, o: Partial<{ isComposing: boolean; metaKey: boolean; ctrlKey: boolean }> = {}) => ({ isComposing: false, key: k, metaKey: false, ctrlKey: false, ...o });
  assert.equal(isPaletteShortcut(key("k", { metaKey: true })), true);
  assert.equal(isPaletteShortcut(key("k", { ctrlKey: true })), true);
  assert.equal(isPaletteShortcut(key("K", { metaKey: true })), true);
  assert.equal(isPaletteShortcut(key("k")), false);
  assert.equal(isPaletteShortcut(key("j", { metaKey: true })), false);
  assert.equal(isPaletteShortcut(key("k", { metaKey: true, isComposing: true })), false);
});

test("navigation avec requête : l'assistant est en tête, les lignes suivent ; total = lignes + 1", () => {
  const first = paletteNav("bail", ALL, 0);
  assert.deepEqual([first.hasAssistant, first.total, first.current, first.activeId], [true, 5, 0, ASSISTANT_OPTION_ID]);
  assert.equal(first.activeResult, undefined);
  const second = paletteNav("bail", ALL, 1);
  assert.equal(second.activeResult, ALL[0]);
  assert.equal(second.activeId, "search-note-n1");
  assert.equal(paletteNav("bail", ALL, 4).activeId, "search-mission-m1");
});

test("navigation sans requête : pas d'assistant, la première ligne est active ; liste vide = rien d'actif", () => {
  const nav = paletteNav("", ALL, 0);
  assert.deepEqual([nav.hasAssistant, nav.total, nav.current, nav.activeResult], [false, 4, 0, ALL[0]]);
  assert.equal(nav.activeId, "search-note-n1");
  const none = paletteNav("", [], 0);
  assert.deepEqual([none.total, none.activeId, none.activeResult], [0, undefined, undefined]);
  const only = paletteNav("bail", [], 0); // requête sans résultat : l'assistant seul
  assert.deepEqual([only.total, only.activeId], [1, ASSISTANT_OPTION_ID]);
});

test("index périmé : ramené au dernier élément", () => {
  assert.equal(paletteNav("", ALL.slice(0, 3), 9).current, 2);
  assert.equal(paletteNav("bail", ALL.slice(0, 2), 9).current, 2);
  assert.equal(paletteNav("", [], 9).current, 0);
});

test("flèches : bouclage vers le bas et vers le haut ; autre touche ou liste vide = aucun déplacement", () => {
  assert.equal(nextActive("ArrowDown", 0, 3), 1);
  assert.equal(nextActive("ArrowDown", 2, 3), 0);
  assert.equal(nextActive("ArrowUp", 1, 3), 0);
  assert.equal(nextActive("ArrowUp", 0, 3), 2);
  assert.equal(nextActive("Enter", 1, 3), null);
  assert.equal(nextActive("a", 1, 3), null);
  assert.equal(nextActive("ArrowDown", 0, 0), null);
});

test("Entrée : l'assistant quand il est actif, la ligne active sinon, rien si rien", () => {
  assert.deepEqual(enterAction(paletteNav("bail", ALL, 0)), { type: "assistant" });
  assert.deepEqual(enterAction(paletteNav("bail", ALL, 3)), { type: "item", item: ALL[2] });
  assert.deepEqual(enterAction(paletteNav("", ALL, 0)), { type: "item", item: ALL[0] });
  assert.equal(enterAction(paletteNav("", [], 0)), null);
});

test("texte d'état : message de la réponse, « Aucun résultat », vide avec résultats, vide avant la réponse", () => {
  assert.equal(statusText(true, "Recherche impossible pour le moment. Réessaie.", 0), "Recherche impossible pour le moment. Réessaie.");
  assert.equal(statusText(true, null, 0), "Aucun résultat");
  assert.equal(statusText(true, null, 3), "");
  assert.equal(statusText(true, "Message", 3), "Message");
  assert.equal(statusText(false, null, 0), "");
  assert.equal(statusText(false, "Message", 3), "");
});

test("adresse et groupes : /notes, /clients, /missions ; titre de groupe à la première ligne d'un type", () => {
  assert.equal(itemHref({ kind: "note", id: "n1" }), "/notes/n1");
  assert.equal(itemHref({ kind: "client", id: "c1" }), "/clients/c1");
  assert.equal(itemHref({ kind: "mission", id: "m1" }), "/missions/m1");
  assert.deepEqual(ALL.map((_, i) => firstOfGroup(ALL, i)), [true, false, true, true]);
  assert.equal(paletteOptionId({ kind: "client", id: "c1" }), "search-client-c1");
});
