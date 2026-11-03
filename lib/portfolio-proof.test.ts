import assert from "node:assert/strict";
import test from "node:test";

import { HERO } from "./portfolio-content.ts";

/**
 * Ce test BLOQUE LA FUSION tant que la ligne de preuve du hero est le placeholder : Alex l'écrit lui-même (parcours, chiffre ou réalisation), rien n'est inventé.
 * Il est dans son propre fichier pour que son échec soit lisible et ne masque aucun autre test.
 */
test("ligne de preuve du hero : écrite par Alex, plus de placeholder visible (bloque la fusion)", () => {
  assert.ok(!/\[|\]|à compléter/i.test(HERO.proof), `placeholder encore visible : ${HERO.proof}`);
  assert.ok(HERO.proof.trim().length > 0);
});
