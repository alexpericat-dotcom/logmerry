import assert from "node:assert/strict";
import test from "node:test";

import { existsSync } from "node:fs";

import { HOME_PATH, NAV_ITEMS, isCurrent } from "./nav.ts";

test("la barre a les 10 entrées prévues, dans l'ordre", () => {
  assert.deepEqual(
    NAV_ITEMS.map((i) => i.label),
    ["Cockpit", "Notes", "Clients", "Missions", "Factures", "Échéances", "Paramètres", "Réalisations", "À faire", "Profil"],
  );
});

test("le cockpit, les notes, les clients, les missions, le profil et les paramètres sont disponibles pour l'instant", () => {
  assert.deepEqual(NAV_ITEMS.filter((i) => i.available).map((i) => i.href), ["/aujourd-hui", "/notes", "/clients", "/missions", "/parametres", "/profil"]);
});

test("isCurrent : page exacte ou sous-page, pas un préfixe de mot", () => {
  assert.equal(isCurrent("/aujourd-hui", "/aujourd-hui"), true);
  assert.equal(isCurrent("/notes/42", "/notes"), true);
  assert.equal(isCurrent("/notes-archive", "/notes"), false);
  assert.equal(isCurrent("/clients", "/notes"), false);
});

test("chaque entrée disponible a sa page, et le cockpit est la page d'arrivée", () => {
  for (const item of NAV_ITEMS.filter((i) => i.available)) {
    assert.ok(existsSync(`app/(app)${item.href}/page.tsx`), `page manquante : ${item.href}`);
  }
  assert.equal(NAV_ITEMS[0].href, HOME_PATH);
});
