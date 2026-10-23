export type NavIcon =
  | "cockpit"
  | "notes"
  | "clients"
  | "missions"
  | "factures"
  | "plafonds"
  | "echeances"
  | "profil"
  | "regles"
  | "parametres"
  | "realisations"
  | "a-faire";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  /** false tant que la page n'existe pas : l'entrée est affichée, inactive. */
  available: boolean;
  /** Titre de groupe affiché au-dessus de l'entrée (la première du groupe). */
  group?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Cockpit", href: "/aujourd-hui", icon: "cockpit", available: true },
  { label: "Notes", href: "/notes", icon: "notes", available: true },
  { label: "Clients", href: "/clients", icon: "clients", available: true },
  { label: "Missions", href: "/missions", icon: "missions", available: true },
  { label: "Calendrier", href: "/calendrier", icon: "echeances", available: true },
  { label: "Paramètres", href: "/parametres", icon: "parametres", available: true },
  { label: "Réalisations", href: "/realisations", icon: "realisations", available: false },
  { label: "À faire", href: "/a-faire", icon: "a-faire", available: false },
  { label: "Factures", href: "/factures", icon: "factures", available: true, group: "Finances" },
  { label: "Plafonds", href: "/plafonds", icon: "plafonds", available: true, group: "Finances" },
  { label: "Profil", href: "/profil", icon: "profil", available: true, group: "Finances" },
  { label: "Règles", href: "/regles", icon: "regles", available: true, group: "Finances" },
];

export const SIDEBAR_COOKIE = "sidebar";

/** Destination après connexion et après réinitialisation du mot de passe. */
export const HOME_PATH = "/aujourd-hui";

export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
