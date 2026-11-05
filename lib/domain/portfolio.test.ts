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
  status: "exercice_formation",
  problem: null,
  tests: null,
  design_choice: null,
  validation: null,
  stack_is_recommended: false,
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

import { canPreviewInFrame, loadCards, safeHttpsLink, toPublicCards } from "./portfolio.ts";

const raw = (over: Record<string, unknown> = {}) => ({ id: "a", title: "T", description: "d", origin: "demo" as const, client_label: "Client confidentiel", result_figure: null, link_url: null, stack: null, published_at: null, status: "exercice_formation", problem: null, tests: null, design_choice: null, validation: null, stack_is_recommended: null, ...over });

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

import { isSameOrigin } from "./portfolio.ts";

test("aperçu en direct : une adresse de la même origine que la page est refusée (le sandbox ne protégerait plus rien) ; illisible = refusée", () => {
  assert.equal(isSameOrigin("https://logmerry.app/auth/login", "https://logmerry.app"), true);
  assert.equal(isSameOrigin("https://logmerry.app:443/x", "https://logmerry.app"), true);
  assert.equal(isSameOrigin("https://ateliernovav3.lovable.app/", "https://logmerry.app"), false);
  assert.equal(isSameOrigin("https://sous.logmerry.app/", "https://logmerry.app"), false, "sous-domaine : autre origine");
  assert.equal(isSameOrigin("http://logmerry.app/", "https://logmerry.app"), false, "autre protocole : autre origine");
  assert.equal(isSameOrigin("pas une adresse", "https://logmerry.app"), true);
  assert.equal(isSameOrigin("https://x.fr", "pas une origine"), true);
});

test("STATUT : une réalisation sans statut, ou au statut inconnu, n'est jamais gardée (elle ne peut pas s'afficher)", () => {
  const cards = toPublicCards([raw({ id: "ok" }), raw({ id: "sans", status: null }), raw({ id: "vide", status: "" }), raw({ id: "inconnu", status: "client" }), raw({ id: "majuscules", status: "CLIENT_REEL" })], []);
  assert.deepEqual(cards.map((c) => c.id), ["ok"]);
});

test("statut : chaque carte porte son libellé ; le drapeau « stack recommandée » est faux sauf s'il vaut vrai", () => {
  const cards = toPublicCards([raw({ id: "a", status: "client_reel" }), raw({ id: "b", status: "projet_perso", stack_is_recommended: true }), raw({ id: "c", status: "exercice_formation", stack_is_recommended: null })], []);
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  assert.deepEqual([byId.a.statusLabel, byId.b.statusLabel, byId.c.statusLabel], ["Client réel", "Projet personnel", "Exercice de formation"]);
  assert.deepEqual([byId.a.stack_is_recommended, byId.b.stack_is_recommended, byId.c.stack_is_recommended], [false, true, false]);
});

test("aperçu en direct : refusé pour les sites qui interdisent d'être affichés dans un cadre (Notion), permis pour les autres", () => {
  for (const url of ["https://knotty-reaction-86f.notion.site/Projet-UMARIS-39167eb89ef68099b498ce56f5f958e9", "https://notion.so/page", "https://www.notion.so/x"]) assert.equal(canPreviewInFrame(url), false, url);
  for (const url of ["https://ateliernovav3.lovable.app/", "https://exemple.fr/notion.site", "https://notion.site.exemple.fr/"]) assert.equal(canPreviewInFrame(url), true, url);
  assert.equal(canPreviewInFrame("pas une adresse"), false);
});
