import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render } from "@testing-library/react";

import { DeadlinesPanel } from "../../components/deadlines-panel.tsx";

afterEach(cleanup);

const panel = (view: string, display: string) => <DeadlinesPanel deadlines={[]} lines={[]} view={view as never} display={display as never} today="2026-10-29" />;
const spoken = (c: HTMLElement) => c.querySelector('p[role="status"]')?.textContent;

describe("DeadlinesPanel : annonce du changement de vue", () => {
  test("rien au premier rendu ni quand la vue ne change pas ; sinon la nouvelle vue est annoncée", () => {
    const { container, rerender } = render(panel("toutes", "liste"));
    assert.equal(spoken(container), "");
    rerender(panel("toutes", "liste"));
    assert.equal(spoken(container), "", "même vue : aucune annonce");
    rerender(panel("toutes", "kanban"));
    assert.equal(spoken(container), "Affichage : Kanban");
    rerender(panel("mois", "kanban"));
    assert.equal(spoken(container), "Période : Ce mois-ci");
    rerender(panel("semaine", "gantt"));
    assert.equal(spoken(container), "Affichage : Gantt. Période : Cette semaine");
  });
});
