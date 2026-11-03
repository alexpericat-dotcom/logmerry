import assert from "node:assert/strict";
import test from "node:test";

import { REALISATION_CLIENT_NAME_MAX, publicationBlock, REALISATION_LINK_MAX, parsePublicLink, REALISATION_DESCRIPTION_MAX, REALISATION_ORIGINS, REALISATION_ORIGIN_LABELS, REALISATION_RESULT_MAX, REALISATION_STATUSES, REALISATION_STATUS_LABELS, REALISATION_SECTOR_MAX, REALISATION_STACK_MAX, REALISATION_TAG_MAX, REALISATION_TITLE_MAX, parseStack, validateRealisationInput, type RealisationInput } from "./realisations.ts";

const base: RealisationInput = { title: "Assistant RAG", description: "Un assistant qui cite ses sources.", origin: "demo", client_name: "", client_sector: "", result_figure: "", link_url: "", client_consent: "", stack: "", status: "projet_perso", problem: "", tests: "", design_choice: "", validation: "", stack_is_recommended: "" };

test("création minimale : champs facultatifs vides → null, pile vide", () => {
  assert.deepEqual(validateRealisationInput(base), {
    ok: true,
    value: { title: "Assistant RAG", description: "Un assistant qui cite ses sources.", origin: "demo", client_name: null, client_sector: null, result_figure: null, link_url: null, client_consent: false, stack: [], status: "projet_perso", problem: null, tests: null, design_choice: null, validation: null, stack_is_recommended: false },
  });
});

test("textes nettoyés (espaces, caractère nul)", () => {
  const r = validateRealisationInput({ ...base, title: "  Titre \u0000 ", client_name: "  Atelier  ", stack: " a ,b " });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual([r.value.title, r.value.client_name, r.value.stack], ["Titre", "Atelier", ["a", "b"]]);
});

test("titre, description et origine obligatoires : erreurs nommant le champ", () => {
  const r = validateRealisationInput({ ...base, title: "  ", description: "", origin: "autre" });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["description", "origin", "title"]);
});

test("longueurs comptées en points de code, comme la base", () => {
  assert.ok(validateRealisationInput({ ...base, title: "😀".repeat(REALISATION_TITLE_MAX) }).ok);
  assert.ok(!validateRealisationInput({ ...base, title: "😀".repeat(REALISATION_TITLE_MAX + 1) }).ok);
  assert.ok(!validateRealisationInput({ ...base, description: "x".repeat(601) }).ok);
  assert.ok(!validateRealisationInput({ ...base, client_sector: "x".repeat(101) }).ok);
  assert.ok(!validateRealisationInput({ ...base, result_figure: "x".repeat(201) }).ok);
});

test("pile : vides et doublons ignorés, limites d'étiquettes", () => {
  assert.deepEqual(parseStack("Next.js, supabase ,, next.js"), ["Next.js", "supabase"]);
  const many = Array.from({ length: REALISATION_STACK_MAX + 1 }, (_, i) => `t${i}`).join(",");
  const tooMany = validateRealisationInput({ ...base, stack: many });
  assert.ok(!tooMany.ok && tooMany.errors.stack);
  assert.ok(validateRealisationInput({ ...base, stack: many.split(",").slice(0, REALISATION_STACK_MAX).join(",") }).ok);
  assert.ok(!validateRealisationInput({ ...base, stack: "x".repeat(REALISATION_TAG_MAX + 1) }).ok);
});

test("texte piégé gardé tel quel (jamais interprété par le domaine)", () => {
  const r = validateRealisationInput({ ...base, title: "<script>alert(1)</script>" });
  assert.ok(r.ok && r.value.title === "<script>alert(1)</script>");
});

test("chaque origine est acceptée et a son étiquette (l'enum SQL en a les mêmes quatre)", () => {
  assert.deepEqual([...REALISATION_ORIGINS], ["real_client", "training", "friend", "demo"]);
  for (const origin of REALISATION_ORIGINS) {
    assert.ok(validateRealisationInput({ ...base, origin }).ok, origin);
    assert.ok(REALISATION_ORIGIN_LABELS[origin], origin);
  }
});

test("bornes exactes : le maximum passe, un de plus est refusé, pour chaque champ", () => {
  const cases: [keyof RealisationInput, number][] = [
    ["title", REALISATION_TITLE_MAX],
    ["description", REALISATION_DESCRIPTION_MAX],
    ["client_name", REALISATION_CLIENT_NAME_MAX],
    ["client_sector", REALISATION_SECTOR_MAX],
    ["result_figure", REALISATION_RESULT_MAX],
    ["stack", REALISATION_TAG_MAX],
  ];
  for (const [key, max] of cases) {
    assert.ok(validateRealisationInput({ ...base, [key]: "x".repeat(max) }).ok, `${key} = ${max}`);
    const over = validateRealisationInput({ ...base, [key]: "x".repeat(max + 1) });
    assert.ok(!over.ok && over.errors[key], `${key} = ${max + 1}`);
  }
});

