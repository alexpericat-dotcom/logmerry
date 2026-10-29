import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ErrorLine, ErrorSummary, FocusOnMount, focusField, selectClass, selectClassTruncate, useFormFields, useMoreFields } from "../../components/form-helpers.tsx";

afterEach(cleanup);

const raf = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

describe("ErrorLine et useFormFields", () => {
  test("ligne d'erreur : `${id}-error`, le message, sans role=alert ; rien sans message", () => {
    const { container, rerender } = render(<ErrorLine id="new-title" message="Saisis le titre." />);
    const p = container.querySelector("p");
    assert.equal(p?.id, "new-title-error");
    assert.equal(p?.textContent, "Saisis le titre.");
    assert.equal(p?.getAttribute("role"), null);
    rerender(<ErrorLine id="new-title" message={undefined} />);
    assert.ok(container.querySelector("p") === null);
  });

  test("field et errorLine d'un formulaire : mêmes attributs que les helpers recopiés (id, name, aria-invalid, aria-describedby, valeur par défaut)", () => {
    function Probe({ errors }: { errors: { title?: string; note?: string } }) {
      const { field, errorLine } = useFormFields("e1", errors, { title: "Déjà saisi", note: "" });
      return (
        <div>
          <input {...field("title")} />
          {errorLine("title")}
          <input {...field("note")} />
        </div>
      );
    }
    const { container, rerender } = render(<Probe errors={{}} />);
    const [title, note] = Array.from(container.querySelectorAll("input"));
    assert.deepEqual([title.id, title.name, title.value, title.getAttribute("aria-invalid"), title.getAttribute("aria-describedby")], ["e1-title", "title", "Déjà saisi", null, null]);
    assert.equal(note.id, "e1-note");
    rerender(<Probe errors={{ title: "Saisis le titre." }} />);
    const t = container.querySelector<HTMLInputElement>("#e1-title")!;
    assert.deepEqual([t.getAttribute("aria-invalid"), t.getAttribute("aria-describedby")], ["true", "e1-title-error"]);
    assert.equal(container.querySelector("#e1-title-error")?.textContent, "Saisis le titre.");
  });

  test("les deux variantes de menu gardent leurs utilitaires ; seule la variante tronquée a `truncate`", () => {
    assert.ok(!selectClass.split(" ").includes("truncate"));
    assert.ok(selectClassTruncate.split(" ").includes("truncate"));
    assert.deepEqual(selectClassTruncate.split(" ").filter((c) => c !== "truncate").sort(), selectClass.split(" ").sort());
  });
});

describe("ErrorSummary", () => {
  const errors = { title: "Saisis le titre.", due_on: "Saisis la date." };
  const view = (token: unknown, e: Record<string, string | undefined> | undefined = errors) => (
    <div>
      <ErrorSummary errors={e} prefix="new" token={token} />
      <input id="new-title" />
      <input id="new-due_on" />
    </div>
  );

  test("sans erreur : rien ; avec erreurs : titre « N erreurs à corriger » et un lien par erreur", () => {
    const { container, rerender } = render(view({}, {}));
    assert.ok(container.querySelector('[role="group"]') === null);
    rerender(view({}));
    assert.ok(screen.getByText("2 erreurs à corriger"));
    assert.deepEqual(screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]), [["Saisis le titre.", "#new-title"], ["Saisis la date.", "#new-due_on"]]);
    rerender(view({}, { title: "Saisis le titre." }));
    assert.ok(screen.getByText("1 erreur à corriger"));
  });

  test("le focus va au récapitulatif à chaque envoi refusé (nouveau `token`), même avec les mêmes erreurs", () => {
    const { rerender } = render(view("a"));
    const box = screen.getByRole("group");
    assert.ok(document.activeElement === box);
    (document.activeElement as HTMLElement).blur();
    rerender(view("b"));
    assert.ok(document.activeElement === screen.getByRole("group"));
  });

  test("un lien met le focus sur son champ et ne change pas l'adresse", async () => {
    const user = userEvent.setup();
    render(view("a"));
    await user.click(screen.getByRole("link", { name: "Saisis la date." }));
    await raf();
    assert.equal(document.activeElement?.id, "new-due_on");
  });

  test("un champ replié est ouvert (`reveal`) avant de recevoir le focus", async () => {
    const reveal = mock.fn();
    const user = userEvent.setup();
    render(<ErrorSummary errors={{ note: "Note trop longue." }} prefix="x" token="a" reveal={reveal} />);
    await user.click(screen.getByRole("link", { name: "Note trop longue." }));
    assert.deepEqual(reveal.mock.calls.map((c) => c.arguments[0]), ["note"]);
  });

  test("focusField : champ introuvable sans erreur", () => {
    assert.doesNotThrow(() => focusField("absent"));
  });
});

