import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InvoicesPanel } from "../../components/invoices-panel.tsx";
import { QuotesSection } from "../../components/quotes-section.tsx";
import { RuleForm } from "../../components/rule-form.tsx";

// jsdom n'implémente pas `scrollIntoView` (appelé à la fermeture du formulaire de facture).
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  delete (globalThis as { __stubResult?: object }).__stubResult;
});

// Le formulaire remplace le bouton qui l'ouvre : à sa fermeture le focus doit revenir à ce bouton (WCAG 2.4.3).
// Comparaisons par `assert.ok(a === b)` : `assert.equal` sérialiserait les nœuds jsdom en cas d'échec.
const MISSION = { id: "m", title: "Mission", client_id: "c", client_name: "Client" };

const cases = [
  {
    name: "facture",
    open: "Nouvelle facture",
    submit: "Créer la facture",
    view: () => <InvoicesPanel invoices={[]} missions={[MISSION]} quotes={[]} missionId="" today="2026-10-30" emptyText="Aucune" />,
  },
  {
    name: "devis",
    open: "Nouveau devis",
    submit: "Enregistrer le brouillon",
    view: () => <QuotesSection clientId="c" clientStatus="client" quotes={[]} missions={[]} today="2026-10-30" />,
  },
  {
    name: "règle",
    open: "Saisir la règle",
    submit: "Enregistrer (à vérifier)",
    view: () => <RuleForm ruleKey="ceiling_turnover_micro" initialParams={{}} hasVersions={false} />,
  },
];

for (const c of cases) {
  describe(`retour du focus : ${c.name}`, () => {
    test("premier rendu : le focus n'est pas volé", () => {
      render(c.view());
      assert.ok(document.activeElement === document.body);
    });

    test("annuler : le focus revient au bouton d'ouverture", async () => {
      const user = userEvent.setup();
      render(c.view());
      await user.click(screen.getByRole("button", { name: c.open }));
      assert.ok(document.activeElement !== screen.queryByRole("button", { name: c.open }));
      await user.click(screen.getByRole("button", { name: "Annuler" }));
      assert.ok(document.activeElement === screen.getByRole("button", { name: c.open }));
    });

    test("envoi réussi : le focus revient au bouton d'ouverture", async () => {
      const user = userEvent.setup();
      render(c.view());
      await user.click(screen.getByRole("button", { name: c.open }));
      await user.click(screen.getByRole("button", { name: c.submit }));
      await waitFor(() => assert.ok(document.activeElement === screen.getByRole("button", { name: c.open })));
    });
  });
}

describe("retour du focus : cas particuliers", () => {
  for (const c of cases) {
    test(`${c.name} : envoi refusé, le formulaire reste ouvert et le bouton n'est pas rendu`, async () => {
      (globalThis as { __stubResult?: object }).__stubResult = { errors: { amount_ht: "Montant invalide." } };
      const user = userEvent.setup();
      render(c.view());
      await user.click(screen.getByRole("button", { name: c.open }));
      await user.click(screen.getByRole("button", { name: c.submit }));
      await waitFor(() => assert.ok(screen.getByRole("group")));
      assert.ok(screen.queryByRole("button", { name: c.open }) === null);
      assert.ok(document.activeElement === screen.getByRole("group"));
    });

    test(`${c.name} : second cycle ouvrir puis annuler`, async () => {
      const user = userEvent.setup();
      render(c.view());
      for (let i = 0; i < 2; i++) {
        await user.click(screen.getByRole("button", { name: c.open }));
        await user.click(screen.getByRole("button", { name: "Annuler" }));
        assert.ok(document.activeElement === screen.getByRole("button", { name: c.open }), `cycle ${i + 1}`);
      }
    });
  }

  test("règle : après l'enregistrement, « Règle enregistrée » est annoncé", async () => {
    const user = userEvent.setup();
    render(cases[2].view());
    await user.click(screen.getByRole("button", { name: "Saisir la règle" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer (à vérifier)" }));
    await waitFor(() => assert.ok(screen.getByText("Règle enregistrée (à vérifier).")));
  });
});

describe("retour du focus : règle, Échap", () => {
  test("Échap ferme le formulaire et rend le focus au bouton", async () => {
    const user = userEvent.setup();
    render(cases[2].view());
    await user.click(screen.getByRole("button", { name: "Saisir la règle" }));
    await user.keyboard("{Escape}");
    assert.ok(document.activeElement === screen.getByRole("button", { name: "Saisir la règle" }));
  });
});
