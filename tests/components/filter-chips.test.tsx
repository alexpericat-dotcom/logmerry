import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen } from "@testing-library/react";

import { FilterChips } from "../../components/filter-chips.tsx";
import { clientsHref, parseClientView } from "../../lib/domain/clients.ts";

afterEach(cleanup);

describe("FilterChips", () => {
  test("le filtre actif porte aria-current, les autres non ; les adresses sont celles données", () => {
    render(
      <FilterChips
        label="Filtrer par statut"
        items={[
          { label: "Tous", href: "/clients", active: false },
          { label: "Prospects", href: "/clients?statut=prospect", active: true },
        ]}
      />,
    );
    assert.equal(screen.getByRole("link", { name: "Prospects" }).getAttribute("aria-current"), "page");
    assert.equal(screen.getByRole("link", { name: "Tous" }).getAttribute("aria-current"), null);
    assert.equal(screen.getByRole("link", { name: "Prospects" }).getAttribute("href"), "/clients?statut=prospect");
    assert.ok(screen.getByRole("navigation", { name: "Filtrer par statut" }));
  });

  test("« Devis en attente » : inactif il active le filtre, actif il le retire en gardant les autres filtres", () => {
    const toggle = (query: Record<string, string>) => {
      const view = parseClientView(query);
      render(<FilterChips label="Filtrer par devis" items={[{ label: "Devis en attente", href: clientsHref({ ...view, devis: !view.devis }), active: view.devis }]} />);
      const link = screen.getByRole("link", { name: "Devis en attente" });
      const out = [link.getAttribute("href"), link.getAttribute("aria-current")];
      cleanup();
      return out;
    };
    assert.deepEqual(toggle({ statut: "prospect" }), ["/clients?statut=prospect&devis=attente", null]);
    assert.deepEqual(toggle({ statut: "prospect", devis: "attente" }), ["/clients?statut=prospect", "page"]);
  });
});
