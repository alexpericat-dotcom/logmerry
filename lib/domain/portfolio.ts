import { REALISATION_ORIGIN_LABELS, type RealisationOrigin } from "./realisations.ts";

/** Une réalisation telle que la vue publique `public_realisations` la rend (rien de privé). */
export type PublicRealisation = {
  id: string;
  title: string;
  description: string;
  origin: RealisationOrigin;
  client_label: string;
  result_figure: string | null;
  link_url: string | null;
  stack: string[];
  published_at: string | null;
};
export type PublicImage = { id: string; realisation_id: string; path: string; alt: string; created_at: string | null };
export type PublicCard = PublicRealisation & { images: PublicImage[]; originLabel: string };

/** Les plus récemment publiées d'abord ; chaque carte reçoit ses captures dans l'ordre d'ajout. */
export function buildCards(items: PublicRealisation[], images: PublicImage[]): PublicCard[] {
  const byItem = Map.groupBy(images, (i) => i.realisation_id);
  return [...items]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "") || a.id.localeCompare(b.id))
    .map((item) => ({
      ...item,
      originLabel: REALISATION_ORIGIN_LABELS[item.origin],
      images: [...(byItem.get(item.id) ?? [])].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id)),
    }));
}

/** Lien « m'écrire » : l'objet est encodé, l'adresse jamais réécrite. */
export const mailtoHref = (email: string, subject: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}`;
