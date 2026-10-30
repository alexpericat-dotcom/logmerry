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

import { loadCards, safeHttpsLink, toPublicCards } from "./portfolio.ts";

const raw = (over: Record<string, unknown> = {}) => ({ id: "a", title: "T", description: "d", origin: "demo" as const, client_label: "Client confidentiel", result_figure: null, link_url: null, stack: null, published_at: null, ...over });

test("lignes incomplètes d'une vue écartées ; pile absente = vide ; capture sans texte alternatif écartée", () => {
  const cards = toPublicCards(
    [raw(), raw({ id: "b", title: null }), raw({ id: "c", client_label: "" }), raw({ id: "d", origin: null }), raw({ id: null })],
    [
      { id: "1", realisation_id: "a", path: "p/1.png", alt: "ok", created_at: null },
      { id: "2", realisation_id: "a", path: "p/2.png", alt: "", created_at: null },
      { id: "3", realisation_id: "a", path: "p/3.png", alt: null, created_at: null },
      { id: "4", realisation_id: "a", path: null, alt: "x", created_at: null },
    ],
  );
  assert.deepEqual(cards.map((c) => c.id), ["a"]);
  assert.deepEqual(cards[0].stack, []);
  assert.deepEqual(cards[0].images.map((i) => i.id), ["1"]);
});

test("chargement : succès = les cartes ; panne = « indisponible » ; les signaux internes de Next sont relancés, pas avalés", async () => {
  assert.deepEqual(await loadCards(async () => []), { cards: [] });
  assert.deepEqual(await loadCards(async () => { throw new Error("base en panne"); }), { unavailable: true });
  const seen: unknown[] = [];
  const signal = new Error("NEXT_PRERENDER_INTERRUPTED");
  await assert.rejects(
    () => loadCards(async () => { throw signal; }, (e) => { seen.push(e); throw e; }),
    (e) => e === signal,
  );
  assert.deepEqual(seen, [signal]);
});

test("lien externe : https seul, sans identifiants, espace ni caractère de contrôle", () => {
  assert.equal(safeHttpsLink("https://ateliernovav3.lovable.app/"), "https://ateliernovav3.lovable.app/");
  for (const bad of [null, "", "http://x.fr", "javascript:alert(1)", "https://user:mdp@x.fr", "https://x.fr/a b", "https://x.fr/\u0007", "//x.fr", "x.fr", "data:text/html,x"]) assert.equal(safeHttpsLink(bad), null, String(bad));
});
