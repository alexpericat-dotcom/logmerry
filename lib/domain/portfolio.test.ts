import assert from "node:assert/strict";
import test from "node:test";

import { buildCards, mailtoHref, type PublicImage, type PublicRealisation } from "./portfolio.ts";

const item = (id: string, published_at: string | null, origin: PublicRealisation["origin"] = "demo"): PublicRealisation => ({
  id,
  title: `T${id}`,
  description: "d",
  origin,
  client_label: "Client confidentiel",
  result_figure: null,
  link_url: null,
  stack: [],
  published_at,
});
const image = (id: string, realisation_id: string, created_at: string | null): PublicImage => ({ id, realisation_id, path: `p/${id}.png`, alt: `alt ${id}`, created_at });

test("cartes : plus récente publiée d'abord, sans date en dernier, égalité départagée par l'identifiant", () => {
  const cards = buildCards([item("b", "2026-10-01T00:00:00Z"), item("a", "2026-10-01T00:00:00Z"), item("c", "2026-10-20T00:00:00Z"), item("z", null)], []);
  assert.deepEqual(cards.map((c) => c.id), ["c", "a", "b", "z"]);
});

test("chaque carte reçoit ses captures, dans l'ordre d'ajout, et seulement les siennes", () => {
  const cards = buildCards([item("a", "2026-10-01T00:00:00Z"), item("b", "2026-10-02T00:00:00Z")], [image("2", "a", "2026-10-03T00:00:00Z"), image("1", "a", "2026-10-02T00:00:00Z"), image("3", "b", null), image("x", "inconnue", null)]);
  const byId = Object.fromEntries(cards.map((c) => [c.id, c.images.map((i) => i.id)]));
  assert.deepEqual(byId, { a: ["1", "2"], b: ["3"] });
});

test("l'étiquette d'origine est celle du domaine (démo, formation, ami, client réel)", () => {
  const labels = buildCards((["real_client", "training", "friend", "demo"] as const).map((o, i) => item(String(i), "2026-10-01T00:00:00Z", o)), []).map((c) => c.originLabel);
  assert.deepEqual(labels.sort(), ["Ami", "Client réel", "Démo", "Formation"]);
});

test("mailto : objet encodé", () => {
  assert.equal(mailtoHref("a@b.fr", "Projet & idées"), "mailto:a@b.fr?subject=Projet%20%26%20id%C3%A9es");
});
