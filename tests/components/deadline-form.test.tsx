import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeadlineForm } from "../../components/deadline-form.tsx";

afterEach(cleanup);

const EMPTY = { title: "", due_on: "", category: "urssaf", source: "", note: "", priority: "normal", recurrence: "" };
const noop = () => {};
const form = (action: () => Promise<object>) => (
  <DeadlineForm idPrefix="d" action={action as never} initial={EMPTY} submitLabel="Créer l'échéance" onDone={noop} onCancel={noop} />
);
const submit = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Créer l'échéance" }));
const more = () => screen.getByRole("button", { name: "Plus de champs" });

describe("DeadlineForm", () => {
  test("envoi refusé : récapitulatif avec le focus ; les champs en erreur sont reliés à leur ligne", async () => {
    const user = userEvent.setup();
    const { container } = render(form(async () => ({ errors: { title: "Saisis le titre.", due_on: "Saisis la date." }, values: EMPTY })));
    await submit(user);
    await waitFor(() => assert.ok(screen.getByText("2 erreurs à corriger")));
    assert.equal(document.activeElement, screen.getByRole("group"));
    const title = container.querySelector("#d-title");
    assert.deepEqual([title?.getAttribute("aria-invalid"), title?.getAttribute("aria-describedby")], ["true", "d-title-error"]);
    assert.equal(container.querySelector("#d-title-error")?.getAttribute("role"), null);
  });

  test("« Plus de champs » : une erreur dans un champ replié l'ouvre, le bouton peut ensuite le refermer", async () => {
    const user = userEvent.setup();
    render(form(async () => ({ errors: { note: "La remarque est trop longue." }, values: EMPTY })));
    assert.equal(more().getAttribute("aria-expanded"), "false");
    await submit(user);
    await waitFor(() => assert.equal(more().getAttribute("aria-expanded"), "true"));
    await user.click(more());
    assert.equal(more().getAttribute("aria-expanded"), "false", "replié malgré l'erreur affichée");
  });

  test("un lien du récapitulatif ouvre « Plus de champs » puis met le focus sur le champ replié", async () => {
    const user = userEvent.setup();
    render(form(async () => ({ errors: { note: "La remarque est trop longue." }, values: EMPTY })));
    await submit(user);
    await waitFor(() => assert.ok(screen.getByRole("group")));
    await user.click(more()); // l'utilisateur replie le bloc
    await user.click(screen.getByRole("link", { name: "La remarque est trop longue." }));
    await waitFor(() => assert.equal(more().getAttribute("aria-expanded"), "true"));
    await waitFor(() => assert.equal(document.activeElement?.id, "d-note"));
  });
});
