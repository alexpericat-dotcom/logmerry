/**
 * Textes de la page « Qui suis-je » (`/portfolio/qui-suis-je`, 4 novembre 2026). Première personne, reproduits mot pour mot d'après Alex.
 * Chaque `[À COMPLÉTER PAR MOI : …]` est un emplacement visible : `lib/portfolio-about.test.ts` bloque la fusion tant qu'il en reste un.
 * Règles d'Alex : ni nom d'employeur (« e-commerce », sans plus de précision), ni adresse, téléphone ou e-mail ; aucun chiffre, résultat, client,
 * diplôme ou niveau sportif absent de ses textes.
 */

import { CONTACT } from "./portfolio-content.ts";

export type TimelineStep = {
  lead?: string;
  /** Point plein : ce qui est en cours. */
  current?: boolean;
  from?: { iso: string; text: string };
  to?: { iso: string; text: string };
  role: string;
  where?: string;
  /** Référence au Répertoire national des certifications professionnelles, avec le lien de la fiche officielle. */
  rncp?: { label: string; href: string };
  details?: string[];
  /** Compétences avec, au besoin, les outils associés (logo si connu, sinon pastille avec le nom). */
  skills?: Array<{ label: string; tools?: string[] }>;
  groups?: Array<{ title: string; items: string[] }>;
};

