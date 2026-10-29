export const MIN_PASSWORD_LENGTH = 12;

/** Chemin interne sûr pour `next` ; tout le reste retombe sur `/`. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return "/";
  return next;
}

/** Refus 401 de l'API sans session (proxy), et message du chat quand il reçoit ce refus : un seul texte. */
export const SESSION_EXPIRED = "Ta session a expiré. Recharge la page pour te reconnecter.";

export type AccessDecision = { action: "next" } | { action: "redirect"; to: string } | { action: "unauthorized" };

/** Pages d'authentification, publiques : `/auth` et tout ce qui est sous `/auth/`. */
const isAuthPath = (pathname: string) => pathname === "/auth" || pathname.startsWith("/auth/");

/** L'API : `/api` et tout ce qui est sous `/api/` (un faux ami comme `/apiary` n'en est pas). */
const isApiPath = (pathname: string) => pathname === "/api" || pathname.startsWith("/api/");

/**
 * Garde du proxy : `/` mène au cockpit (connecté) ou à la connexion ; sans session, tout chemin hors des pages d'authentification
 * (`isAuthPath`) est renvoyé à la connexion, sauf l'API (`/api/…`) qui reçoit un refus 401 (JSON) : un `fetch` ne doit pas suivre une redirection vers une page HTML ; le reste passe. Le chemin est celui de l'adresse, sans la requête.
 */
export function accessDecision(pathname: string, signedIn: boolean): AccessDecision {
  if (pathname === "/") return { action: "redirect", to: signedIn ? "/aujourd-hui" : "/auth/login" };
  if (!signedIn && !isAuthPath(pathname)) return isApiPath(pathname) ? { action: "unauthorized" } : { action: "redirect", to: "/auth/login" };
  return { action: "next" };
}

export type AuthFieldError = {
  field: "email" | "password" | null;
  message: string;
};

type SupabaseAuthError = { code?: string; name?: string; message?: string };

export const INVALID_CREDENTIALS_MESSAGE = "E-mail ou mot de passe incorrect.";

/** Traduit une erreur Supabase en message français, sans jamais afficher le texte brut. */
export function frenchAuthError(error: SupabaseAuthError): AuthFieldError {
  switch (error.code) {
    case "invalid_credentials":
      return { field: "password", message: INVALID_CREDENTIALS_MESSAGE };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return {
        field: null,
        message: "Trop de tentatives. Réessaie dans quelques minutes.",
      };
    case "same_password":
      return {
        field: "password",
        message: "Le nouveau mot de passe doit être différent de l'ancien.",
      };
    case "weak_password":
      return {
        field: "password",
        message: `Mot de passe trop faible : utilise au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      };
  }
  if (error.name === "AuthSessionMissingError") {
    return {
      field: null,
      message: "Ce lien est invalide ou a expiré. Demande un nouveau lien.",
    };
  }
  return {
    field: null,
    message: "Une erreur est survenue. Réessaie dans un instant.",
  };
}

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Saisis ton e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "L'e-mail n'est pas valide (exemple : nom@domaine.fr).";
  }
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (!password) return "Saisis ton nouveau mot de passe.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  return null;
}
