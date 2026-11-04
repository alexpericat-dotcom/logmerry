/**
 * Textes de la page « Qui suis-je » (`/portfolio/qui-suis-je`, 4 novembre 2026). Première personne, reproduits mot pour mot d'après Alex.
 * Chaque `[À COMPLÉTER PAR MOI : …]` est un emplacement visible : `lib/portfolio-about.test.ts` bloque la fusion tant qu'il en reste un.
 * Règles d'Alex : ni nom d'employeur (« e-commerce », sans plus de précision), ni adresse, téléphone ou e-mail ; aucun chiffre, résultat, client,
 * diplôme ou niveau sportif absent de ses textes.
 */

export const ABOUT = {
  eyebrow: "Qui suis-je",
  title: "Je viens du terrain.",
  /** Le brouillon d'Alex n'a pas encore été collé : emplacement visible, à remplacer par ses paragraphes, mot pour mot. */
  intro: ["[À COMPLÉTER PAR MOI : texte du brouillon « Je viens du terrain »]"],
  sport: "Hors de l'écran, je suis dehors : trail, vélo, randonnée. J'y reviens toujours.",
  /** Bloc fourni par Alex (4 novembre 2026), à reprendre mot pour mot. */
  impact:
    "Je me soucie de l'impact de ce que je construis. L'IA consomme de l'énergie et je ne prétends pas le contraire. C'est pourquoi je commence par la solution la plus simple, et je n'ajoute de l'IA que là où elle apporte ce que rien d'autre n'apporte.",
  /** Photo fournie par Alex (4 novembre 2026, « pour le moment »), WebP 800 px ; remplacer le fichier et le texte alternatif pour changer de photo. */
  photo: { src: "/images/portrait-qui-suis-je.webp", width: 800, height: 1202, alt: "Portrait en noir et blanc, en légère contre-plongée : un homme aux cheveux courts et à la moustache, en sweat à capuche noir, sur fond clair." },
  pathTitle: "Parcours",
  /** « e-commerce » sans plus de précision : le nom de l'entreprise n'est jamais affiché. */
  pathNote: "Dans l'e-commerce",
  /** Au passé : Alex n'est plus en poste, 2024–2026 est une période terminée. */
  path: [
    { period: "2011–2021", role: "Photographe packshot" },
    { period: "2021–2024", role: "Responsable adjoint, service photo et préparation de produits" },
    { period: "2024–2026", role: "Responsable du service qualité (poste créé)" },
    { period: "Depuis juin 2026", role: "Bachelor Chef de projet No-Code et IA, à plein temps, fin prévue en février 2027" },
  ],
  cta: { label: "Parler de votre problème", href: "/portfolio#contact" },
  back: "Retour au portfolio",
};
