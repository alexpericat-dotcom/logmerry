import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeadlineGantt } from "../../components/deadline-gantt.tsx";

afterEach(cleanup);

const deadline = {
  id: "d1",
  title: "Déclaration de TVA",
  due_on: "2026-11-10",
  category: "tax",
  source: "https://www.service-public.fr/",
  note: null,
  done_at: null,
  created_at: "2026-10-01T10:00:00Z",
  priority: "normal",
  recurrence: null,
  series_id: null,
  series_day: null,
};

const show = () => render(<DeadlineGantt deadlines={[deadline as never]} lines={[]} today="2026-10-29" onChanged={() => {}} />);
const milestone = () => screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null) as HTMLElement;

describe("DeadlineGantt : fiche d'un jalon", () => {
  test("Échap ferme la fiche et rend le focus au jalon", async () => {
    const user = userEvent.setup();
    show();
    await user.click(milestone());
    await waitFor(() => assert.ok(screen.getByRole("region", { name: "Fiche de l'échéance" })));
    await waitFor(() => assert.equal(document.activeElement?.id, "gantt-record-title"));
    await user.keyboard("{Escape}");
    await waitFor(() => assert.ok(screen.queryByRole("region", { name: "Fiche de l'échéance" }) === null));
    await waitFor(() => assert.ok(document.activeElement === milestone()));
  });

  test("Échap sans fiche ouverte : rien ne se passe", async () => {
    const user = userEvent.setup();
    show();
    milestone().focus();
    await user.keyboard("{Escape}");
    assert.equal(milestone().getAttribute("aria-expanded"), "false");
    assert.ok(document.activeElement === milestone());
  });
});
