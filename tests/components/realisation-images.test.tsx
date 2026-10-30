import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RealisationImages } from "../../components/realisation-images.tsx";

afterEach(cleanup);

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REAL = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const img = (n: number) => ({ id: `id${n}`, path: `${OWNER}/${REAL}/cccccccc-cccc-4ccc-8ccc-ccccccccccc${n}.png`, alt: `Capture numéro ${n}` });
const view = (images: ReturnType<typeof img>[]) => <RealisationImages realisationId={REAL} ownerId={OWNER} supabaseUrl="https://x.supabase.co" images={images} />;

test("chaque capture a son texte alternatif et une adresse du bucket public", () => {
  render(view([img(1), img(2)]));
  const first = screen.getByAltText("Capture numéro 1") as HTMLImageElement;
  assert.equal(first.src, `https://x.supabase.co/storage/v1/object/public/portfolio/${img(1).path}`);
  assert.ok(screen.getByAltText("Capture numéro 2"));
  assert.ok(screen.getByRole("button", { name: "Supprimer cette capture: Capture numéro 1" }));
  assert.ok(screen.getByText("Captures d'écran (2/6)"));
});

test("six captures : plus de formulaire d'ajout, une explication", () => {
  render(view([1, 2, 3, 4, 5, 6].map(img)));
  assert.equal(screen.queryByLabelText(/Image \(PNG/), null);
  assert.ok(screen.getByText(/Six captures au plus\. Supprime-en une/));
});

test("ajout sans fichier ou avec un fichier refusé : message, aucun envoi", async () => {
  render(view([]));
  await userEvent.click(screen.getByRole("button", { name: "Ajouter la capture" }));
  assert.match((await screen.findByRole("alert")).textContent ?? "", /Choisis une image/);
  const input = screen.getByLabelText(/Image \(PNG/) as HTMLInputElement;
  await userEvent.upload(input, new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }), { applyAccept: false });
  await userEvent.click(screen.getByRole("button", { name: "Ajouter la capture" }));
  assert.match(screen.getByRole("alert").textContent ?? "", /PNG, JPEG ou WebP/);
});

test("le champ de texte alternatif est étiqueté « obligatoire »", () => {
  render(view([]));
  assert.ok(screen.getByLabelText(/Texte alternatif \(obligatoire\)/));
});

type G = { __storage?: { uploads: { path: string; type: string }[]; removed: string[][]; uploadError: boolean }; __imageCalls?: unknown[][]; __imageResult?: object | Error };
const g = globalThis as G;
const png = () => new File([new Uint8Array([1, 2, 3])], "capture.png", { type: "image/png" });

afterEach(() => {
  delete g.__storage;
  delete g.__imageCalls;
  delete g.__imageResult;
});

const fill = async (alt: string) => {
  await userEvent.upload(screen.getByLabelText(/Image \(PNG/), png());
  if (alt) await userEvent.type(screen.getByLabelText(/Texte alternatif/), alt);
  await userEvent.click(screen.getByRole("button", { name: "Ajouter la capture" }));
};

test("texte alternatif vide : rien n'est envoyé au stockage, le message est affiché et le champ reçoit le focus", async () => {
  render(view([]));
  await fill("");
  assert.match((await screen.findByRole("alert")).textContent ?? "", /texte alternatif/i);
  assert.equal(g.__storage?.uploads.length ?? 0, 0);
  assert.ok(document.activeElement === screen.getByLabelText(/Texte alternatif/));
});

test("envoi réussi : fichier envoyé sous le chemin du propriétaire et de la réalisation, action appelée avec ce chemin et le texte, rien n'est retiré", async () => {
  render(view([]));
  await fill("Tableau de bord");
  assert.ok(await screen.findByText("Capture ajoutée."));
  const [{ path, type }] = g.__storage!.uploads;
  assert.match(path, new RegExp(`^${OWNER}/${REAL}/[0-9a-f-]{36}\\.png$`));
  assert.equal(type, "image/png");
  assert.deepEqual(g.__imageCalls, [[REAL, path, "Tableau de bord"]]);
  assert.deepEqual(g.__storage!.removed, []);
});

test("l'action refuse (septième capture, etc.) : le fichier envoyé est retiré du stockage et le message affiché", async () => {
  g.__imageResult = { message: "Six captures au plus par réalisation." };
  render(view([]));
  await fill("Tableau de bord");
  assert.match((await screen.findByRole("alert")).textContent ?? "", /Six captures/);
  assert.deepEqual(g.__storage!.removed, [[g.__storage!.uploads[0].path]]);
});

test("l'action lève (session expirée, réseau) : le fichier envoyé est retiré, un message est affiché, la section ne plante pas", async () => {
  g.__imageResult = new Error("NEXT_REDIRECT");
  render(view([]));
  await fill("Tableau de bord");
  assert.match((await screen.findByRole("alert")).textContent ?? "", /Recharge la page/);
  assert.deepEqual(g.__storage!.removed, [[g.__storage!.uploads[0].path]]);
});

test("échec de l'envoi au stockage : l'action n'est pas appelée", async () => {
  g.__storage = { uploads: [], removed: [], uploadError: true };
  render(view([]));
  await fill("Tableau de bord");
  assert.match((await screen.findByRole("alert")).textContent ?? "", /envoi de l'image a échoué/);
  assert.equal(g.__imageCalls, undefined);
});

test("double clic sur « Ajouter » : un seul envoi", async () => {
  render(view([]));
  await userEvent.upload(screen.getByLabelText(/Image \(PNG/), png());
  await userEvent.type(screen.getByLabelText(/Texte alternatif/), "Tableau de bord");
  const button = screen.getByRole("button", { name: "Ajouter la capture" });
  await userEvent.dblClick(button);
  await screen.findByText("Capture ajoutée.");
  assert.equal(g.__storage!.uploads.length, 1);
});
