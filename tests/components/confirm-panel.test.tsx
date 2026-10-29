import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmPanel } from "../../components/confirm-panel.tsx";

afterEach(cleanup);

const setup = (props: Partial<Parameters<typeof ConfirmPanel>[0]> = {}) => {
  const onCancel = mock.fn();
  const onConfirm = mock.fn();
  const user = userEvent.setup();
  const view = render(<ConfirmPanel label="Supprimer la facture F-1" question="Supprimer cette facture ?" pending={false} onCancel={onCancel} onConfirm={onConfirm} {...(props as object)} />);
  return { user, onCancel, onConfirm, ...view };
};
const cancelButton = () => screen.getByRole("button", { name: "Annuler" });

describe("ConfirmPanel", () => {
  test("ouverture : « Annuler » a le focus (le choix sûr), le groupe porte le nom donné", () => {
    setup();
    assert.ok(document.activeElement === cancelButton());
    assert.ok(screen.getByRole("group", { name: "Supprimer la facture F-1" }));
  });

  test("Échap ferme une fois ; pendant l'action, Échap est ignorée", async () => {
    const a = setup();
    await a.user.keyboard("{Escape}");
    assert.equal(a.onCancel.mock.callCount(), 1);
    cleanup();
    const b = setup({ pending: true });
    await b.user.keyboard("{Escape}");
    assert.equal(b.onCancel.mock.callCount(), 0);
  });

  test("stopEscape : le parent qui lit Échap n'est pas averti ; sans lui, il l'est", async () => {
    for (const [stopEscape, heard] of [[true, 0], [false, 1]] as const) {
      const parent = mock.fn();
      const onCancel = mock.fn();
      const user = userEvent.setup();
      render(
        <div onKeyDown={parent}>
          <ConfirmPanel label="x" question="?" pending={false} onCancel={onCancel} onConfirm={() => {}} stopEscape={stopEscape} />
        </div>,
      );
      await user.keyboard("{Escape}");
      assert.equal(onCancel.mock.callCount(), 1);
      assert.equal(parent.mock.callCount(), heard, `stopEscape=${stopEscape}`);
      cleanup();
    }
  });

  test("clic « Annuler » : ferme ; pendant l'action, ignoré, le bouton garde le focus et signale aria-disabled", async () => {
    const a = setup();
    await a.user.click(cancelButton());
    assert.equal(a.onCancel.mock.callCount(), 1);
    cleanup();
    const b = setup({ pending: true });
    await b.user.click(cancelButton());
    assert.equal(b.onCancel.mock.callCount(), 0);
    assert.equal(cancelButton().getAttribute("aria-disabled"), "true");
    assert.ok(document.activeElement === cancelButton()); // jamais `disabled` : le focus ne se perd pas
  });

  test("confirmer (onConfirm) : appelé une fois ; pendant l'action, libellé « en cours », aria-disabled, aucun appel", async () => {
    const a = setup();
    await a.user.click(screen.getByRole("button", { name: "Oui, supprimer" }));
    assert.equal(a.onConfirm.mock.callCount(), 1);
    cleanup();
    const b = setup({ pending: true });
    const busy = screen.getByRole("button", { name: "Suppression…" });
    assert.equal(busy.getAttribute("aria-disabled"), "true");
    assert.equal((busy as HTMLButtonElement).disabled, false); // jamais `disabled` : le bouton qui a le focus ne le perd pas
    await b.user.click(busy);
    assert.equal(b.onConfirm.mock.callCount(), 0);
  });

  test("pas d'envoi natif : l'envoi du formulaire (onConfirm) et Échap sont interceptés (preventDefault)", () => {
    const { onCancel, onConfirm } = setup();
    const group = screen.getByRole("group");
    const submit = createEvent.submit(group);
    fireEvent(group, submit);
    assert.equal(submit.defaultPrevented, true);
    assert.equal(onConfirm.mock.callCount(), 1);
    const escape = createEvent.keyDown(group, { key: "Escape" });
    fireEvent(group, escape);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(onCancel.mock.callCount(), 1);
  });

  test("confirmer (action) : le bouton est `disabled` pendant l'action, actif sinon", () => {
    setup({ onConfirm: undefined, action: () => {}, pending: true } as never);
    assert.equal((screen.getByRole("button", { name: "Suppression…" }) as HTMLButtonElement).disabled, true);
    cleanup();
    setup({ onConfirm: undefined, action: () => {}, pending: false } as never);
    assert.equal((screen.getByRole("button", { name: "Oui, supprimer" }) as HTMLButtonElement).disabled, false);
  });

  test("erreur : annoncée dans un role=alert, absente sans erreur", () => {
    setup({ error: "Échec de la suppression." });
    assert.equal(screen.getByRole("alert").textContent, "Échec de la suppression.");
    cleanup();
    setup();
    assert.equal(screen.queryByRole("alert"), null);
  });

  test("description : aria-describedby vers le texte quand il y a des enfants, absent sinon", () => {
    setup({ children: "Cette action est définitive." });
    const group = screen.getByRole("group");
    const id = group.getAttribute("aria-describedby");
    assert.ok(id);
    assert.equal(document.getElementById(id)?.textContent, "Cette action est définitive.");
    cleanup();
    setup();
    assert.equal(screen.getByRole("group").getAttribute("aria-describedby"), null);
  });
});
