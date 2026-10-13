/** Réponse de l'assistant rejetée par la vérification (citation inventée ou nombre absent des notes) : jamais affichée. */
export class AnswerRejected extends Error {}

/** Identifiants cités, sans doublon et dans l'ordre ; une citation qui n'a pas été envoyée au modèle fait rejeter toute la réponse. */
export function verifyCitations(citations: string[], sentIds: string[]): string[] {
  const sent = new Set(sentIds);
  for (const id of citations) {
    if (!sent.has(id)) throw new AnswerRejected("Citation non vérifiée : extrait non envoyé au modèle.");
  }
  return [...new Set(citations)];
}

const NUMBER = /\d+(?:[.,]\d+)?/g;

/** Chiffres d'un texte, normalisés : « 2 400 » et « 2400 » deviennent « 2400 », « 7,5 » et « 7.5 » deviennent « 7.5 ». */
function numbersIn(text: string): string[] {
  const joined = text.replace(/(\d)[\s  ](?=\d{3}(?!\d))/g, "$1");
  return (joined.match(NUMBER) ?? []).map((n) => n.replace(",", "."));
}

/**
 * Nombres de la réponse qui ne figurent dans aucun des textes fournis (extraits et question) : des chiffres inventés.
 * Seuls les nombres de 10 ou plus et les décimaux comptent : un petit entier peut être un décompte (« 3 étapes »).
 */
export function inventedNumbers(answer: string, knownTexts: string[]): string[] {
  const known = new Set(knownTexts.flatMap(numbersIn));
  return [...new Set(numbersIn(answer))].filter((n) => (n.includes(".") || Number(n) >= 10) && !known.has(n));
}
