import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClientForm } from "../../components/client-form.tsx";

afterEach(cleanup);

const REFUSED = { errors: { name: "Saisis le nom.", origin: "Choisis l'origine." }, values: { name: "", status: "prospect", origin: "" } };
const refuse = async () => REFUSED;

describe("ClientForm", () => {
  test("sans erreur : mêmes identifiants et noms qu'avant (champs sans préfixe), ni aria-invalid ni récapitulatif", () => {
    const { container } = render(<ClientForm action={async () => ({})} submitLabel="Créer" />);
    for (const key of ["name", "status", "origin"]) {
      const el = container.querySelector<HTMLElement>(`#${key}`);
      assert.equal(el?.getAttribute("name"), key);
      assert.equal(el?.getAttribute("aria-invalid"), null);
      assert.equal(el?.getAttribute("aria-describedby"), null);
    }
    assert.ok(container.querySelector('[role="group"]') === null);
    assert.ok(container.querySelector('[id$="-error"]') === null);
  });

  test("envoi refusé : récapitulatif « 2 erreurs » avec le focus, erreurs en ligne reliées aux champs, sans role=alert", async () => {
    const user = userEvent.setup();
    const { container } = render(<ClientForm action={refuse} submitLabel="Créer" />);
    await user.click(screen.getByRole("button", { name: "Créer" }));
    await waitFor(() => assert.ok(screen.getByText("2 erreurs à corriger")));
    assert.ok(document.activeElement === screen.getByRole("group"));
    const name = container.querySelector("#name");
    assert.deepEqual([name?.getAttribute("aria-invalid"), name?.getAttribute("aria-describedby")], ["true", "name-error"]);
    const line = container.querySelector("#name-error");
    assert.equal(line?.textContent, "Saisis le nom.");
    assert.equal(line?.getAttribute("role"), null);
    assert.equal(container.querySelector("#status")?.getAttribute("aria-invalid"), null); // champ sans erreur
  });

  test("un lien du récapitulatif met le focus sur le champ en erreur", async () => {
    const user = userEvent.setup();
    render(<ClientForm action={refuse} submitLabel="Créer" />);
    await user.click(screen.getByRole("button", { name: "Créer" }));
    await waitFor(() => assert.ok(screen.getByRole("group")));
    await user.click(screen.getByRole("link", { name: "Choisis l'origine." }));
    await waitFor(() => assert.equal(document.activeElement?.id, "origin"));
  });

  test("message général du serveur : reste role=alert et n'entre pas dans le récapitulatif", async () => {
    const user = userEvent.setup();
    render(<ClientForm action={async () => ({ message: "Échec du serveur." })} submitLabel="Créer" />);
    await user.click(screen.getByRole("button", { name: "Créer" }));
    await waitFor(() => assert.equal(screen.getByRole("alert").textContent, "Échec du serveur."));
    assert.ok(screen.queryByRole("group") === null);
  });
});