export const ABOUT = {
  eyebrow: "Qui suis-je",
  title: "Je viens du terrain.",
  /** Texte d'Alex (4 novembre 2026, nouvelle version), mot pour mot, apostrophes typographiques comprises. */
  intro: [
    "Pendant quinze ans, dans l’e-commerce, j’ai été photographe packshot, responsable adjoint du service photo, puis responsable qualité (un poste créé). J’y ai pris un réflexe : aller voir comment le travail se fait vraiment, avant de proposer quoi que ce soit.",
    "Au fil de ces années, j’ai conçu des workflows, formé des équipes, créé des indicateurs de performance et mis en place des scripts pour gagner du temps sur les tâches répétitives. L’automatisation n’est pas nouvelle pour moi : seuls les outils ont changé.",
    "Depuis juin, je me forme à plein temps au no-code et à l’IA.",
  ],
  sport: "Hors de l'écran, je suis dehors : trail, vélo, randonnée. J'y reviens toujours.",
  /** Bloc fourni par Alex (4 novembre 2026), à reprendre mot pour mot. */
  impact:
    "Je me soucie de l'impact de ce que je construis. L'IA consomme de l'énergie et je ne prétends pas le contraire. C'est pourquoi je commence par la solution la plus simple, et je n'ajoute de l'IA que là où elle apporte ce que rien d'autre n'apporte.",
  /** Emplacement de portrait (4 novembre 2026) : la photo d'Alex, floutée, décorative (alt vide) en attendant un portrait qui lui convient. Pour le remplacer : nouveau fichier, texte alternatif, et retirer le flou dans la page. */
  photo: { src: "/images/portrait-qui-suis-je.webp", width: 800, height: 1202, alt: "" },
  /** Numéros et noms de section (mentions en monospace) : « 01 » est l'ouverture. */
  sections: { intro: "Introduction", impact: "Sobriété", path: "Parcours" },
  /** Bande de faits (4 novembre 2026, validée par Alex) : uniquement ces trois, tirés de son texte (« quinze ans », trois postes, « un poste créé »). */
  facts: ["15 ans d'e-commerce", "3 postes", "1 poste créé"],
  /** Citation extraite du premier paragraphe (validée par Alex) : le paragraphe reste entier. */
  quote: "Aller voir comment le travail se fait vraiment, avant de proposer quoi que ce soit.",
  pathNote: "Dans l'e-commerce",
  /** Au passé : Alex n'est plus en poste, 2024–2026 est une période terminée. `iso` alimente la balise <time>. */
  path: [
    { from: { iso: "2011", text: "2011" }, to: { iso: "2021", text: "2021" }, role: "Photographe packshot", details: ["Mettre en valeur des produits (lumière, disposition, prise de vue, retouche) en fonction de notre cahier des charges."] },
    { from: { iso: "2021", text: "2021" }, to: { iso: "2024", text: "2024" }, role: "Responsable adjoint, service photo et préparation de produits",
      details: [
        "Manager les effectifs répartis dans différents services.",
        "Gérer le flux de marchandise et la chaîne de production en lien avec le service commercial.",
        "Recherche et développement. Améliorer la qualité (ergonomie, lumière, images, scripts/actions Adobe Photoshop ou Capture One), augmenter la productivité, faire baisser le coût à la photo, économies d'énergie, de papier.",
        "Diriger un groupe de travail en lien avec la R&D.",
        "Conception et mise en place de nouveaux workflows/process. Former les effectifs à ces derniers.",
      ],
    },
    { from: { iso: "2024", text: "2024" }, to: { iso: "2026", text: "2026" }, role: "Responsable du service qualité (poste créé)",
      details: [
        "Manager une équipe de six à huit personnes.",
        "Gérer différents flux et la chaîne de production en lien avec le service commercial.",
        "Anticiper et résoudre des problèmes en relation avec les différents services.",
        "Recherche et développement. Améliorer l'ergonomie des postes, les process de production, imaginer des solutions futures.",
        "Piloter la performance avec la création d'indicateurs.",
      ],
    },
    { lead: "Depuis", current: true, from: { iso: "2026-06", text: "juin 2026" }, role: "Bachelor Chef de projet No-Code et IA, à plein temps, fin prévue en février 2027",
      groups: [
        {
          title: "Compétences techniques et no-code",
          items: [
            "Développement web et mobile no-code : conception, maquettage et déploiement d'applications web et mobiles robustes (via des outils leaders comme Bubble, FlutterFlow, Glide, Softr ou Webflow).",
            "Automatisation des processus métiers : création de flux de travail automatisés, synchronisation de données et interconnexion d'outils via des plateformes d'intégration (Make / Integromat, Zapier, n8n).",
            "Gestion de bases de données et architecture : modélisation de bases de données relationnelles, structuration des données et gestion d'API (Airtable, Xano, Supabase).",
            "Design d'interface et UX/UI : création de wireframes, prototypage rapide et respect des normes d'accessibilité numérique et de design responsive (Figma).",
          ],
        },
        {
          title: "Compétences en intelligence artificielle",
          items: [
            "Intégration d'IA dans les produits : connexion d'API d'intelligence artificielle (OpenAI / ChatGPT, Anthropic / Claude, Mistral AI) au sein d'applications no-code pour automatiser la génération de contenu ou l'analyse de données.",
            "Ingénierie de prompt : conception, test et optimisation de prompts complexes pour maximiser la pertinence et la performance des modèles de langage intégrés.",
            "Automatisation intelligente (agents IA) : configuration et déploiement d'agents autonomes ou de chatbots intelligents pour le support client ou le traitement de workflows internes.",
          ],
        },
        {
          title: "Gestion de projet et méthodes",
          items: [
            "Product building et cadrage : traduction des besoins métiers en spécifications techniques (user stories), priorisation des fonctionnalités (MVP, produit minimum viable).",
            "Méthodologies agiles : pilotage de projet en mode Scrum ou Kanban, animation des rituels et gestion du cycle de vie du produit.",
            "Recette et assurance qualité : réalisation de tests fonctionnels, débogage d'architectures no-code et optimisation des performances applicatives.",
          ],
        },
      ],
    },
  ] as TimelineStep[],
  trainingNote: "Formation et compétences",
  /** Frise de gauche (CV d'Alex, 4 novembre 2026). Datée seulement pour les diplômes ; l'ordre des formations et compétences sans date n'implique aucune chronologie ; les compétences vont de la plus utile à l'activité de conseil (no-code, IA, méthode) à la moins liée (photo). */
  training: [
    { from: { iso: "2005", text: "2005" }, role: "Baccalauréat ES", where: "Lycée Gay-Lussac, Limoges" },
    { from: { iso: "2008", text: "2008" }, to: { iso: "2009", text: "2009" }, role: "CAP Photographe", where: "Cifap" },
    {
      lead: "Prévu",
      from: { iso: "2027-02", text: "février 2027" },
      role: "Product builder no code",
      where: "Titre certifié par Global Digital University",
      rncp: { label: "RNCP41766 · niveau 6", href: "https://www.francecompetences.fr/recherche/rncp/41766" },
    },
    { role: "Formations", details: ["Pilotage de la performance", "Gestion du changement", "Management"] },
    {
      role: "Compétences",
      skills: [
        { label: "Développement web et mobile no-code", tools: ["Bubble", "FlutterFlow", "Glide", "Softr", "Webflow"] },
        { label: "Automatisation et optimisation de processus", tools: ["Make", "Zapier", "n8n"] },
        { label: "Intégration d'IA dans les produits", tools: ["Claude", "ChatGPT", "Mistral AI"] },
        { label: "Agents IA et chatbots" },
        { label: "Ingénierie de prompt" },
        { label: "Bases de données relationnelles et API", tools: ["Airtable", "Xano", "Supabase"] },
        { label: "Cadrage produit : user stories, MVP" },
        { label: "Méthodes agiles (Scrum, Kanban)" },
        { label: "Design d'interface et UX/UI", tools: ["Figma"] },
        { label: "Recette et assurance qualité" },
        { label: "Gestion de flux" },
        { label: "Gestion d'équipe" },
        { label: "Résolution de problèmes" },
        { label: "Esprit critique" },
        { label: "Curiosité intellectuelle" },
        { label: "Anglais" },
        { label: "Lumière", tools: ["Adobe Photoshop", "Capture One"] },
      ],
    },
  ] as TimelineStep[],
  /** Grande phrase de fin : celle déjà publiée sur `/portfolio`. */
  closing: CONTACT.title,
  cta: { label: "Parler de votre problème", href: "/portfolio#contact" },
  back: "Retour au portfolio",
};
