/**
 * Règles d'essai « DEMO, non officielle » du compte de démonstration A (story 4.4).
 * npm run seed:demo           écrit les règles manquantes
 * npm run seed:demo -- --dry  affiche ce qui serait écrit, sans rien écrire
 *
 * Les valeurs sont FICTIVES : celles qu'Alex a écrites le 23 octobre 2026 (collées d'une recherche sur des blogs, jamais vérifiées à une source officielle), plus un délai de bascule de TVA inventé le 29 octobre.
 * Elles passent par `create_rule_version` avec le statut « essai » et la source « DEMO » : jamais « vérifiée », jamais dans le compte réel.
 * Idempotent : une règle d'essai déjà en vigueur pour la même clé est laissée telle quelle (une règle d'essai ne se supprime pas par l'API).
 * Se connecte avec la clé PUBLIQUE (jamais service_role) ; refuse un compte hors @example.com. Identifiants : .env.test.local (ignoré par git).
 */
import { createClient } from "@supabase/supabase-js";

import { todayParis } from "../lib/format.ts";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
}

const DRY = process.argv.includes("--dry");
/** Une règle d'essai devient périmée (donc « paramètre manquant ») le lendemain de cette date : à repousser au besoin (au plus 5 ans après la vérification). */
const REVALIDATE_AFTER = "2028-12-31";
const NOTE = "DEMO, non officielle : valeur fictive d'Alex, à vérifier à la source officielle avant tout usage réel.";
const EUR = (n: number) => Math.round(n * 100);

type Demo = { key: string; params: Record<string, string | number>; description: string };
const DEMO_RULES: Demo[] = [
  { key: "ceiling_turnover_micro", params: { amount_cents: EUR(83600), period: "calendar_year", revenue_category: "Prestations de services BIC/BNC", tax_basis: "excl_tax" }, description: `${NOTE} Un premier dépassement serait toléré (sortie du régime après deux années consécutives).` },
  { key: "ceiling_vat_franchise", params: { amount_cents: EUR(37500), period: "calendar_year", revenue_category: "Prestations de services", tax_basis: "excl_tax" }, description: `${NOTE} Le seuil de base s'apprécie normalement sur l'année N-1.` },
  { key: "ceiling_vat_tolerance", params: { amount_cents: EUR(41250), period: "calendar_year", revenue_category: "Prestations de services", tax_basis: "excl_tax" }, description: NOTE },
  { key: "acre_duration", params: { months: 12 }, description: `${NOTE} Deux sources ne disent pas la même chose (12 mois, ou jusqu'à la fin du 3e trimestre civil suivant le début d'activité).` },
  { key: "first_year_prorata", params: { day_basis: 365 }, description: `${NOTE} Le 365 est déduit d'un exemple, aucune source ne l'énonce comme règle.` },
  // Bascule de TVA : aucun délai n'a été trouvé ; valeur INVENTÉE pour la démonstration, à la demande d'Alex du 29 octobre 2026 (elle remplace sa décision du 23 octobre de la laisser vide).
  { key: "vat_switch", params: { delay: 1, unit: "months" }, description: `${NOTE} Délai INVENTÉ pour la démonstration : aucune source n'a été trouvée.` },
];

const email = env("DEMO_A_EMAIL");
if (!email.endsWith("@example.com")) throw new Error("Le compte de démonstration doit être un compte fictif @example.com.");

const parisToday = todayParis();
const client = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });

const { error: signInError } = await client.auth.signInWithPassword({ email, password: env("DEMO_A_PASSWORD") });
if (signInError) throw new Error(`Connexion impossible : ${signInError.message}`);

let written = 0;
for (const rule of DEMO_RULES) {
  // Toute règle en vigueur pour cette clé (quel que soit son statut) : on n'écrase ni ne clôt rien (create_rule_version fermerait l'ancienne version).
  const existing = await client.from("regulatory_rules").select("status").eq("rule_key", rule.key).eq("activity_category", "bnc").is("effective_to", null);
  if (existing.error) throw new Error(`Lecture impossible (${rule.key}) : ${existing.error.code}`);
  if (existing.data.length > 0) {
    console.log(`= ${rule.key} : une règle « ${existing.data[0].status} » est déjà en vigueur, laissée telle quelle`);
    continue;
  }
  console.log(`${DRY ? "(à écrire)" : "+"} ${rule.key} : ${JSON.stringify(rule.params)}`);
  if (DRY) continue;
  const { error } = await client.rpc("create_rule_version", {
    p_rule_key: rule.key,
    p_activity_category: "bnc",
    p_params: rule.params,
    p_effective_from: "2026-01-01",
    p_source: "DEMO",
    p_verified_on: parisToday,
    p_revalidate_after: REVALIDATE_AFTER,
    p_status: "essai",
    p_description: rule.description,
  });
  if (error) throw new Error(`Création impossible (${rule.key}) : ${error.code} ${error.message}`);
  written += 1;
}
console.log(DRY ? "Essai à blanc terminé : rien n'a été écrit." : `Terminé : ${written} règle(s) d'essai écrite(s).`);
await client.auth.signOut({ scope: "local" });
