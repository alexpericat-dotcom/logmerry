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
