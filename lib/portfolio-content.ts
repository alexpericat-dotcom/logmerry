/**
 * Textes de la page publique `/portfolio` (story 6.4). BROUILLON rédigé par l'assistant à partir du positionnement donné par Alex le 30 octobre 2026
 * (« comprendre l'entreprise pour savoir quoi automatiser », chaîne problème métier → maintenance, compétences) : à relire et valider par Alex avant toute mise en
 * ligne, en particulier la liste des outils (`SKILLS`), qui ne doit annoncer que ce qu'il maîtrise. Règles : vouvoiement ; aucun tarif, délai, chiffre ni garantie ;
 * une donnée inconnue (ville, photo) n'apparaît pas.
 */
export const BRAND = "LogMerry";
/** Adresse publique du lien « m'écrire » (donnée par Alex le 30 octobre 2026). */
export const CONTACT_EMAIL = "alexandre.pericat@gmail.com";
export const CONTACT_SUBJECT = "Prise de contact via votre portfolio";

export const PAGE_TITLE = `${BRAND} · Automatisation & IA pour les entreprises`;
export const PAGE_DESCRIPTION = "Je pars de votre problème métier pour trouver ce qu'il faut automatiser, puis je construis l'automatisation, l'IA et les données qui le résolvent. Réalisations et méthode.";

export const HERO = {
  eyebrow: "Automatisation & IA pour les entreprises",
  title: "Trouver ce qu'il faut automatiser. Puis le construire.",
  lead: "Une entreprise ne se demande pas comment utiliser un outil. Elle se demande pourquoi ses équipes passent des heures sur une tâche manuelle. Je pars de ce problème, puis je conçois l'automatisation, l'IA et les données qui le résolvent.",
  primary: "Voir les réalisations",
  secondary: "Parler de votre problème",
};

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
  steps: [
    { title: "Problème métier", text: "Nous partons de ce qui coûte du temps ou de l'énergie à vos équipes, pas d'un outil." },
    { title: "Analyse du processus", text: "Qui fait quoi, avec quelles données, où ça bloque : nous le dessinons ensemble." },
    { title: "Architecture", text: "Je choisis les briques adaptées à votre taille et à vos contraintes : sécurité, RGPD, évolution." },
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
    { title: "Audit et cadrage", text: "Un atelier pour repérer ce qui mérite d'être automatisé, et transformer votre besoin en parcours clairs et en priorités." },
    { title: "Automatisation", text: "Des enchaînements fiables entre vos outils, pour supprimer les tâches répétitives et les ressaisies." },
    { title: "Application et données sur mesure", text: "Une application web pensée pour votre métier : comptes sécurisés, tableau de bord, base de données, recherche." },
    { title: "Assistant IA sur vos documents", text: "Un assistant qui répond à partir de vos notes, procédures et livrables, cite ses sources, et dit clairement quand il ne trouve pas." },
    { title: "Maintenance et évolution", text: "Suivi, corrections et nouvelles fonctions, pour que l'outil reste le vôtre dans la durée." },
  ],
};

/** Outils et domaines mobilisés. À valider par Alex : ne garder que ce qu'il peut défendre devant un client. */
export const SKILLS = {
  eyebrow: "Boîte à outils",
  title: "Les outils sont un moyen",
  intro: "Voici ceux que je mobilise, une fois le problème posé.",
  groups: [
    { title: "Automatisation et intégration", items: ["n8n", "API", "Webhooks", "JSON", "OAuth"] },
    { title: "Données", items: ["Supabase", "PostgreSQL", "Baserow", "Airtable"] },
    { title: "Intelligence artificielle", items: ["API Claude, OpenAI, Gemini", "RAG", "Agents IA"] },
    { title: "Cadrage et fiabilité", items: ["Architecture", "Sécurité", "RGPD", "Gestion de projet", "Compréhension métier"] },
  ],
};

export const SHOWCASE = {
  eyebrow: "Travaux",
  title: "Réalisations",
  intro: "Une sélection de projets, publiés avec l'accord des personnes concernées. Chacun indique son origine, et se visite en direct quand il est en ligne.",
  empty: "Les premières réalisations arrivent bientôt.",
  unavailable: "Les réalisations ne sont pas disponibles pour le moment. Revenez dans quelques instants.",
  linkLabel: "Ouvrir le site",
  liveLabel: "Voir en direct",
};

export const CONTACT = {
  title: "Parlons de votre problème",
  text: "Décrivez-moi ce qui prend du temps à vos équipes. Je reviens vers vous avec des questions et des pistes.",
  button: "M'écrire",
};

export const FOOTER = `© ${new Date().getFullYear()} ${BRAND}. Automatisation & IA.`;
