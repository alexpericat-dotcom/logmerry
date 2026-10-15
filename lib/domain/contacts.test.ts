import assert from "node:assert/strict";
import test from "node:test";

import { CONTACT_ADDRESS_MAX, CONTACT_EMAIL_MAX, CONTACT_NAME_MAX, CONTACT_PHONE_MAX, initials, isEmail, validateContactInput } from "./contacts.ts";

const base = { name: "Claire Martin", job_title: "", email: "", phone: "", address: "" };

test("seul le nom est obligatoire ; les champs facultatifs vides valent null, jamais une chaîne vide", () => {
  assert.deepEqual(validateContactInput(base), { ok: true, value: { name: "Claire Martin", job_title: null, email: null, phone: null, address: null } });
  assert.deepEqual(validateContactInput({ name: " Claire \u0000", job_title: " Directrice ", email: " c@x.fr ", phone: " 06 12 ", address: " 1 rue\nParis " }), {
    ok: true,
    value: { name: "Claire", job_title: "Directrice", email: "c@x.fr", phone: "06 12", address: "1 rue\nParis" },
  });
});

test("nom vide ou d'espaces : erreur nommant le champ", () => {
  const r = validateContactInput({ ...base, name: "   " });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors), ["name"]);
});

test("e-mail : un @ entouré de texte, sans espace ; vide accepté", () => {
  for (const ok of ["a@b", "claire.martin@exemple.fr", "a+b@c.d.e"]) assert.ok(isEmail(ok), ok);
  for (const ko of ["claire", "@exemple.fr", "claire@", "a b@c.fr", "a@b@c", "a@ b"]) assert.ok(!isEmail(ko), ko);
  const r = validateContactInput({ ...base, email: "pas un mail" });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors), ["email"]);
});

test("longueurs maximales au décompte en points de code (comme la base)", () => {
  assert.ok(validateContactInput({ ...base, name: "é".repeat(CONTACT_NAME_MAX) }).ok);
  assert.ok(!validateContactInput({ ...base, name: "é".repeat(CONTACT_NAME_MAX + 1) }).ok);
  assert.ok(validateContactInput({ ...base, phone: "😀".repeat(CONTACT_PHONE_MAX) }).ok, "un émoji compte pour 1");
  assert.ok(!validateContactInput({ ...base, phone: "1".repeat(CONTACT_PHONE_MAX + 1) }).ok);
  assert.ok(validateContactInput({ ...base, address: "a".repeat(CONTACT_ADDRESS_MAX) }).ok);
  assert.ok(!validateContactInput({ ...base, address: "a".repeat(CONTACT_ADDRESS_MAX + 1) }).ok);
  assert.ok(!validateContactInput({ ...base, email: `${"a".repeat(CONTACT_EMAIL_MAX)}@x.fr` }).ok);
  assert.ok(!validateContactInput({ ...base, job_title: "j".repeat(201) }).ok);
});

test("toutes les erreurs sont rendues ensemble", () => {
  const r = validateContactInput({ name: "", job_title: "", email: "x", phone: "1".repeat(31), address: "" });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "name", "phone"]);
});

test("initiales de l'avatar : deux premiers mots, majuscules, accents et émojis tolérés, « ? » si vide", () => {
  assert.equal(initials("Claire Martin"), "CM");
  assert.equal(initials("claire"), "C");
  assert.equal(initials("  élodie   de la Roche "), "ÉD");
  assert.equal(initials("😀 Max"), "😀M");
  assert.equal(initials("   "), "?");
});