describe("useMoreFields (« Plus de champs »)", () => {
  function More({ errors, hidden }: { errors: object | undefined; hidden: boolean }) {
    const [open, setOpen] = useMoreFields(false, errors, hidden);
    return (
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Plus de champs
      </button>
    );
  }
  const expanded = () => screen.getByRole("button").getAttribute("aria-expanded");

  test("fermé au départ ; une erreur qui arrive dans un champ replié l'ouvre ; le bouton peut ensuite le refermer", async () => {
    const user = userEvent.setup();
    const first = { note: "Trop long." };
    const { rerender } = render(<More errors={undefined} hidden={false} />);
    assert.equal(expanded(), "false");
    rerender(<More errors={first} hidden={true} />);
    assert.equal(expanded(), "true");
    await user.click(screen.getByRole("button"));
    assert.equal(expanded(), "false", "replié malgré l'erreur affichée");
    rerender(<More errors={first} hidden={true} />); // même réponse : pas de réouverture
    assert.equal(expanded(), "false");
    rerender(<More errors={{ note: "Trop long." }} hidden={true} />); // nouvel envoi refusé : s'ouvre de nouveau
    assert.equal(expanded(), "true");
  });

  test("une erreur dans un champ déjà visible n'ouvre pas le bloc", () => {
    const { rerender } = render(<More errors={undefined} hidden={false} />);
    rerender(<More errors={{ title: "Obligatoire." }} hidden={false} />);
    assert.equal(expanded(), "false");
  });
});

describe("FocusOnMount", () => {
  test("au montage, le premier champ visible et actif reçoit le focus (pas un champ caché ni désactivé)", () => {
    const { container } = render(
      <FocusOnMount>
        <form>
          <input type="hidden" name="h" />
          <input name="off" disabled />
          <input name="premier" />
          <input name="second" />
        </form>
      </FocusOnMount>,
    );
    assert.ok(document.activeElement === container.querySelector('input[name="premier"]'));
  });

  test("un menu en premier reçoit aussi le focus ; sans champ, rien ne plante et le focus ne bouge pas", () => {
    const first = render(
      <FocusOnMount>
        <select name="s">
          <option>a</option>
        </select>
      </FocusOnMount>,
    );
    assert.ok(document.activeElement === first.container.querySelector("select"));
    cleanup();
    render(
      <FocusOnMount>
        <p>aucun champ</p>
      </FocusOnMount>,
    );
    assert.ok(document.activeElement === document.body);
  });

  test("saute un champ en lecture seule, une case et un bouton : le premier vrai champ de saisie reçoit le focus ; une zone de texte compte", () => {
    const { container } = render(
      <FocusOnMount>
        <form>
          <input name="lecture" readOnly />
          <input type="checkbox" name="case" />
          <input type="submit" value="ok" />
          <textarea name="texte" />
        </form>
      </FocusOnMount>,
    );
    assert.ok(document.activeElement === container.querySelector("textarea"));
  });

  test("l'effet ne joue qu'au montage : un nouveau rendu ne reprend pas le focus à l'utilisateur", () => {
    const view = (extra: string) => (
      <FocusOnMount>
        <form>
          <input name="a" />
          <input name="b" />
          <p>{extra}</p>
        </form>
      </FocusOnMount>
    );
    const { container, rerender } = render(view("un"));
    const b = container.querySelector<HTMLInputElement>('input[name="b"]')!;
    b.focus();
    rerender(view("deux"));
    assert.ok(document.activeElement === b);
  });
});
