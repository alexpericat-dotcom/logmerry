import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, within } from "@testing-library/react";

import { PortfolioContact, PortfolioFooter, PortfolioHeader, PortfolioHero, PortfolioProcess, PortfolioServices } from "../../components/portfolio-sections.tsx";
import { PortfolioShowcase } from "../../components/portfolio-showcase.tsx";
import { buildCards, type PublicImage, type PublicRealisation } from "../../lib/domain/portfolio.ts";
import { CONTACT_EMAIL, HERO, PROCESS, SERVICES } from "../../lib/portfolio-content.ts";

afterEach(cleanup);

const item = (over: Partial<PublicRealisation> = {}): PublicRealisation => ({
  id: "r1",
  title: "Atelier Nova",
  description: "Landing page de lancement.",
  origin: "training",
  client_label: "Atelier Nova (marque fictive)",
  result_figure: null,
  link_url: "https://ateliernovav3.lovable.app/",
  stack: ["Lovable", "IA générative"],
  published_at: "2026-10-30T10:00:00Z",
  ...over,
});
const img = (id: string, alt: string): PublicImage => ({ id, realisation_id: "r1", path: `u/r1/${id}.png`, alt, created_at: `2026-10-30T10:0${id}:00Z` });
const showcase = (items: PublicRealisation[], images: PublicImage[] = []) => <PortfolioShowcase cards={buildCards(items, images)} supabaseUrl="https://x.supabase.co" />;

describe("réalisations de la page publique", () => {
  test("une carte : titre, description, origine, client, outils, lien externe sûr", () => {
    render(showcase([item()]));
    assert.ok(screen.getByRole("heading", { level: 3, name: "Atelier Nova" }));
    assert.ok(screen.getByText("Formation"));
    assert.ok(screen.getByText("Atelier Nova (marque fictive)"));
    assert.ok(screen.getByText("IA générative"));
    const link = screen.getByRole("link", { name: /Voir la page en ligne/ }) as HTMLAnchorElement;
    assert.equal(link.href, "https://ateliernovav3.lovable.app/");
    assert.equal(link.target, "_blank");
    assert.match(link.rel, /noopener/);
    assert.match(link.rel, /noreferrer/);
  });

  test("captures : chacune avec son texte alternatif, adresses du bucket public", () => {
    render(showcase([item()], [img("1", "Page d'accueil"), img("2", "Formulaire d'inscription")]));
    const cover = screen.getByAltText("Page d'accueil") as HTMLImageElement;
    assert.equal(cover.src, "https://x.supabase.co/storage/v1/object/public/portfolio/u/r1/1.png");
    assert.ok(screen.getByAltText("Formulaire d'inscription"));
  });

  test("sans capture : un aplat avec le titre, caché des lecteurs d'écran (pas d'image sans alternative)", () => {
    render(showcase([item()]));
    assert.equal(screen.queryAllByRole("img").length, 0);
  });

  test("un lien qui n'est pas en https n'est jamais rendu (javascript:, http:)", () => {
    for (const link_url of ["javascript:alert(1)", "http://exemple.fr", null]) {
      render(showcase([item({ link_url })]));
      assert.equal(screen.queryByRole("link", { name: /Voir la page en ligne/ }), null, String(link_url));
      cleanup();
    }
  });

  test("résultat affiché seulement s'il est fourni ; un titre piégé reste du texte", () => {
    render(showcase([item({ result_figure: "-30 % de saisie", title: "<img src=x onerror=alert(1)>" })]));
    assert.ok(screen.getByText("Résultat : -30 % de saisie"));
    assert.ok(screen.getByRole("heading", { level: 3 }).textContent === "<img src=x onerror=alert(1)>");
    cleanup();
    render(showcase([item()]));
    assert.equal(screen.queryByText(/Résultat/), null);
  });

  test("aucune réalisation : un message sobre, pas de liste vide", () => {
    render(showcase([]));
    assert.match(screen.getByText(/premières réalisations arrivent/).textContent ?? "", /bientôt/);
    assert.equal(screen.queryByRole("list"), null);
  });
});

describe("sections de la page", () => {
  test("un seul titre de niveau 1 (l'accroche) ; contact en mailto avec l'adresse donnée", () => {
    render(
      <>
        <PortfolioHeader />
        <PortfolioHero />
        <PortfolioServices />
        <PortfolioProcess />
        <PortfolioContact />
        <PortfolioFooter />
      </>,
    );
    const h1 = screen.getAllByRole("heading", { level: 1 });
    assert.equal(h1.length, 1);
    assert.equal(h1[0].textContent, HERO.title);
    const mails = screen.getAllByRole("link", { name: /M'écrire|alexandre/ }) as HTMLAnchorElement[];
    assert.ok(mails.length >= 3);
    for (const a of mails) assert.ok(a.href.startsWith(`mailto:${CONTACT_EMAIL}`), a.href);
  });

  test("chaque formule est une carte titrée dans la section « Offre » ; les cinq étapes forment une liste ordonnée", () => {
    const { container } = render(
      <>
        <PortfolioServices />
        <PortfolioProcess />
      </>,
    );
    const services = within(container.querySelector("#services") as HTMLElement);
    for (const s of SERVICES.items) assert.ok(services.getByRole("heading", { level: 3, name: s.title }), s.title);
    assert.equal(container.querySelectorAll("#methode ol > li").length, PROCESS.steps.length);
  });

  test("le décor flottant est caché des lecteurs d'écran", () => {
    const { container } = render(<PortfolioHero />);
    const floating = container.querySelectorAll(".float-slow");
    assert.ok(floating.length > 0);
    for (const el of floating) assert.ok(el.closest("[aria-hidden=true]"), "formule décorative accessible aux lecteurs d'écran");
  });
});
