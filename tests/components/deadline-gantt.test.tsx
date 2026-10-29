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

  test("Échap dans une confirmation de suppression : la confirmation se ferme, la fiche reste", async () => {
    const user = userEvent.setup();
    show();
    await user.click(milestone());
    await waitFor(() => assert.ok(screen.getByRole("region", { name: "Fiche de l'échéance" })));
    const record = screen.getByRole("region", { name: "Fiche de l'échéance" });
    const del = [...record.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Supprimer")) as HTMLElement;
    await user.click(del);
    await waitFor(() => assert.ok([...record.querySelectorAll("button")].some((b) => b.textContent === "Supprimer")));
    await user.keyboard("{Escape}");
    await waitFor(() => assert.ok(![...record.querySelectorAll("button")].some((b) => b.textContent === "Supprimer")));
    assert.ok(screen.queryByRole("region", { name: "Fiche de l'échéance" }) !== null, "la fiche est restée ouverte");
  });

  test("cibles tactiles : le jalon a min-h-11 au téléphone et la ligne un niveau en variable CSS", () => {
    show();
    assert.match(milestone().className, /max-md:min-h-11/);
    const row = milestone().closest("div.relative") as HTMLElement;
    assert.match(row.className, /max-md:\[--lane-px:44px\]/);
    assert.match(row.getAttribute("style") ?? "", /calc\(var\(--lane-px\) \* \d+ \+ 12px\)/);
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
