/**
 * Textes de la page publique `/portfolio` (story 6.4). BROUILLON rédigé par l'assistant à partir de la description de l'activité (CLAUDE.md) :
 * à relire et valider par Alex avant toute mise en ligne. Règles : vouvoiement ; aucun tarif, délai, chiffre ni garantie ; rien qui ne soit décrit
 * dans le projet ; une donnée inconnue (ville, photo) n'apparaît pas.
 */
export const BRAND = "LogMerry";
/** Adresse publique du lien « m'écrire » (donnée par Alex le 30 octobre 2026). */
export const CONTACT_EMAIL = "alexandre.pericat@gmail.com";
export const CONTACT_SUBJECT = "Prise de contact via votre portfolio";

export const PAGE_TITLE = `${BRAND} · Conseil No-Code & IA`;
export const PAGE_DESCRIPTION = "Applications sur mesure et assistants IA qui citent leurs sources, conçus avec des outils No-Code. Découvrez les réalisations et la façon de travailler.";

export const HERO = {
  eyebrow: "Conseil No-Code & IA",
  title: "Des outils sur mesure pour piloter votre activité.",
  lead: "Je conçois des applications web et des assistants IA qui s'appuient sur vos propres documents, avec des outils No-Code, par petites étapes que vous validez.",
  primary: "Voir les réalisations",
  secondary: "M'écrire",
};

export const SERVICES = {
  title: "Ce que je peux faire pour vous",
  intro: "Quatre façons de travailler ensemble, seules ou combinées.",
  items: [
    { title: "Cadrage", text: "Un atelier pour transformer votre besoin en parcours clairs : objectifs, utilisateurs, priorités, puis un backlog de user stories prêt à être réalisé." },
    { title: "Application sur mesure", text: "Une application web pensée pour votre métier : comptes sécurisés, tableau de bord, base de données, recherche. Livrée étape par étape." },
    { title: "Assistant IA sur vos documents", text: "Un assistant qui répond à partir de vos notes, procédures et livrables, cite ses sources, et dit clairement quand il ne trouve pas." },
    { title: "Accompagnement", text: "Documentation, prise en main et suivi après la livraison, pour que l'outil reste le vôtre." },
  ],
};

export const PROCESS = {
  title: "Comment ça se passe",
  intro: "Un déroulé simple, où vous gardez la main à chaque étape.",
  steps: [
    { title: "Échange", text: "Un premier rendez-vous pour comprendre votre activité et ce que vous voulez améliorer." },
    { title: "Cadrage", text: "Nous fixons ensemble les objectifs, les utilisateurs et les priorités. Vous recevez un backlog lisible." },
    { title: "Proposition", text: "Périmètre, étapes et conditions écrits clairement avant de commencer." },
    { title: "Réalisation par étapes", text: "De courtes séquences de travail, avec une démonstration à chaque étape : vous validez avant que nous avancions." },
    { title: "Livraison et suite", text: "Mise en ligne, documentation et accompagnement pour que vous soyez autonome." },
  ],
};

export const BENEFITS = {
  title: "Ce que vous y gagnez",
  items: [
    { title: "Du concret, tôt", text: "Vous voyez l'outil prendre forme dès les premières étapes, pas seulement à la fin." },
    { title: "Des données qui restent les vôtres", text: "Chaque compte ne voit que ses propres données, et l'hébergement est en Europe." },
    { title: "Une IA qui rend des comptes", text: "L'assistant cite les passages dont il s'inspire, et ne donne ni conseil fiscal ni conseil juridique." },
    { title: "Un interlocuteur unique", text: "Vous parlez à la personne qui conçoit et construit votre outil." },
  ],
};

export const SHOWCASE = {
  title: "Réalisations",
  intro: "Une sélection de projets, publiés avec l'accord des personnes concernées. Chacun indique son origine.",
  empty: "Les premières réalisations arrivent bientôt.",
  unavailable: "Les réalisations ne sont pas disponibles pour le moment. Revenez dans quelques instants.",
  linkLabel: "Voir la page en ligne",
};

export const CONTACT = {
  title: "Parlons de votre projet",
  text: "Décrivez-moi votre activité et ce que vous aimeriez améliorer. Je reviens vers vous avec des questions et des pistes.",
  button: "M'écrire",
};

export const FOOTER = `© ${new Date().getFullYear()} ${BRAND}. Conseil No-Code & IA.`;
