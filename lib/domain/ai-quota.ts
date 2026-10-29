/** Plafond d'appels à l'IA par compte (audit de sécurité, lot B). Les nombres vivent dans `consume_ai_quota()` (migration 20261030100000) : les deux doivent rester d'accord. */
export const AI_LIMIT_PER_MINUTE = 20;
export const AI_LIMIT_PER_DAY = 300;

export type QuotaResult = "ok" | "minute" | "day" | "error";

/** Réponse de la fonction SQL ; toute autre valeur (ou une erreur) refuse l'appel : mieux vaut bloquer que laisser passer sans compter. */
export function parseQuotaResult(data: unknown): QuotaResult {
  return data === "ok" || data === "minute" || data === "day" ? data : "error";
}

/** Réponse brute de l'appel `rpc("consume_ai_quota")` : une erreur de la base refuse l'appel, comme toute valeur inconnue. */
export function quotaFromRpc(reply: { data: unknown; error: unknown }): QuotaResult {
  return reply.error ? "error" : parseQuotaResult(reply.data);
}

export const QUOTA_MESSAGES: Record<Exclude<QuotaResult, "ok">, string> = {
  minute: "Tu as atteint la limite d'appels à l'IA. Réessaie dans une minute.",
  day: "Tu as atteint la limite d'appels à l'IA sur 24 heures. Réessaie plus tard.",
  error: "Le compteur d'appels à l'IA est indisponible. Réessaie dans un instant.",
};

export const quotaMessage = (r: Exclude<QuotaResult, "ok">) => QUOTA_MESSAGES[r];
