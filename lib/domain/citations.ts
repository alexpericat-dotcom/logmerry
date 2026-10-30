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

/**
 * Adresse web ou e-mail dans un texte : `http(s)://`, `www.`, un autre schéma qui s'ouvre au clic (`javascript:`, `data:`, `ftp:`, `mailto:`), une adresse sans schéma
 * (`//hote/chemin`) ou un e-mail. Filtre de bonne volonté, pas une garantie : un nom de domaine nu ou une adresse écrite « x [at] y » passent. La réponse n'est affichée
 * qu'en texte brut (aucun lien cliquable) : ce contrôle écarte surtout une adresse inventée ou poussée par une note piégée.
 */
const LINK = /(?:https?:\/\/|www\.|(?:javascript|vbscript|data|ftp|mailto):|(?<![\w:/])\/\/)[^\s<>"')\]»…’”]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/giu;

/** Forme comparable d'une adresse : sans point final, schéma `http(s)://`, `www.` ni barre finale, en minuscules (« http://www.X.fr/ » et « https://x.fr » sont la même adresse). */
const canonical = (link: string) =>
  link.toLowerCase().replace(/[.,;:!?»…’”]+$/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

const linksIn = (text: string) => (text.match(LINK) ?? []).map(canonical).filter(Boolean);

/** Adresses web et e-mails de la réponse qui ne figurent, comme adresses entières, dans aucun des textes fournis (extraits et question) : des liens inventés, tronqués ou injectés. */
export function inventedLinks(answer: string, knownTexts: string[]): string[] {
  const known = new Set(knownTexts.flatMap(linksIn));
  return [...new Set(linksIn(answer))].filter((l) => !known.has(l));
}
