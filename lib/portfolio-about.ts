/**
 * Textes de la page « Qui suis-je » (`/portfolio/qui-suis-je`, 4 novembre 2026). Première personne, reproduits mot pour mot d'après Alex.
 * Chaque `[À COMPLÉTER PAR MOI : …]` est un emplacement visible : `lib/portfolio-about.test.ts` bloque la fusion tant qu'il en reste un.
 * Règles d'Alex : ni nom d'employeur (« e-commerce », sans plus de précision), ni adresse, téléphone ou e-mail ; aucun chiffre, résultat, client,
 * diplôme ou niveau sportif absent de ses textes.
 */

import { CONTACT } from "./portfolio-content.ts";

export const ABOUT = {
  eyebrow: "Qui suis-je",
  title: "Je viens du terrain.",
  /** Brouillon d'Alex (4 novembre 2026), mot pour mot, apostrophes typographiques comprises. */
  intro: [
    "Pendant quinze ans, dans l’e-commerce, j’ai été photographe packshot, puis responsable adjoint d’un service photo, puis responsable d’un service qualité, un poste créé. J’en retiens qu’un process se juge à ce que les gens y font vraiment, pas à ce qui est écrit sur le papier.",
    "J’y ai conçu des workflows, formé des équipes, créé des indicateurs et mis en place des scripts pour gagner du temps sur les tâches répétitives. L’automatisation n’est pas nouvelle pour moi : seuls les outils ont changé.",
    "Depuis juin, je me forme à plein temps au no-code et à l’IA.",
  ],
  sport: "Hors de l'écran, je suis dehors : trail, vélo, randonnée. J'y reviens toujours.",
  /** Bloc fourni par Alex (4 novembre 2026), à reprendre mot pour mot. */
  impact:
    "Je me soucie de l'impact de ce que je construis. L'IA consomme de l'énergie et je ne prétends pas le contraire. C'est pourquoi je commence par la solution la plus simple, et je n'ajoute de l'IA que là où elle apporte ce que rien d'autre n'apporte.",
  /** Photo fournie par Alex (4 novembre 2026, « pour le moment »), WebP 800 px ; remplacer le fichier et le texte alternatif pour changer de photo. */
  photo: { src: "/images/portrait-qui-suis-je.webp", width: 800, height: 1202, alt: "Portrait en noir et blanc, en légère contre-plongée : un homme aux cheveux courts et à la moustache, en sweat à capuche noir, sur fond clair." },
  /** Numéros et noms de section (mentions en monospace) : « 01 » est l'ouverture. */
  sections: { intro: "Introduction", impact: "Sobriété", path: "Parcours" },
  /** Bande de faits (4 novembre 2026, validée par Alex) : uniquement ces trois, tirés de son texte (« quinze ans », trois postes, « un poste créé »). */
  facts: ["15 ans d'e-commerce", "3 postes", "1 poste créé"],
  /** Citation extraite du premier paragraphe (validée par Alex) : le paragraphe reste entier. */
  quote: "Un process se juge à ce que les gens y font vraiment.",
  pathNote: "Dans l'e-commerce",
  /** Au passé : Alex n'est plus en poste, 2024–2026 est une période terminée. `iso` alimente la balise <time>. */
  path: [
    { from: { iso: "2011", text: "2011" }, to: { iso: "2021", text: "2021" }, role: "Photographe packshot" },
    { from: { iso: "2021", text: "2021" }, to: { iso: "2024", text: "2024" }, role: "Responsable adjoint, service photo et préparation de produits" },
    { from: { iso: "2024", text: "2024" }, to: { iso: "2026", text: "2026" }, role: "Responsable du service qualité (poste créé)" },
    { lead: "Depuis", from: { iso: "2026-06", text: "juin 2026" }, role: "Bachelor Chef de projet No-Code et IA, à plein temps, fin prévue en février 2027" },
  ] as Array<{ lead?: string; from: { iso: string; text: string }; to?: { iso: string; text: string }; role: string }>,
  /** Grande phrase de fin : celle déjà publiée sur `/portfolio`. */
  closing: CONTACT.title,
  cta: { label: "Parler de votre problème", href: "/portfolio#contact" },
  back: "Retour au portfolio",
};
