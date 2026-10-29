import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render } from "@testing-library/react";

import { StoryForm } from "../../components/story-form.tsx";

afterEach(cleanup);

const VALUES = { title: "Relancer", role: "freelance", benefit: "être payé", acceptance_criteria: "", points: "3", status: "in_progress" };
const noop = () => {};
const action = async () => ({});
const hidden = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[name="initial_status"]');

describe("StoryForm : statut reçu à l'ouverture (champ caché `initial_status`)", () => {
  test("édition : le champ caché porte le statut reçu ; il reste figé quand la story change pendant que le formulaire est ouvert", () => {
    const { container, rerender } = render(<StoryForm idPrefix="e" action={action} initial={VALUES} submitLabel="Enregistrer" onDone={noop} onCancel={noop} />);
    assert.equal(hidden(container)?.type, "hidden");
    assert.equal(hidden(container)?.value, "in_progress");
    rerender(<StoryForm idPrefix="e" action={action} initial={{ ...VALUES, status: "done" }} submitLabel="Enregistrer" onDone={noop} onCancel={noop} />);
    assert.equal(hidden(container)?.value, "in_progress", "le statut changé ailleurs (menu) ne remplace pas celui reçu à l'ouverture");
  });

  test("ajout (sans valeurs initiales) : pas de champ caché, le statut est toujours écrit", () => {
    const { container } = render(<StoryForm idPrefix="n" action={action} submitLabel="Ajouter" onDone={noop} onCancel={noop} />);
    assert.equal(hidden(container), null);
    assert.equal(container.querySelector<HTMLSelectElement>('select[name="status"]')?.value, "todo");
  });
});
