import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PublicationControl } from "../../components/publication-control.tsx";
import { RealisationForm } from "../../components/realisation-form.tsx";

type G = { __publicationCalls?: { id: string; publish: boolean }[]; __stubResult?: object };
const g = globalThis as G;

afterEach(() => {
  cleanup();
  delete g.__publicationCalls;
  delete g.__stubResult;
});

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("PublicationControl", () => {
  test("non publiée avec accord : « Publier » demande la publication", async () => {
    render(<PublicationControl id={ID} published={false} consent />);
    await userEvent.click(screen.getByRole("button", { name: "Publier" }));
    await waitFor(() => assert.deepEqual(g.__publicationCalls, [{ id: ID, publish: true }]));
  });

  test("publiée : « Retirer de la publication » demande le retrait", async () => {
    render(<PublicationControl id={ID} published consent />);
    assert.ok(screen.getByText("Publiée"));
    await userEvent.click(screen.getByRole("button", { name: "Retirer de la publication" }));
    await waitFor(() => assert.deepEqual(g.__publicationCalls, [{ id: ID, publish: false }]));
  });

  test("sans accord enregistré : « Publier » est désactivé et son indice y est relié", () => {
    render(<PublicationControl id={ID} published={false} consent={false} />);
    const button = screen.getByRole("button", { name: "Publier" }) as HTMLButtonElement;
    assert.ok(button.disabled);
    const help = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    assert.match(help?.textContent ?? "", /accord du client/);
  });

  test("une publiée dont l'accord n'est plus enregistré garde son bouton « Retirer »", () => {
    render(<PublicationControl id={ID} published consent={false} />);
    assert.ok(!(screen.getByRole("button", { name: "Retirer de la publication" }) as HTMLButtonElement).disabled);
  });

  test("message de refus renvoyé par le serveur : affiché en alerte", async () => {
    g.__stubResult = { message: "Coche l'accord du client avant de publier." };
    render(<PublicationControl id={ID} published={false} consent />);
    await userEvent.click(screen.getByRole("button", { name: "Publier" }));
    assert.match((await screen.findByRole("alert")).textContent ?? "", /accord du client/);
  });
});

describe("RealisationForm : case d'accord", () => {
  const initial = { title: "T", description: "D", origin: "demo", client_name: "", client_sector: "", result_figure: "", link_url: "", client_consent: "on", stack: "" };
  const view = (client_consent: string) => <RealisationForm action={async () => ({})} initial={{ ...initial, client_consent }} submitLabel="Enregistrer" />;

  test("accord enregistré : case cochée, envoyée sous le nom attendu par l'action", () => {
    render(view("on"));
    const box = screen.getByRole("checkbox", { name: /accord pour publier/i }) as HTMLInputElement;
    assert.ok(box.checked);
    assert.equal(box.name, "client_consent");
  });

  test("pas d'accord enregistré : case décochée", () => {
    render(view(""));
    assert.ok(!(screen.getByRole("checkbox", { name: /accord pour publier/i }) as HTMLInputElement).checked);
  });
});
