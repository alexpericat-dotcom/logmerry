import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen } from "@testing-library/react";

import { NoteForm } from "../../components/note-form.tsx";

afterEach(cleanup);

const action = async () => ({});
const hidden = (c: HTMLElement, name: string) => c.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
const annuler = () => screen.getByRole("link", { name: "Annuler" }).getAttribute("href");

describe("NoteForm : retour sur la liste filtrée", () => {
  test("filtre par type : champ caché `list_type`, « Annuler » revient à cette liste", () => {
    const { container } = render(<NoteForm action={action} clients={[]} submitLabel="Enregistrer" listFilter={{ type: "procedure", draft: false }} />);
    assert.equal(hidden(container, "list_type")?.value, "procedure");
    assert.equal(hidden(container, "list_statut"), null);
    assert.equal(annuler(), "/notes?type=procedure");
  });

  test("filtre brouillons : champ caché `list_statut`, « Annuler » revient aux brouillons", () => {
    const { container } = render(<NoteForm action={action} clients={[]} submitLabel="Enregistrer" listFilter={{ type: null, draft: true }} />);
    assert.equal(hidden(container, "list_statut")?.value, "brouillon");
    assert.equal(hidden(container, "list_type"), null);
    assert.equal(annuler(), "/notes?statut=brouillon");
  });

  test("sans filtre : aucun champ caché, « Annuler » revient à /notes", () => {
    const { container } = render(<NoteForm action={action} clients={[]} submitLabel="Enregistrer" />);
    assert.equal(hidden(container, "list_type"), null);
    assert.equal(hidden(container, "list_statut"), null);
    assert.equal(annuler(), "/notes");
  });
});
