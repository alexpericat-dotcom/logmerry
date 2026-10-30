import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  PortfolioContact,
  PortfolioFooter,
  PortfolioHeader,
  PortfolioHero,
  PortfolioLever,
  PortfolioMarquee,
  PortfolioProcess,
  PortfolioServices,
  PortfolioSkills,
} from "../../components/portfolio-sections.tsx";
import { PortfolioShowcase } from "../../components/portfolio-showcase.tsx";
import { buildCards, type PublicImage, type PublicRealisation } from "../../lib/domain/portfolio.ts";
import { CONTACT_EMAIL, HERO, LEVER, PROCESS, SERVICES, SKILLS } from "../../lib/portfolio-content.ts";

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
    const link = screen.getByRole("link", { name: /Ouvrir le site/ }) as HTMLAnchorElement;
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

  test("sans capture : un aplat avec le titre, caché des lecteurs d'écran ; aucune balise img sans texte alternatif", () => {
    const { container } = render(showcase([item()]));
    assert.equal(container.querySelectorAll("img").length, 0);
    const flat = [...container.querySelectorAll("[aria-hidden=true]")].find((el) => el.textContent === "Atelier Nova");
    assert.ok(flat, "l'aplat porte le titre et aria-hidden");
    assert.equal(container.querySelectorAll("img:not([alt]), img[alt='']").length, 0);
  });

  test("une capture qui ne se charge pas est remplacée par un aplat sobre avec son texte alternatif (pas d'icône cassée)", () => {
    const { container } = render(showcase([item()], [img("1", "Page d'accueil")]));
    fireEvent.error(screen.getByAltText("Page d'accueil"));
    assert.equal(container.querySelectorAll("img").length, 0);
    assert.ok(screen.getByRole("img", { name: "Page d'accueil" }));
  });

  test("sans adresse de stockage configurée : aucune capture n'est tentée (la page ne tombe pas en erreur)", () => {
    const { container } = render(<PortfolioShowcase cards={buildCards([item()], [img("1", "Page d'accueil")])} supabaseUrl="" />);
    assert.equal(container.querySelectorAll("img").length, 0);
    assert.ok(screen.getByRole("heading", { level: 3, name: "Atelier Nova" }));
  });

  test("lien avec identifiants dans l'adresse : jamais rendu", () => {
    render(showcase([item({ link_url: "https://user:mdp@exemple.fr/" })]));
    assert.equal(screen.queryByRole("link", { name: /Ouvrir le site/ }), null);
  });

  test("textes très longs (mot sans espace) : cassés plutôt que de déborder", () => {
    const { container } = render(showcase([item({ description: "x".repeat(600), client_label: "y".repeat(200), result_figure: "z".repeat(200), stack: ["w".repeat(40)] })]));
    const long = [...container.querySelectorAll("p, li, span")].filter((el) => el.children.length === 0 && /^[xyzw]{40,}$|Résultat : z+/.test(el.textContent ?? ""));
    assert.ok(long.length >= 2, "les textes longs sont bien rendus");
    for (const el of long) assert.match(el.closest("[class*=break-]")?.className ?? "", /break-(words|all)/, (el.textContent ?? "").slice(0, 12));
  });

  test("un lien qui n'est pas en https n'est jamais rendu (javascript:, http:)", () => {
    for (const link_url of ["javascript:alert(1)", "http://exemple.fr", null]) {
      render(showcase([item({ link_url })]));
      assert.equal(screen.queryByRole("link", { name: /Ouvrir le site/ }), null, String(link_url));
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
  const page = () => (
    <>
      <PortfolioHeader />
      <PortfolioHero />
      <PortfolioMarquee />
      <PortfolioLever />
      <PortfolioProcess />
      <PortfolioServices />
      <PortfolioSkills />
      <PortfolioContact />
      <PortfolioFooter />
    </>
  );

  test("un seul titre de niveau 1 (l'accroche) ; contact en mailto avec l'adresse donnée", () => {
    render(page());
    const h1 = screen.getAllByRole("heading", { level: 1 });
    assert.equal(h1.length, 1);
    assert.equal(h1[0].textContent, HERO.title);
    const mails = screen.getAllByRole("link", { name: /M'écrire|Parler de votre problème|alexandre/ }) as HTMLAnchorElement[];
    assert.ok(mails.length >= 4);
    for (const a of mails) assert.ok(a.href.startsWith(`mailto:${CONTACT_EMAIL}`), a.href);
  });

  test("les six étapes forment une liste ordonnée titrée ; les cinq formules sont des cartes titrées", () => {
    const { container } = render(page());
    const steps = container.querySelectorAll("#methode ol > li");
    assert.equal(steps.length, PROCESS.steps.length);
    for (const s of PROCESS.steps) assert.ok(within(container.querySelector("#methode") as HTMLElement).getByRole("heading", { level: 3, name: s.title }), s.title);
    const services = within(container.querySelector("#services") as HTMLElement);
    for (const s of SERVICES.items) assert.ok(services.getByRole("heading", { level: 3, name: s.title }), s.title);
  });

  test("le positionnement : la phrase barrée et la phrase mise en avant sont toutes deux présentes", () => {
    render(page());
    assert.ok(screen.getByText(LEVER.before));
    assert.ok(screen.getByText(LEVER.after));
  });

  test("outils : chaque outil est listé ; le bandeau défilant n'est lu qu'une fois par les lecteurs d'écran", () => {
    const { container } = render(page());
    for (const g of SKILLS.groups) for (const item of g.items) assert.ok(screen.getAllByText(item).length >= 1, item);
    const rows = [...container.querySelectorAll(".marquee-track > ul")];
    assert.equal(rows.length, 4, "deux moitiés identiques de deux rangées : la boucle reste pleine sur un grand écran");
    assert.equal(rows[0].getAttribute("aria-hidden"), null);
    assert.ok(!rows[0].classList.contains("marquee-dup"));
    for (const copy of rows.slice(1)) {
      assert.equal(copy.getAttribute("aria-hidden"), "true");
      assert.ok(copy.classList.contains("marquee-dup"), "la copie porte la classe que le CSS masque en mouvement réduit");
    }
  });

  test("le décor flottant et le schéma animé sont cachés des lecteurs d'écran", () => {
    const { container } = render(<PortfolioHero />);
    const decor = container.querySelectorAll(".float-slow, .pipe-dot");
    assert.ok(decor.length > 0);
    for (const el of decor) assert.ok(el.closest("[aria-hidden=true]"), "élément décoratif accessible aux lecteurs d'écran");
  });
});

type Seen = { callback: (entries: unknown[]) => void; options?: { rootMargin?: string }; disconnected: boolean };
const seen = (kind: "__intersections" | "__resizes") => ((globalThis as Record<string, unknown>)[kind] ?? []) as Seen[];

describe("aperçu en direct d'une réalisation", () => {
  const withLink = (images: PublicImage[] = [], link_url: string | null = "https://ateliernovav3.lovable.app/") => showcase([item({ link_url })], images);
  /** Ce que fait le navigateur : le rappel est appelé dès l'observation (souvent avec « pas encore visible »), puis à l'entrée à l'écran. */
  const intersect = (isIntersecting: boolean) =>
    act(() => {
      for (const o of seen("__intersections")) if (!o.disconnected) o.callback([{ isIntersecting }]);
    });
  const resize = (width: number) =>
    act(() => {
      for (const o of seen("__resizes")) o.callback([{ contentRect: { width } }]);
    });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__intersections;
    delete (globalThis as Record<string, unknown>).__resizes;
    delete (navigator as unknown as Record<string, unknown>).connection;
  });

  test("sans capture : rien n'est chargé tant que la carte n'est pas visible (un rappel « pas encore » ne charge rien) ; puis le site se charge", () => {
    const { container } = render(withLink());
    intersect(false);
    assert.equal(container.querySelectorAll("iframe").length, 0);
    intersect(true);
    assert.equal((container.querySelector("iframe") as HTMLIFrameElement).src, "https://ateliernovav3.lovable.app/");
  });

  test("le chargement commence 300 px avant l'écran, et l'observateur est libéré dès que le site est chargé", () => {
    render(withLink());
    const [observer] = seen("__intersections");
    assert.equal(observer.options?.rootMargin, "300px");
    intersect(true);
    assert.equal(observer.disconnected, true);
  });

  test("quitter la page libère les observateurs", () => {
    const { unmount } = render(withLink());
    unmount();
    for (const o of [...seen("__intersections"), ...seen("__resizes")]) assert.equal(o.disconnected, true);
  });

  test("cadre isolé : liste exacte des droits du sandbox, aucune permission déléguée, aucun référent, chargement différé", () => {
    const { container } = render(withLink());
    intersect(true);
    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    assert.deepEqual((frame.getAttribute("sandbox") ?? "").split(" ").sort(), ["allow-same-origin", "allow-scripts"]);
    assert.equal(frame.getAttribute("allow"), "");
    assert.equal(frame.getAttribute("referrerpolicy"), "no-referrer");
    assert.equal(frame.getAttribute("loading"), "lazy");
    assert.match(frame.title, /Aperçu en direct/);
  });

  test("aperçu automatique : non interactif et hors de la tabulation ; l'affiche reste visible jusqu'à la réponse du site", () => {
    const { container } = render(withLink());
    intersect(true);
    resize(640);
    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    assert.equal(frame.getAttribute("tabindex"), "-1");
    assert.equal(frame.style.pointerEvents, "none");
    assert.equal(frame.style.visibility, "hidden", "caché tant que le site n'a pas répondu");
    const poster = [...container.querySelectorAll("[aria-hidden=true]")].find((el) => el.textContent === "Atelier Nova");
    assert.ok(poster, "l'affiche (aplat avec le titre) est toujours dans la page, sous le cadre");
    fireEvent.load(frame);
    assert.equal(frame.style.visibility, "visible");
    assert.match(frame.style.transform, /scale\(0\.5\)/, "1280 px réduits à la largeur de la carte (640 px)");
  });

  test("avec capture : la capture sert d'affiche, le site ne se charge qu'au clic, et il est alors interactif", async () => {
    const { container } = render(withLink([img("1", "Page d'accueil")]));
    intersect(true);
    assert.equal(container.querySelectorAll("iframe").length, 0, "pas de chargement automatique quand une capture existe");
    assert.ok(screen.getByAltText("Page d'accueil"));
    await userEvent.click(screen.getByRole("button", { name: /Voir en direct/ }));
    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    assert.equal(frame.src, "https://ateliernovav3.lovable.app/");
    assert.equal(frame.getAttribute("tabindex"), null);
    assert.equal(frame.style.pointerEvents, "auto");
  });

  test("seule la première carte sans capture se charge toute seule ; les suivantes attendent le clic (pas de site tiers chargé sans choix du visiteur)", () => {
    const two = [item({ id: "r1", published_at: "2026-10-30T10:00:00Z" }), item({ id: "r2", title: "Second", published_at: "2026-10-29T10:00:00Z" })];
    const { container } = render(<PortfolioShowcase cards={buildCards(two, [])} supabaseUrl="https://x.supabase.co" />);
    intersect(true);
    assert.equal(container.querySelectorAll("iframe").length, 1);
    assert.equal(screen.getAllByRole("button", { name: /Voir en direct/ }).length, 1);
  });

  test("mode « économie de données » : aucun chargement automatique", () => {
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } });
    const { container } = render(withLink());
    assert.equal(seen("__intersections").length, 0, "aucun observateur d'intersection créé");
    assert.equal(container.querySelectorAll("iframe").length, 0);
  });

  test("adresses dangereuses : ni cadre, ni bouton, ni adresse dans la barre, avec ou sans capture", () => {
    for (const link of ["http://exemple.fr", "javascript:alert(1)", "https://user:mdp@exemple.fr/", "data:text/html,x", "//exemple.fr", null]) {
      for (const images of [[], [img("1", "Page")]]) {
        const { container } = render(withLink(images, link));
        intersect(true);
        assert.equal(container.querySelectorAll("iframe").length, 0, String(link));
        assert.equal(screen.queryByRole("button", { name: /Voir en direct/ }), null, String(link));
        assert.equal(container.querySelector("[class*=truncate]"), null, `adresse affichée pour ${String(link)}`);
        cleanup();
      }
    }
  });

  test("l'adresse du site est affichée dans la barre du cadre de navigateur", () => {
    render(withLink());
    assert.ok(screen.getByText("ateliernovav3.lovable.app"));
  });
});

describe("pause des animations", () => {
  test("le bouton de l'en-tête met en pause puis reprend (état annoncé, drapeau posé sur la page)", async () => {
    render(<PortfolioHeader />);
    const toggle = screen.getByRole("button", { name: "Mettre en pause les animations" });
    assert.equal(toggle.getAttribute("aria-pressed"), "false");
    await userEvent.click(toggle);
    assert.equal(document.documentElement.dataset.motion, "paused");
    const resume = screen.getByRole("button", { name: "Reprendre les animations" });
    assert.equal(resume.getAttribute("aria-pressed"), "true");
    await userEvent.click(resume);
    assert.equal(document.documentElement.dataset.motion, undefined);
  });
});
