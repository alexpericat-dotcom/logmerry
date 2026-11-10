import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MissionForm } from "../../components/mission-form.tsx";
import { SprintForm } from "../../components/sprint-form.tsx";

afterEach(cleanup);

// Critère de la story 7.2 : libellés associés aux champs et récapitulatif d'erreurs en tête, avec le focus à chaque envoi refusé.
// Ces tests couvrent les deux formulaires qui avaient un récapitulatif sans test propre ; les formulaires de connexion, de mot de passe oublié,
// de nouveau mot de passe et de contact public n'en ont pas (limite connue, chapitre 13).

const CLIENTS = [{ id: "c1", name: "Atelier Lumière (démo)" }];

describe("MissionForm", () => {
  const refuse = async () => ({
    errors: { client_id: "Choisis un client.", title: "Saisis le titre." },
    values: { client_id: "", title: "", status: "in_progress", start_date: "", end_date: "" },
  });

  test("chaque champ a un libellé associé (le libellé nomme le champ)", () => {
    render(<MissionForm action={async () => ({})} clients={CLIENTS} submitLabel="Créer" cancelHref="/missions" />);
    for (const name of ["Client (obligatoire)", "Titre (obligatoire)", "Statut", "Date de début", "Date de fin"]) {
      assert.ok(screen.getByLabelText(name), `champ introuvable par son libellé : ${name}`);
    }
  });

  test("envoi refusé : récapitulatif « 2 erreurs » avec le focus, champs reliés à leur ligne d'erreur", async () => {
    const user = userEvent.setup();
    const { container } = render(<MissionForm action={refuse} clients={CLIENTS} submitLabel="Créer" cancelHref="/missions" />);
    assert.ok(container.querySelector('[role="group"]') === null, "aucun récapitulatif avant l'envoi");
    await user.click(screen.getByRole("button", { name: "Créer" }));
    await waitFor(() => assert.ok(screen.getByText("2 erreurs à corriger")));
    assert.ok(document.activeElement === screen.getByRole("group"), "le focus est sur le récapitulatif");
    const title = screen.getByLabelText("Titre (obligatoire)");
    assert.deepEqual([title.getAttribute("aria-invalid"), title.getAttribute("aria-describedby")], ["true", "title-error"]);
    assert.equal(container.querySelector("#title-error")?.textContent, "Saisis le titre.");
    assert.equal(screen.getByLabelText("Statut").getAttribute("aria-invalid"), null, "un champ sans erreur n'est pas marqué");
  });

  test("un lien du récapitulatif met le focus sur le champ en erreur", async () => {
    const user = userEvent.setup();
    render(<MissionForm action={refuse} clients={CLIENTS} submitLabel="Créer" cancelHref="/missions" />);
    await user.click(screen.getByRole("button", { name: "Créer" }));
    await waitFor(() => assert.ok(screen.getByRole("group")));
    await user.click(screen.getByRole("link", { name: "Saisis le titre." }));
    await waitFor(() => assert.equal(document.activeElement?.id, "title"));
  });
});

describe("SprintForm", () => {
  const refuse = async () => ({
    errors: { name: "Saisis le nom du sprint.", start_date: "Saisis la date de début." },
    values: { name: "", goal: "", start_date: "", end_date: "" },
  });
  const render1 = (action: typeof refuse) => render(<SprintForm idPrefix="sp" action={action} submitLabel="Ajouter" onDone={() => {}} onCancel={() => {}} />);

  test("chaque champ a un libellé associé, avec un préfixe d'identifiant", () => {
    render1(refuse);
    for (const name of ["Nom du sprint (obligatoire)", "Objectif en une phrase", "Début (obligatoire)", "Fin (obligatoire)"]) {
      assert.ok(screen.getByLabelText(name), `champ introuvable par son libellé : ${name}`);
    }
  });

  test("envoi refusé : récapitulatif avec le focus, erreurs en ligne reliées aux champs, sans role=alert", async () => {
    const user = userEvent.setup();
    const { container } = render1(refuse);
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => assert.ok(screen.getByText("2 erreurs à corriger")));
    assert.ok(document.activeElement === screen.getByRole("group"), "le focus est sur le récapitulatif");
    const name = container.querySelector("#sp-name");
    assert.deepEqual([name?.getAttribute("aria-invalid"), name?.getAttribute("aria-describedby")], ["true", "sp-name-error"]);
    const line = container.querySelector("#sp-name-error");
    assert.equal(line?.textContent, "Saisis le nom du sprint.");
    assert.equal(line?.getAttribute("role"), null);
  });

  test("un lien du récapitulatif met le focus sur le champ en erreur", async () => {
    const user = userEvent.setup();
    render1(refuse);
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => assert.ok(screen.getByRole("group")));
    await user.click(screen.getByRole("link", { name: "Saisis la date de début." }));
    await waitFor(() => assert.equal(document.activeElement?.id, "sp-start_date"));
  });
});