test("retours à la ligne comptés pour un seul caractère ; caractères invisibles retirés", () => {
  const withBreaks = "x\r\n".repeat(300).trimEnd();
  const r = validateRealisationInput({ ...base, description: withBreaks });
  assert.ok(r.ok && !r.value.description.includes("\r") && [...r.value.description].length === 599);
  const invisible = validateRealisationInput({ ...base, title: "\u200B\uFEFF " });
  assert.ok(!invisible.ok && invisible.errors.title);
});

test("lien : https complet accepté tel quel ; http, javascript:, data:, espaces, identifiants, hôte sans point et excès de longueur refusés", () => {
  const ok = validateRealisationInput({ ...base, link_url: "https://ateliernovav3.lovable.app/" });
  assert.ok(ok.ok && ok.value.link_url === "https://ateliernovav3.lovable.app/");
  for (const bad of ["http://exemple.fr", "javascript:alert(1)", "data:text/html,x", "https://exemple.fr/a b", "https://user:mdp@exemple.fr", "https://localhost", "exemple.fr", "ftp://exemple.fr", `https://exemple.fr/${"x".repeat(REALISATION_LINK_MAX)}`]) {
    assert.equal(parsePublicLink(bad), null, bad);
    const r = validateRealisationInput({ ...base, link_url: bad });
    assert.ok(!r.ok && r.errors.link_url, bad);
  }
  assert.ok(parsePublicLink(`https://exemple.fr/${"x".repeat(REALISATION_LINK_MAX - 19)}`), "300 caractères pile");
});

test("statut obligatoire, jamais de valeur par défaut : vide, inconnu ou inventé = erreur ; les trois valeurs sont acceptées", () => {
  for (const status of ["", "  ", "client", "exercice", "CLIENT_REEL", "démo"]) {
    const r = validateRealisationInput({ ...base, status });
    assert.ok(!r.ok && "status" in r.errors, JSON.stringify(status));
  }
  for (const status of ["client_reel", "exercice_formation", "projet_perso"] as const) {
    const r = validateRealisationInput({ ...base, status });
    assert.ok(r.ok && r.value.status === status, status);
  }
  assert.deepEqual(REALISATION_STATUSES, ["client_reel", "exercice_formation", "projet_perso"]);
  assert.deepEqual(Object.values(REALISATION_STATUS_LABELS), ["Client réel", "Exercice de formation", "Projet personnel"]);
});

test("problème et tests : facultatifs, nettoyés, 600 caractères au plus ; la stack « recommandée » est un drapeau (faux sauf case cochée)", () => {
  const ok = validateRealisationInput({ ...base, problem: "  Des demandes dispersées  ", tests: "10 testeurs", stack_is_recommended: "on" });
  assert.ok(ok.ok && ok.value.problem === "Des demandes dispersées" && ok.value.tests === "10 testeurs" && ok.value.stack_is_recommended);
  for (const raw of ["", "true", "1"]) assert.ok(validateRealisationInput({ ...base, stack_is_recommended: raw }).ok && !(validateRealisationInput({ ...base, stack_is_recommended: raw }) as { value: { stack_is_recommended: boolean } }).value.stack_is_recommended, raw);
  assert.ok(!validateRealisationInput({ ...base, problem: "x".repeat(601) }).ok);
  assert.ok(!validateRealisationInput({ ...base, tests: "x".repeat(601) }).ok);
});

test("publication : sans statut, bloquée avec un message (même si l'accord est coché)", () => {
  assert.match(publicationBlock({ client_consent: true, status: null }) ?? "", /statut/);
  assert.match(publicationBlock({ client_consent: true, status: "inventé" }) ?? "", /statut/);
});

test("accord : coché = vrai, vide ou toute autre valeur = faux ; sans accord, la publication est bloquée avec un message", () => {
  for (const [raw, expected] of [["on", true], ["", false], ["true", false], ["1", false]] as const) {
    const r = validateRealisationInput({ ...base, client_consent: raw });
    assert.ok(r.ok && r.value.client_consent === expected, raw);
  }
  assert.match(publicationBlock({ client_consent: false, status: "projet_perso" }) ?? "", /accord/);
  assert.equal(publicationBlock({ client_consent: true, status: "projet_perso" }), null);
});

test("choix de conception et validation : facultatifs, 600 caractères au plus, distincts du résultat", () => {
  const ok = validateRealisationInput({ ...base, design_choice: "  Une base relationnelle.  ", validation: "Validé en formation.", result_figure: "R" });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual([ok.value.design_choice, ok.value.validation, ok.value.result_figure], ["Une base relationnelle.", "Validé en formation.", "R"]);
  assert.ok(validateRealisationInput({ ...base, design_choice: "x".repeat(600), validation: "x".repeat(600) }).ok);
  const long = validateRealisationInput({ ...base, design_choice: "x".repeat(601), validation: "x".repeat(601) });
  assert.ok(!long.ok);
  if (!long.ok) assert.deepEqual(Object.keys(long.errors).sort(), ["design_choice", "validation"]);
});
