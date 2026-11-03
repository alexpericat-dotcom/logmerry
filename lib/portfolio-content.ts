/**
 * Textes de la page publique `/portfolio` (story 6.4). BROUILLON rédigé par l'assistant à partir du positionnement donné par Alex le 30 octobre 2026
 * (« comprendre l'entreprise pour savoir quoi automatiser », chaîne problème métier → maintenance) : à relire et valider par Alex avant toute mise en
 * ligne. Règles : vouvoiement ; aucun tarif, délai, chiffre ni garantie ; une donnée inconnue (ville, photo) n'apparaît pas ; aucun outil que
 * Alex n'a pas validé (`VALIDATED_TOOLS`).
 */

export const BRAND = "LogMerry";
/** Adresse publique du lien « m'écrire » (donnée par Alex le 30 octobre 2026). */
export const CONTACT_EMAIL = "alexandre.pericat@gmail.com";
export const CONTACT_SUBJECT = "Prise de contact via votre portfolio";

export const PAGE_TITLE = `${BRAND} · Automatisation & IA pour les entreprises`;
export const PAGE_DESCRIPTION = "Je pars de votre problème métier pour trouver ce qu'il faut automatiser, puis je construis l'automatisation, l'IA et les données qui le résolvent. Réalisations et méthode.";

/** Boutons de l'en-tête : « Qui suis-je » mène à la section de présentation, « Contact » à la section de contact (qui porte le lien courriel). */
export const HEADER = { about: "Qui suis-je", contact: "Contact" };

export const HERO = {
  eyebrow: "Automatisation & IA pour les entreprises",
  /** Le H1 : texte d'Alex (3 novembre 2026), mot pour mot. */
  title: "Laissez la vague faire le travail.",
  lead: "La puissance est déjà là : le no-code et l'IA. Je la mets au service de vos processus, pour que vos équipes retrouvent du temps pour ce qui compte.",
  primary: "Voir les réalisations",
  secondary: "Parler de votre problème",
  /** Ligne de preuve sous les boutons : parcours, chiffre ou réalisation, À ÉCRIRE PAR ALEX (ne rien inventer). Le placeholder reste visible et `lib/portfolio-page.test.ts` bloque la fusion tant qu'il est là. */
  proof: "[À compléter par Alex : parcours, chiffre ou réalisation]",
  /** Texte alternatif de la photo (décrit la scène, ne répète pas le titre). */
  imageAlt: "Un surfeur sur sa planche, au moment de se lever, devant une vague orange et turquoise au coucher du soleil.",
};

/**
 * Les outils qui peuvent apparaître avec leur logo sur la page, ailleurs que dans les étiquettes de ses réalisations. Validés par Alex : les huit premiers le 30 octobre 2026 ;
 * Notion, MCP et Node.js demandés par lui le 3 novembre 2026 (« un éventail d'applications à la mode réparti sur les briques »). Les cinq derniers (Next.js, React, Telegram, Gmail, Docker)
 * viennent de sa propre pile et de ses captures de workflows : à CONFIRMER par Alex. Make, Zapier, Vercel et Cursor : proposés par l'assistant le 3 novembre, rangés dans leurs briques à sa demande (« range-les »).
 */
export const VALIDATED_TOOLS = ["n8n", "Supabase", "PostgreSQL", "Baserow", "Airtable", "OpenAI", "Claude", "Gemini", "Notion", "MCP", "Node.js", "Next.js", "React", "Telegram", "Gmail", "Docker", "Make", "Zapier", "Vercel", "Cursor"];

/** Le positionnement, en une opposition : l'outil d'un côté, le métier de l'autre. */
export const LEVER = {
  eyebrow: "Mon parti pris",
  title: "L'outil vient après le problème.",
  before: "« Je suis très bon sur tel outil. »",
  after: "« Je comprends suffisamment le fonctionnement d'une entreprise pour savoir quoi automatiser. »",
  note: "C'est ce qui change la qualité de ce que je construis : avant d'écrire la moindre automatisation, je cherche la tâche qui coûte le plus, et pourquoi.",
  points: [
    { title: "Le métier d'abord", text: "Je cherche à comprendre qui fait quoi, avec quelles données, et où ça bloque, avant de choisir un outil." },
    { title: "Une IA qui rend des comptes", text: "Mes assistants citent les passages dont ils s'inspirent, et ne donnent ni conseil fiscal ni conseil juridique." },
    { title: "Vos données restent les vôtres", text: "Chaque compte ne voit que ses propres données, et l'hébergement est en Europe." },
  ],
};

export const PROCESS = {
  eyebrow: "Méthode",
  title: "Du problème métier à la maintenance",
  intro: "Six étapes, et vous gardez la main sur chacune.",
  /** Épigraphe : traduite et attribuée ; l'usage de cette citation est validé par Alex (3 novembre 2026). */
  epigraph: { text: "On n'arrête pas les vagues, mais on peut apprendre à surfer.", author: "Jon Kabat-Zinn", source: "Wherever You Go, There You Are, 1994" },
  steps: [
    { title: "Problème métier", text: "Nous partons de ce qui coûte du temps ou de l'énergie à vos équipes, pas d'un outil." },
    { title: "Analyse du processus", text: "Qui fait quoi, avec quelles données, où ça bloque : nous le dessinons ensemble." },
    { title: "Architecture", text: "Choix de la stack technique sur mesure : je retiens les briques adaptées à votre taille et à vos contraintes (sécurité, RGPD, évolution)." },
    { title: "IA, automatisation et données", text: "Automatisations, connexions entre vos outils, base de données, assistant IA : construits par étapes courtes, avec une démonstration à chaque étape." },
    { title: "Déploiement", text: "Mise en ligne, prise en main et documentation, pour que vos équipes soient autonomes." },
    { title: "Maintenance", text: "Suivi, corrections et évolutions, pour que l'outil continue de servir quand votre activité change." },
  ],
};

