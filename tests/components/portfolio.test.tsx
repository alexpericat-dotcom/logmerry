import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  PortfolioContact,
  PortfolioFooter,
  PortfolioHeader,
  PortfolioHero,
  PortfolioLever,
  PortfolioProcess,
  PortfolioServices,
  PortfolioStack,
} from "../../components/portfolio-sections.tsx";
import { PortfolioShowcase } from "../../components/portfolio-showcase.tsx";
import { ScrollEffects } from "../../components/scroll-effects.tsx";
import { DOSSIER_IMAGES } from "../../components/dossier-images.ts";
import { PortfolioShowcaseFilter } from "../../components/portfolio-showcase-filter.tsx";
import { SKETCH_NAMES, Sketch } from "../../components/sketches.tsx";
import { buildCards, type PublicImage, type PublicRealisation } from "../../lib/domain/portfolio.ts";
import { CONTACT_EMAIL, HEADER, HERO, LEVER, PROCESS, SERVICES, SHOWCASE, STACK, VALIDATED_TOOLS } from "../../lib/portfolio-content.ts";
import { DOSSIERS, UMARIS_ID } from "../../lib/portfolio-dossiers.ts";
import { toPublicCards } from "../../lib/domain/portfolio.ts";

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
  status: "exercice_formation",
  problem: null,
  tests: null,
  design_choice: null,
  validation: null,
  stack_is_recommended: false,
  ...over,
});
const img = (id: string, alt: string): PublicImage => ({ id, realisation_id: "r1", path: `u/r1/${id}.png`, alt, created_at: `2026-10-30T10:0${id}:00Z` });
const showcase = (items: PublicRealisation[], images: PublicImage[] = []) => <PortfolioShowcase cards={buildCards(items, images)} supabaseUrl="https://x.supabase.co" />;

