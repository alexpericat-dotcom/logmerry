export type NavIcon =
  | "cockpit"
  | "notes"
  | "clients"
  | "missions"
  | "factures"
  | "echeances"
  | "parametres"
  | "realisations"
  | "a-faire";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  /** false tant que la page n'existe pas : l'entrée est affichée, inactive. */
  available: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Cockpit", href: "/aujourd-hui", icon: "cockpit", available: true },
  { label: "Notes", href: "/notes", icon: "notes", available: true },
  { label: "Clients", href: "/clients", icon: "clients", available: true },
  { label: "Missions", href: "/missions", icon: "missions", available: false },
  { label: "Factures", href: "/factures", icon: "factures", available: false },
  { label: "Échéances", href: "/echeances", icon: "echeances", available: false },
  { label: "Paramètres", href: "/parametres", icon: "parametres", available: true },
  { label: "Réalisations", href: "/realisations", icon: "realisations", available: false },
  { label: "À faire", href: "/a-faire", icon: "a-faire", available: false },
];

export const SIDEBAR_COOKIE = "sidebar";

/** Destination après connexion et après réinitialisation du mot de passe. */
export const HOME_PATH = "/aujourd-hui";

export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
