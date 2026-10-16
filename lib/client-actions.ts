/** Une action serveur qui lève (réseau coupé, erreur serveur) ne doit pas faire sauter la page ; une redirection voulue (déconnexion) doit, elle, remonter. */
export function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

export const UNREACHABLE = "Le serveur ne répond pas. Réessaie dans un instant.";