describe("réalisations de la page publique", () => {
  test("une carte : titre, description, origine, client, outils, lien externe sûr", () => {
    render(showcase([item()]));
    assert.ok(screen.getByRole("heading", { level: 3, name: "Atelier Nova" }));
    assert.ok(screen.getByText("Exercice de formation"), "la pastille de statut");
    assert.equal(screen.getAllByText("Atelier Nova (marque fictive)").length, 2, "une ligne de situation dans le résumé, et le relevé");
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
    const long = [...container.querySelectorAll("dd, li, span")].filter((el) => el.children.length === 0 && /^[xyzw]{40,}$/.test(el.textContent ?? ""));
    assert.ok(long.length >= 4, "les textes longs sont bien rendus");
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
    assert.ok(screen.getByText("-30 % de saisie"));
    assert.equal(screen.getByText("-30 % de saisie").previousElementSibling?.textContent, SHOWCASE.fields.result, "étiquette neutre « Résultat » : le chiffre n'est pas forcément une durée");
    assert.ok(screen.getByRole("heading", { level: 3 }).textContent === "<img src=x onerror=alert(1)>");
    cleanup();
    render(showcase([item()]));
    assert.equal(screen.queryByText(SHOWCASE.fields.result), null);
  });

  test("« Choix de conception » et « Validation » : affichés seulement s'ils sont fournis, et la validation reste distincte du résultat", () => {
    render(showcase([item()]));
    assert.equal(screen.queryByText(SHOWCASE.fields.designChoice), null);
    assert.equal(screen.queryByText(SHOWCASE.fields.validation), null);
    cleanup();
    render(showcase([item({ design_choice: "Une base relationnelle.", validation: "Validé en formation.", result_figure: "Inscriptions automatisées" })]));
    assert.equal(screen.getByText("Une base relationnelle.").previousElementSibling?.textContent, "Choix de conception");
    assert.equal(screen.getByText("Validé en formation.").previousElementSibling?.textContent, "Validation");
    assert.equal(screen.getByText("Inscriptions automatisées").previousElementSibling?.textContent, "Résultat", "jamais fusionnés");
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
      <PortfolioLever />
      <PortfolioProcess />
      <PortfolioServices />
      <PortfolioStack />
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
    assert.ok(mails.length >= 3);
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

  test("sous le capot : six briques titrées, chacune traduite « en clair » ; seuls les logos des outils validés, jamais un autre", () => {
    const { container } = render(<PortfolioStack />);
    const stack = within(container.querySelector("#architecture") as HTMLElement);
    for (const l of STACK.bricks) {
      assert.ok(stack.getByRole("heading", { level: 3, name: l.title }), l.title);
      assert.ok(stack.getByText(l.plain), `traduction de ${l.title}`);
    }
    assert.equal(stack.getAllByText(STACK.plainLabel).length, STACK.bricks.length);
    const icons = [...container.querySelectorAll("[data-tool-icon]")].map((el) => el.getAttribute("data-tool-icon") ?? "");
    for (const tool of ["n8n", "Supabase", "PostgreSQL", "Notion", "MCP", "Node.js"]) assert.ok(icons.includes(tool), `logo ${tool}`);
    for (const icon of icons) assert.ok(VALIDATED_TOOLS.includes(icon), `outil non validé affiché : ${icon}`);
    assert.ok(screen.getByText(/serveur privé \(VPS\)/));
  });

  test("les logos sont décoratifs (cachés des lecteurs d'écran) et le nom de l'outil est toujours écrit à côté", () => {
    const { container } = render(<PortfolioStack />);
    const icons = container.querySelectorAll("[data-tool-icon]");
    assert.ok(icons.length >= 6);
    for (const icon of icons) {
      assert.equal(icon.getAttribute("aria-hidden"), "true");
      assert.ok((icon.parentElement?.textContent ?? "").includes(icon.getAttribute("data-tool-icon") ?? "?"), "outil sans nom écrit");
    }
  });

  test("« Mon parti pris » : la grande phrase seule dans la barre orange (plus de citation barrée), le paragraphe, trois colonnes titrées", () => {
    const { container } = render(<PortfolioLever />);
    const section = within(container.querySelector("#parti-pris") as HTMLElement);
    const big = section.getByText(LEVER.after);
    assert.ok(big.className.includes("border-tone-orange") && big.className.includes("font-serif"), "la grande phrase porte la barre orange");
    assert.ok(!/line-through/.test(container.innerHTML), "plus aucun texte barré");
    assert.ok(section.getByText(LEVER.note));
    const columns = container.querySelectorAll("ul > li");
    assert.equal(columns.length, 3);
    LEVER.points.forEach((p, i) => {
      assert.ok(within(columns[i] as HTMLElement).getByRole("heading", { level: 3, name: p.title }));
      assert.ok(within(columns[i] as HTMLElement).getByText(p.text));
    });
    assert.ok(container.querySelector("ul")?.className.includes("md:grid-cols-3") && !container.querySelector("ul")?.className.includes("grid-cols-3 "), "colonnes empilées sur téléphone, trois colonnes dès md");
    assert.ok(container.querySelector("svg.sketch"), "l'illustration est conservée");
  });


  test("l'épigraphe de la méthode : la citation, son auteur et sa source, dans une citation sémantique", () => {
    const { container } = render(<PortfolioProcess />);
    assert.equal(container.querySelector("blockquote")?.textContent, `« ${PROCESS.epigraph.text} »`);
    const caption = container.querySelector("figcaption")?.textContent ?? "";
    assert.ok(caption.includes(PROCESS.epigraph.author) && caption.includes(PROCESS.epigraph.source));
  });

  test("aucun élément de l'ancienne direction : ni bandeau défilant, ni carte de verre, ni étoile", () => {
    const { container } = render(page());
    assert.equal(container.querySelectorAll(".marquee-track, .glass, .mesh, .grain").length, 0);
    assert.ok(!/[★☆⭐]/.test(container.textContent ?? ""));
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

describe("en-tête", () => {
  test("deux boutons, « Qui suis-je » et « Contact », qui mènent à leur section ; plus de petit « M'écrire »", () => {
    render(<PortfolioHeader />);
    assert.equal(screen.getByRole("link", { name: HEADER.about }).getAttribute("href"), "/portfolio/qui-suis-je");
    assert.equal(screen.getByRole("link", { name: HEADER.contact }).getAttribute("href"), "#contact");
    assert.equal(screen.queryByRole("link", { name: /M'écrire/ }), null);
  });

  test("la lune du thème réagit au survol exactement comme « Qui suis-je » (mêmes classes, même taille, icône à la couleur du texte)", () => {
    render(<PortfolioHeader />);
    const moon = screen.getByRole("button", { name: "Changer de thème" });
    const about = screen.getByRole("link", { name: HEADER.about });
    for (const cls of ["hover:bg-accent", "hover:text-accent-foreground", "group-data-[scrolled=false]/header:hover:bg-photo/15", "group-data-[scrolled=false]/header:hover:text-photo", "rounded-md", "md:h-9"]) {
      assert.ok(moon.className.split(" ").includes(cls), `la lune n'a pas ${cls}`);
      assert.ok(about.className.split(" ").includes(cls), `« Qui suis-je » n'a pas ${cls}`);
    }
    assert.ok(moon.querySelector("svg")?.getAttribute("class")?.includes("text-current"), "l'icône suit la couleur du bouton, donc son survol");
  });

  test("sur la photo au chargement, puis translucide et flou dès que la page défile (et retour en haut)", async () => {
    const { container } = render(<PortfolioHeader />);
    const header = container.querySelector("header") as HTMLElement;
    assert.equal(header.dataset.scrolled, "false");
    assert.ok(header.className.includes("header-veil"));
    await act(async () => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 200 });
      fireEvent.scroll(window);
    });
    assert.equal(header.dataset.scrolled, "true");
    assert.ok(header.className.includes("backdrop-blur") && !header.className.includes("header-veil"));
    await act(async () => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
      fireEvent.scroll(window);
    });
    assert.equal(header.dataset.scrolled, "false");
  });
});

describe("croquis", () => {
  test("chaque croquis est décoratif (caché des lecteurs d'écran, non focalisable) et dessiné par tracés à longueur normalisée", () => {
    for (const name of SKETCH_NAMES) {
      const { container } = render(<Sketch name={name} />);
      const svg = container.querySelector("svg") as SVGElement;
      assert.equal(svg.getAttribute("aria-hidden"), "true", name);
      assert.equal(svg.getAttribute("focusable"), "false", name);
      const paths = [...svg.querySelectorAll("path")];
      assert.ok(paths.length >= 2, `${name} : trop peu de tracés`);
      for (const path of paths) {
        assert.equal(path.getAttribute("pathLength"), "1", name);
        assert.ok((path.getAttribute("d") ?? "").startsWith("M"), `${name} : tracé invalide`);
      }
      assert.ok(svg.querySelector(".sk-accent"), `${name} : pas d'accent orange`);
      assert.ok(svg.querySelector(".sk-ink"), `${name} : pas de trait principal`);
      cleanup();
    }
  });

  test("la page en pose partout : en-têtes de section, étapes de la méthode, formules, briques, contact ; tous cachés des lecteurs d'écran", () => {
    const { container } = render(
      <>
        <PortfolioLever />
        <PortfolioProcess />
        <PortfolioServices />
        <PortfolioStack />
        <PortfolioContact />
      </>,
    );
    const sketches = container.querySelectorAll("svg.sketch");
    assert.equal(sketches.length, 1 + 1 + PROCESS.steps.length + SERVICES.items.length + 1 + STACK.bricks.length + 1, "head, funnel, 6 étapes, 5 formules, cubes, 6 briques, talk");
    for (const svg of sketches) assert.equal(svg.getAttribute("aria-hidden"), "true");
    assert.ok(container.querySelector(".spine"), "colonne vertébrale de la méthode");
  });
});

describe("animations au défilement (repli sans animation-timeline)", () => {
  const offscreen = (el: HTMLElement) => (el.getBoundingClientRect = () => ({ top: 5000 }) as DOMRect);
  const tick = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
  const supports = CSS.supports;
  beforeEach(() => {
    CSS.supports = () => false; // un navigateur sans `animation-timeline`
  });
  afterEach(() => {
    CSS.supports = supports;
    delete (globalThis as Record<string, unknown>).__intersections;
  });
  const element = (cls: string, low: boolean) => {
    const el = document.createElement("p");
    el.className = cls;
    if (low) offscreen(el);
    document.body.append(el);
    return el;
  };

  test("un élément sous l'écran est masqué, puis entre à son apparition ; un élément déjà visible n'est jamais masqué", async () => {
    const low = element("reveal-left", true);
    const top = element("reveal", false);
    render(<ScrollEffects />);
    assert.ok(low.classList.contains("rv-pending"), "masqué avant d'entrer");
    assert.ok(!top.classList.contains("rv-pending"), "déjà à l'écran : jamais masqué");
    const [observer] = ((globalThis as Record<string, unknown>).__intersections ?? []) as { callback: (e: unknown[]) => void }[];
    await act(async () => observer.callback([{ isIntersecting: false, target: low }]));
    assert.ok(low.classList.contains("rv-pending"), "pas encore visible : rien ne change");
    await act(async () => observer.callback([{ isIntersecting: true, target: low }]));
    await tick();
    assert.ok(low.classList.contains("rv-run") && !low.classList.contains("rv-pending"));
    low.remove();
    top.remove();
  });

  test("navigateur qui sait faire en CSS : rien n'est masqué", () => {
    CSS.supports = () => true;
    const low = element("reveal", true);
    render(<ScrollEffects />);
    assert.ok(!low.classList.contains("rv-pending"));
    low.remove();
  });

  test("mouvement réduit : rien n'est masqué ni observé", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce") })) as typeof window.matchMedia;
    try {
      const low = element("reveal", true);
      render(<ScrollEffects />);
      assert.ok(!low.classList.contains("rv-pending"));
      low.remove();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("hero", () => {
  test("un seul h1 : l'accroche d'Alex ; le sous-titre est posé directement sur la photo (aucun bloc, aucune carte)", () => {
    const { container } = render(<PortfolioHero />);
    assert.equal(screen.getByRole("heading", { level: 1 }).textContent, HERO.title);
    const lead = screen.getByText((_, el) => el?.tagName === "P" && el.textContent === HERO.lead);
    assert.ok(!/(^|\s)bg-/.test(lead.className), `fond autour du sous-titre : ${lead.className}`);
    const sentences = [...lead.querySelectorAll("span.block")];
    assert.deepEqual(sentences.map((el) => el.textContent), HERO.lead.split("\n"), "chaque phrase sur sa ligne");
    for (const el of sentences) assert.ok(el.className.includes("text-wrap:balance"), "phrase équilibrée");
    assert.equal(container.querySelectorAll(".glass, [class*=backdrop-blur]").length, 0);
  });

  test("la photo : texte alternatif, priorité haute, jamais différée, dimensions explicites ; sources AVIF puis WebP, cadrage large dès 1024 px", () => {
    const { container } = render(<PortfolioHero />);
    const img = container.querySelector("picture img") as HTMLImageElement;
    assert.equal(img.getAttribute("alt"), HERO.imageAlt);
    assert.equal(img.getAttribute("fetchpriority"), "high");
    assert.equal(img.getAttribute("loading"), null);
    assert.equal(img.getAttribute("width"), "1200");
    assert.equal(img.getAttribute("height"), "900");
    const sources = [...container.querySelectorAll("picture source")].map((el) => [el.getAttribute("media"), el.getAttribute("type")]);
    assert.deepEqual(sources, [
      ["(min-width: 1024px)", "image/avif"],
      ["(min-width: 1024px)", "image/webp"],
      [null, "image/avif"],
      [null, "image/webp"],
    ]);
    assert.match(container.querySelector("picture source")?.getAttribute("srcset") ?? "", /hero-wide-1400\.avif 1400w, \/images\/hero\/hero-wide-2000\.avif 2000w/);
  });

  test("le titre : les mots montent un par un, mais le texte lu reste la phrase entière", () => {
    const { container } = render(<PortfolioHero />);
    const words = [...container.querySelectorAll("h1 .word")].map((el) => el.textContent);
    assert.deepEqual(words, HERO.title.split(" "));
    assert.equal(screen.getByRole("heading", { level: 1 }).textContent, HERO.title);
  });

  test("le voile est décoratif (caché des lecteurs d'écran) ; le texte du hero passe en crème sur la photo à partir de 1024 px", () => {
    const { container } = render(<PortfolioHero />);
    const veil = container.querySelector(".hero-veil");
    assert.equal(veil?.getAttribute("aria-hidden"), "true");
    assert.ok(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === HERO.lead).closest("[class*='lg:text-photo']"));
  });

  test("les deux boutons restent côte à côte sur grand écran (sans retour à la ligne) ; ils passent l'un sous l'autre seulement sur téléphone", () => {
    render(<PortfolioHero />);
    const row = screen.getByRole("link", { name: HERO.primary }).parentElement as HTMLElement;
    assert.ok(row.className.includes("lg:flex-nowrap") && row.className.includes("lg:w-max") && row.className.includes("flex-wrap"));
    assert.equal(row.querySelectorAll("a.liquid").length, 2);
  });

  test("les deux boutons demandés ; le principal mène aux réalisations, le secondaire écrit à Alex", () => {
    render(<PortfolioHero />);
    assert.equal(screen.getByRole("link", { name: HERO.primary }).getAttribute("href"), "#realisations");
    assert.ok((screen.getByRole("link", { name: HERO.secondary }) as HTMLAnchorElement).href.startsWith(`mailto:${CONTACT_EMAIL}`));
  });
});

const statusItem = (id: string, status: PublicRealisation["status"], over: Partial<PublicRealisation> = {}) => item({ id, title: `Projet ${id}`, status, ...over });

describe("statut des réalisations", () => {
  test("STATUT OBLIGATOIRE : une réalisation sans statut ne s'affiche jamais ; toutes celles qui s'affichent ont leur pastille", () => {
    const raws = [
      { ...item({ id: "a", title: "Projet a" }), status: "client_reel" },
      { ...item({ id: "b", title: "Projet b" }), status: null },
      { ...item({ id: "c", title: "Projet c" }), status: "" },
      { ...item({ id: "d", title: "Projet d" }), status: "projet_perso" },
    ];
    const cards = toPublicCards(raws as never, []);
    const { container } = render(<PortfolioShowcase cards={cards} supabaseUrl="https://x.supabase.co" />);
    const articles = [...container.querySelectorAll("ul > li")].filter((li) => li.querySelector("h3"));
    assert.equal(articles.length, 2, "seules les réalisations avec un statut s'affichent");
    assert.equal(screen.queryByText("Projet b"), null);
    assert.equal(screen.queryByText("Projet c"), null);
    for (const li of articles) assert.ok(li.querySelector("[data-status]")?.textContent?.trim(), "une réalisation s'affiche sans pastille de statut");
  });

  test("la pastille nomme le statut ; le résultat d'un exercice ou d'un projet perso n'est jamais présenté comme mesuré chez un client", () => {
    for (const [status, label, measured] of [["client_reel", "Client réel", true], ["exercice_formation", "Exercice de formation", false], ["projet_perso", "Projet personnel", false]] as const) {
      const { container } = render(<PortfolioShowcase cards={buildCards([statusItem("x", status, { result_figure: "Dossier complet" })], [])} supabaseUrl="https://x.supabase.co" />);
      assert.equal(container.querySelector("[data-status]")?.textContent?.trim(), label);
      assert.equal(container.querySelector("[data-status]")?.getAttribute("data-status"), status);
      assert.equal(screen.getByText("Dossier complet").previousElementSibling?.textContent, SHOWCASE.fields.result, "étiquette neutre « Résultat »");
      assert.equal(!!screen.queryByText(SHOWCASE.notMeasured(label)), !measured, `${status} : mention « non mesuré chez un client »`);
      cleanup();
    }
  });

  test("relevé : problème, ce que j'ai fait et tests dans l'ordre ; « Stack recommandée » quand la stack est recommandée, « Outils utilisés » sinon", () => {
    const full = statusItem("p", "exercice_formation", { problem: "Des demandes dispersées.", tests: "10 testeurs.", stack_is_recommended: true });
    const { container } = render(<PortfolioShowcase cards={buildCards([full], [])} supabaseUrl="https://x.supabase.co" />);
    const labels = [...container.querySelectorAll("dt")].map((el) => el.textContent);
    assert.deepEqual(labels, [SHOWCASE.fields.situation, SHOWCASE.fields.problem, SHOWCASE.fields.done, SHOWCASE.fields.tests]);
    assert.ok(screen.getByText(SHOWCASE.fields.stackRecommended));
    assert.equal(container.querySelector("ul[aria-label]")?.getAttribute("aria-label"), SHOWCASE.fields.stackRecommended);
    assert.equal(screen.queryByText(SHOWCASE.fields.stack), null);
    cleanup();
    render(<PortfolioShowcase cards={buildCards([statusItem("q", "client_reel")], [])} supabaseUrl="https://x.supabase.co" />);
    assert.ok(screen.getByText(SHOWCASE.fields.stack));
    assert.equal(screen.queryByText(SHOWCASE.fields.stackRecommended), null);
  });

  test("filtre par statut : boutons à bascule avec le compte, un statut sans réalisation désactivé, le choix filtre les cartes, « Tous » les rend toutes", async () => {
    const cards = buildCards([statusItem("a", "client_reel"), statusItem("b", "exercice_formation"), statusItem("c", "exercice_formation")], []);
    render(<PortfolioShowcaseFilter cards={cards} supabaseUrl="https://x.supabase.co" />);
    const group = screen.getByRole("group", { name: SHOWCASE.filter.label });
    const all = within(group).getByRole("button", { name: /Tous/ });
    const exercice = within(group).getByRole("button", { name: /Exercice de formation/ });
    const perso = within(group).getByRole("button", { name: /Projet personnel/ }) as HTMLButtonElement;
    assert.equal(all.getAttribute("aria-pressed"), "true");
    assert.equal(perso.disabled, true, "aucun projet personnel : bouton désactivé");
    assert.equal(screen.getAllByRole("heading", { level: 3 }).length, 3);
    await userEvent.click(exercice);
    assert.equal(exercice.getAttribute("aria-pressed"), "true");
    assert.deepEqual(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent), ["Projet b", "Projet c"]);
    await userEvent.click(within(group).getByRole("button", { name: /Client réel/ }));
    assert.deepEqual(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent), ["Projet a"]);
    await userEvent.click(all);
    assert.equal(screen.getAllByRole("heading", { level: 3 }).length, 3);
  });

  test("sans réalisation : pas de filtre, le message sobre", () => {
    render(<PortfolioShowcaseFilter cards={[]} supabaseUrl="" />);
    assert.equal(screen.queryByRole("group", { name: SHOWCASE.filter.label }), null);
    assert.ok(screen.getByText(SHOWCASE.empty));
  });
});

describe("dossier de la plateforme de gestion des demandes clients", () => {
  const umaris = () => buildCards([statusItem(UMARIS_ID, "exercice_formation", { title: "Plateforme de gestion des demandes clients", link_url: "https://knotty-reaction-86f.notion.site/Projet-UMARIS-39167eb89ef68099b498ce56f5f958e9" })], []);

  test("bande de chiffres : les trois valeurs fournies et la légende, rien d'autre", () => {
    const { container } = render(<PortfolioShowcase cards={umaris()} supabaseUrl="https://x.supabase.co" />);
    const figures = [...container.querySelectorAll("figure ul li")].slice(0, 3).map((li) => li.textContent);
    assert.deepEqual(figures, ["10testeurs", "3,9/5d'ergonomie moyenne", "4ajustements décidés"]);
    assert.ok(screen.getByText("Tests qualitatifs sur maquettes basse fidélité, 5 clients et 5 agents."));
  });

  test("schéma d'architecture : SVG natif (aucune image), titre et description pour les lecteurs d'écran, huit briques, quatre flux écrits, orchestration assurée par n8n", () => {
    const { container } = render(<PortfolioShowcase cards={umaris()} supabaseUrl="https://x.supabase.co" />);
    const svg = container.querySelector("svg[role=img]") as SVGElement;
    assert.ok(svg, "le schéma est un SVG");
    assert.equal(svg.querySelectorAll("image").length, 0, "aucune image bitmap dans le schéma");
    assert.equal(svg.querySelector("title")?.textContent, DOSSIERS[UMARIS_ID].architecture.title);
    assert.match(svg.querySelector("desc")?.textContent ?? "", /quatre flux numérotés/i);
    assert.equal(svg.getAttribute("aria-labelledby"), "arch-title arch-desc");
    const names = [...svg.querySelectorAll("g:has(> rect)")].map((g) => [...g.querySelectorAll("text")].map((t) => t.textContent).join(" "));
    assert.deepEqual(names, ["Client", "Portail de soumission", "Brevo (e-mails)", "Orchestration n8n", "API Mistral AI", "Agent de support", "Back-office agent", "Supabase (données)"]);
    assert.ok(/n8n/.test(svg.textContent ?? "") && !/make/i.test(svg.textContent ?? ""), "n8n est l'outil d'orchestration choisi, Make n'est pas nommé");
    const flows = [...container.querySelectorAll("ol > li")].map((li) => li.querySelector("h5")?.textContent);
    assert.deepEqual(flows, ["Soumission", "Enrichissement IA", "Traitement", "Notification"]);
    const scroller = svg.closest("[role=group]") as HTMLElement;
    assert.equal(scroller.getAttribute("tabindex"), "0", "défilement horizontal au clavier sur téléphone");
    assert.ok(scroller.className.includes("overflow-x-auto"));
  });

  test("extraits : une image par capture (AVIF et WebP) avec son texte alternatif, légende « extrait du dossier » et lien vers le dossier complet (nouvel onglet)", () => {
    for (const key of ["veille", "backlog"]) assert.ok(DOSSIER_IMAGES[`umaris-${key}`], `fichiers de ${key} fournis`);
    const { container } = render(<PortfolioShowcase cards={umaris()} supabaseUrl="https://x.supabase.co" />);
    assert.equal(container.querySelectorAll("[data-placeholder]").length, 0, "plus d'emplacement vide");
    const figures = container.querySelectorAll("figure:has(picture)");
    assert.equal(figures.length, 2);
    for (const fig of figures) {
      assert.ok(fig.querySelector("img")?.getAttribute("alt")?.trim(), "texte alternatif non vide");
      assert.ok(fig.querySelector('source[type="image/avif"]') && fig.querySelector('source[type="image/webp"]'));
      assert.match(fig.querySelector("figcaption")?.textContent ?? "", /extrait du dossier/);
      const link = fig.querySelector("a") as HTMLAnchorElement;
      assert.equal(link.href, "https://knotty-reaction-86f.notion.site/Projet-UMARIS-39167eb89ef68099b498ce56f5f958e9");
      assert.equal(link.target, "_blank");
      assert.match(link.rel, /noopener/);
    }
  });

  test("accordéon : chaque réalisation est un <details> replié par défaut, du même groupe (un seul ouvert à la fois), avec titre, statut et situation dans le résumé", () => {
    const { container } = render(showcase([item(), item({ id: "r2", title: "Autre" })]));
    const all = container.querySelectorAll("details");
    assert.equal(all.length, 2);
    for (const d of all) {
      assert.equal(d.open, false);
      assert.equal(d.getAttribute("name"), "realisations");
      const summary = d.querySelector("summary");
      assert.ok(summary?.querySelector("h3") && summary.querySelector("[data-status]"));
      assert.match(summary?.textContent ?? "", /marque fictive/);
    }
  });

  test("le lien Notion n'a pas d'aperçu en direct (Notion refuse les cadres) : ni cadre, ni bouton « Voir en direct », mais le lien « Ouvrir le site » reste", () => {
    const { container } = render(<PortfolioShowcase cards={umaris()} supabaseUrl="https://x.supabase.co" />);
    assert.equal(container.querySelectorAll("iframe").length, 0);
    assert.equal(screen.queryByRole("button", { name: /Voir en direct/ }), null);
    assert.ok(screen.getByRole("link", { name: /Ouvrir le site/ }));
  });

  test("une réalisation sans dossier n'affiche ni schéma, ni chiffres, ni extraits", () => {
    const { container } = render(showcase([item()]));
    assert.equal(container.querySelectorAll("svg[role=img], [data-placeholder]").length, 0);
  });
});