export const SERVICES = {
  eyebrow: "Offre",
  title: "Ce que je peux faire pour vous",
  intro: "Cinq façons de travailler ensemble, seules ou combinées.",
  items: [
    { title: "Audit et cadrage", text: "Un atelier pour repérer ce qui mérite d'être automatisé, choisir la stack technique adaptée, et transformer votre besoin en parcours clairs et en priorités." },
    { title: "Automatisation", text: "Des enchaînements fiables entre vos outils, pour supprimer les tâches répétitives et les ressaisies." },
    { title: "Application et données sur mesure", text: "Une application web pensée pour votre métier : comptes sécurisés, tableau de bord, base de données, recherche." },
    { title: "Assistant IA sur vos documents", text: "Un assistant qui répond à partir de vos notes, procédures et livrables, cite ses sources, et dit clairement quand il ne trouve pas." },
    { title: "Maintenance et évolution", text: "Suivi, corrections et nouvelles fonctions, pour que l'outil reste le vôtre dans la durée." },
  ],
};

/** Les briques d'une application, et où elle tourne. Chacune a sa traduction « En clair » pour qui n'est pas du métier. Les outils cités avec un logo sont dans `lib/portfolio-tools.ts` et tous dans `VALIDATED_TOOLS`. À valider par Alex (VPS, auto-hébergement). */
export const STACK = {
  eyebrow: "Architecture",
  title: "Sous le capot",
  intro: "Une application, ce sont plusieurs briques. Je les assemble avec une stack technique choisie sur mesure pour votre métier et à votre portée, et je m'adapte aux outils que vous utilisez déjà.",
  plainLabel: "En clair",
  bricks: [
    {
      title: "Front end",
      plain: "ce que vos équipes voient et utilisent à l'écran.",
      text: "Des interfaces claires, rapides et utilisables sur téléphone.",
      tools: ["Next.js", "React"],
    },
    {
      title: "Back end",
      plain: "le moteur invisible, qui fait le travail en coulisses.",
      text: "La logique métier : automatisations, API et connexions entre vos outils, avec un suivi des erreurs.",
      tools: ["Node.js", "n8n", "Make", "Zapier", "Telegram", "Gmail"],
    },
    {
      title: "Base de données",
      plain: "la mémoire de l'application, là où vos informations sont rangées.",
      text: "PostgreSQL, directement ou via Supabase : des données structurées, protégées par compte. Je m'adapte aussi à vos outils actuels.",
      tools: ["PostgreSQL", "Supabase", "Notion", "Airtable", "Baserow"],
    },
    {
      title: "IA et agents",
      plain: "des assistants qui lisent vos documents et accomplissent des tâches précises à votre place.",
      text: "Des modèles d'IA reliés à vos données, qui citent leurs sources. MCP (Model Context Protocol) est la prise standard qui leur permet de se brancher à vos outils.",
      tools: ["Claude", "OpenAI", "Gemini", "MCP", "Cursor"],
    },
    {
      title: "Hébergement et auto-hébergement",
      plain: "l'endroit où l'application fonctionne, jour et nuit.",
      text: "Chez un hébergeur managé en Europe, ou auto-hébergé sur un serveur privé (VPS) que vous contrôlez : vos automatisations et vos données restent chez vous.",
      tools: ["Vercel", "Docker"],
    },
    {
      title: "Données personnelles et RGPD",
      plain: "la protection des informations de vos clients et de vos équipes.",
      text: "La protection des données est pensée dès la conception : hébergement européen, accès limités, données séparées par compte, possibilité de les supprimer.",
      tools: [] as string[],
    },
  ],
};

export const SHOWCASE = {
  eyebrow: "Travaux",
  title: "Réalisations",
  intro: "Une sélection de projets, publiés avec l'accord des personnes concernées. Chacun indique son origine, et se visite en direct quand il est en ligne.",
  empty: "Les premières réalisations arrivent bientôt.",
  unavailable: "Les réalisations ne sont pas disponibles pour le moment. Revenez dans quelques instants.",
  linkLabel: "Ouvrir le site",
  /** Étiquettes d'un relevé. « Résultat » et non « Temps rendu » : le champ est un texte libre, pas forcément une durée (aucune migration pour l'instant). */
  fields: { situation: "Situation", done: "Ce qui a été réalisé", result: "Résultat", stack: "Outils utilisés" },
  liveLabel: "Voir en direct",
};

export const CONTACT = {
  title: "Parlons de votre problème",
  text: "Décrivez-moi ce qui prend du temps à vos équipes. Je reviens vers vous avec des questions et des pistes.",
  button: "M'écrire",
};

export const LOGOS_NOTE = "Les logos appartiennent à leurs propriétaires et ne désignent que les outils utilisés.";
export const FOOTER = `© ${new Date().getFullYear()} ${BRAND}. Automatisation & IA.`;
