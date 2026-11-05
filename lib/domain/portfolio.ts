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

type RawItem = { [K in keyof PublicRealisation]: PublicRealisation[K] | null };
type RawImage = { [K in keyof PublicImage]: PublicImage[K] | null };

/** Les colonnes d'une vue sont nullables dans les types : une ligne incomplète (ou une capture sans texte alternatif) est écartée plutôt qu'affichée à moitié. */
export function toPublicCards(items: RawItem[], images: RawImage[]): PublicCard[] {
  const complete = items.filter((r) => !!(r.id && r.title && r.description && r.origin && r.client_label)).map((r) => ({ ...r, stack: r.stack ?? [] }) as PublicRealisation);
  const pictures = images.filter((i) => !!(i.id && i.realisation_id && i.path && i.alt)) as PublicImage[];
  return buildCards(complete, pictures);
}

/** Charge les cartes ; si la base ne répond pas, la page garde le reste de son contenu et affiche un message sobre. `rethrow` laisse passer les signaux internes de Next. */
export async function loadCards(load: () => Promise<PublicCard[]>, rethrow: (error: unknown) => void = () => undefined): Promise<{ cards: PublicCard[] } | { unavailable: true }> {
  try {
    return { cards: await load() };
  } catch (error) {
    rethrow(error);
    return { unavailable: true };
  }
}

/** Adresse externe sûre à afficher : https, sans identifiants, sans espace ni caractère de contrôle ; sinon null. */
export function safeHttpsLink(value: string | null): string | null {
  if (!value || /[\s\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

/** Vrai si l'adresse est de la même origine que la page : un aperçu dans un cadre `allow-same-origin` y aurait accès à la session du visiteur. Une adresse illisible compte comme « même origine » (refus). */
export function isSameOrigin(url: string, pageOrigin: string): boolean {
  try {
    return new URL(url).origin === new URL(pageOrigin).origin;
  } catch {
    return true;
  }
}

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
