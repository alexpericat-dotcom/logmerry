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
import { SKETCH_NAMES, Sketch } from "../../components/sketches.tsx";
import { buildCards, type PublicImage, type PublicRealisation } from "../../lib/domain/portfolio.ts";
import { CONTACT_EMAIL, HEADER, HERO, LEVER, PROCESS, SERVICES, SHOWCASE, STACK, VALIDATED_TOOLS } from "../../lib/portfolio-content.ts";

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

  test("le positionnement : la phrase barrée et la phrase mise en avant sont toutes deux présentes", () => {
    render(page());
    assert.ok(screen.getByText(LEVER.before));
    assert.ok(screen.getByText(LEVER.after));
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
    assert.equal(screen.getByRole("link", { name: HEADER.about }).getAttribute("href"), "#qui-suis-je");
    assert.equal(screen.getByRole("link", { name: HEADER.contact }).getAttribute("href"), "#contact");
    assert.equal(screen.queryByRole("link", { name: /M'écrire/ }), null);
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
    assert.equal(sketches.length, 1 + 1 + PROCESS.steps.length + SERVICES.items.length + 1 + STACK.bricks.length + 1, "tangle, funnel, 6 étapes, 5 formules, bricks, 6 briques, boat");
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
  const delivered = HERO.proof;
  afterEach(() => {
    HERO.proof = delivered;
  });

  test("un seul h1 : l'accroche d'Alex ; le sous-titre est posé directement sur la photo (aucun bloc, aucune carte)", () => {
    const { container } = render(<PortfolioHero />);
    assert.equal(screen.getByRole("heading", { level: 1 }).textContent, HERO.title);
    const lead = screen.getByText(HERO.lead);
    assert.ok(!/(^|\s)bg-/.test(lead.className), `fond autour du sous-titre : ${lead.className}`);
    assert.ok(lead.className.includes("max-w-[42ch]"));
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
    assert.ok(screen.getByText(HERO.lead).closest("[class*='lg:text-photo']"));
  });

  test("ligne de preuve : le placeholder reste visible tant qu'Alex ne l'a pas écrite, puis son texte le remplace", () => {
    render(<PortfolioHero />);
    assert.ok(screen.getByText(HERO.proof));
    cleanup();
    HERO.proof = "Parcours : exemple écrit par Alex";
    render(<PortfolioHero />);
    assert.ok(screen.getByText("Parcours : exemple écrit par Alex"));
  });

  test("les deux boutons demandés ; le principal mène aux réalisations, le secondaire écrit à Alex", () => {
    render(<PortfolioHero />);
    assert.equal(screen.getByRole("link", { name: HERO.primary }).getAttribute("href"), "#realisations");
    assert.ok((screen.getByRole("link", { name: HERO.secondary }) as HTMLAnchorElement).href.startsWith(`mailto:${CONTACT_EMAIL}`));
  });
});
