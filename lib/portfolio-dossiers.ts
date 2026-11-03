/**
 * Dossiers rattachés à une réalisation de la page publique : schéma d'architecture, bande de chiffres, extraits. Contenu fourni par Alex (5 novembre 2026), repris mot pour
 * mot ; rien n'est inventé. La réalisation est repérée par son identifiant, fixé dans `docs/realisation-umaris.sql` (une réalisation d'un autre identifiant n'a pas de dossier).
 */
export const UMARIS_ID = "e1c2f0a4-5b6d-4c3e-9a71-0d4b2f6a8c11";

export type DossierCapture = { key: string; title: string; caption: string; alt: string };
export type DossierFlow = { number: number; title: string; text: string };
export type Dossier = {
  figures: { value: string; label: string }[];
  figuresCaption: string;
  architecture: { title: string; alt: string; description: string; flows: DossierFlow[]; scrollHint: string };
  captures: { title: string; kind: string; linkLabel: string; placeholder: string; items: DossierCapture[] };
};

export const DOSSIERS: Record<string, Dossier> = {
  [UMARIS_ID]: {
    figures: [
      { value: "10", label: "testeurs" },
      { value: "3,9/5", label: "d'ergonomie moyenne" },
      { value: "4", label: "ajustements décidés" },
    ],
    figuresCaption: "Tests qualitatifs sur maquettes basse fidélité, 5 clients et 5 agents.",
    architecture: {
      title: "Schéma d'architecture",
      alt: "Schéma d'architecture de la plateforme : le client et l'agent de support utilisent le portail de soumission et le back-office. Une orchestration relie le portail, Supabase (les données), l'API Mistral AI et Brevo (les e-mails). Quatre flux numérotés : soumission, enrichissement par l'IA, traitement, notification.",
      description: "Les boîtes sont les briques, les flèches sont les échanges ; chaque numéro renvoie au flux décrit juste dessous.",
      scrollHint: "Sur téléphone, le schéma défile horizontalement ; les quatre flux sont aussi écrits ci-dessous.",
      flows: [
        {
          number: 1,
          title: "Soumission",
          text: "Le client soumet un ticket sur le portail, le portail appelle l'orchestration par webhook, qui enregistre le ticket dans Supabase et demande à Brevo l'e-mail de prise en charge envoyé au client.",
        },
        { number: 2, title: "Enrichissement IA", text: "Un nouveau ticket dans Supabase déclenche l'orchestration, qui demande à Mistral un score d'urgence, puis le met à jour dans Supabase." },
        { number: 3, title: "Traitement", text: "Le back-office affiche les tickets triés depuis Supabase ; l'agent traite et résout ; le statut est mis à jour." },
        { number: 4, title: "Notification", text: "Un ticket résolu déclenche l'orchestration, qui demande à Brevo l'e-mail de résolution envoyé au client." },
      ],
    },
    captures: {
      title: "Extraits du dossier",
      kind: "extrait du dossier",
      linkLabel: "Voir le dossier complet",
      placeholder: "Capture à fournir",
      items: [
        { key: "veille", title: "Tableau comparatif de la veille", caption: "Tableau comparatif de la veille des plateformes", alt: "Extrait du dossier Notion : tableau comparatif de la veille des plateformes" },
        { key: "backlog", title: "Backlog priorisé", caption: "Backlog priorisé", alt: "Extrait du dossier Notion : backlog priorisé" },
      ],
    },
  },
};
