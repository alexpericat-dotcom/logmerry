import { REALISATION_ORIGIN_LABELS, REALISATION_STATUS_LABELS, parseRealisationStatus, type RealisationOrigin, type RealisationStatus } from "./realisations.ts";

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
  /** Toujours présent : une réalisation sans statut n'est ni publiée par la base, ni gardée par `toPublicCards`. */
  status: RealisationStatus;
  problem: string | null;
  tests: string | null;
  design_choice: string | null;
  validation: string | null;
  /** Vrai : la stack est « recommandée », pas « utilisée ». */
  stack_is_recommended: boolean;
};
export type PublicImage = { id: string; realisation_id: string; path: string; alt: string; created_at: string | null };
export type PublicCard = PublicRealisation & { images: PublicImage[]; originLabel: string; statusLabel: string };

type RawStatus = { status: string | null; stack_is_recommended: boolean | null };

type RawItem = { [K in Exclude<keyof PublicRealisation, "status" | "stack_is_recommended">]: PublicRealisation[K] | null } & RawStatus;
type RawImage = { [K in keyof PublicImage]: PublicImage[K] | null };

/** Les colonnes d'une vue sont nullables dans les types : une ligne incomplète (ou une capture sans texte alternatif) est écartée plutôt qu'affichée à moitié. */
export function toPublicCards(items: RawItem[], images: RawImage[]): PublicCard[] {
  // Sans statut valide : écartée, jamais affichée (la base ne la publie pas non plus ; double garde).
  const complete = items
    .filter((r) => !!(r.id && r.title && r.description && r.origin && r.client_label && parseRealisationStatus(r.status)))
    .map((r) => ({ ...r, stack: r.stack ?? [], stack_is_recommended: r.stack_is_recommended === true }) as PublicRealisation);
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

/** Sites qui interdisent d'être affichés dans un cadre : le navigateur y montre une page d'erreur à la place du site. Pas d'aperçu en direct pour eux, seulement le lien. */
const NO_FRAME_HOSTS = ["notion.site", "notion.so"];
export function canPreviewInFrame(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return !NO_FRAME_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
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
      statusLabel: REALISATION_STATUS_LABELS[item.status],
      images: [...(byItem.get(item.id) ?? [])].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id)),
    }));
}

