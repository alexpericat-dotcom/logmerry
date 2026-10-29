import { createClient } from "@supabase/supabase-js";

/**
 * Comptes FICTIFS des tests qui écrivent dans la vraie base (isolation, fuites, purge, essais réels) : `TEST_A_*` et `TEST_B_*` dans `.env.test.local`.
 * Ils sont distincts du compte de démonstration (`DEMO_A_*`, celui qu'on regarde dans l'application) : ces tests laissent des lignes qu'une règle de la base
 * ne laisse pas supprimer (devis envoyés ou acceptés) et pollueraient la démo. Un test refuse de tourner si le compte de test est un compte de démonstration
 * (ceux de l'environnement, et les deux adresses de démonstration connues, même si les variables DEMO_* ne sont pas chargées).
 */
const KNOWN_DEMO = ["demo-a@example.com", "demo-b@example.com"];
const clean = (v: string | undefined) => (v ?? "").trim().toLowerCase();

export function testAccount(who: "A" | "B"): { email: string; password: string } {
  const email = clean(process.env[`TEST_${who}_EMAIL`]);
  const password = process.env[`TEST_${who}_PASSWORD`] ?? "";
  if (!email || !password) {
    throw new Error(`Compte de test ${who} manquant : définis TEST_${who}_EMAIL et TEST_${who}_PASSWORD dans .env.test.local (voir .env.test.local.example). Ce ne doit PAS être le compte de démonstration.`);
  }
  if (!/^[^@\s]+@example\.com$/.test(email)) throw new Error(`Le compte de test ${who} doit être un compte fictif @example.com (une seule arobase).`);
  const demos = [...KNOWN_DEMO, clean(process.env.DEMO_A_EMAIL), clean(process.env.DEMO_B_EMAIL)].filter(Boolean);
  if (demos.includes(email)) throw new Error(`Le compte de test ${who} (${email}) est un compte de démonstration : crée des comptes de test séparés.`);
  if (who === "B" && email === clean(process.env.TEST_A_EMAIL)) throw new Error("Les comptes de test A et B sont identiques : l'isolation entre deux comptes ne serait pas testée.");
  return { email, password };
}

const needEnv = (name: string, failurePrefix = "") => {
  const value = process.env[name];
  if (!value) throw new Error(`${failurePrefix}variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
};

/**
 * Se connecte à la vraie base avec le compte de TEST A ou B (jamais le compte de démonstration : `testAccount` refuse). Un seul endroit pour tous les tests
 * et scripts qui écrivent dans la vraie base. `failurePrefix` ouvre le message d'échec (ex. « TEST NON CONCLUANT : »). Rend le client connecté et l'identifiant du compte.
 */
export async function signInTestAccount(who: "A" | "B", failurePrefix = "") {
  const { email, password } = testAccount(who);
  const client = createClient(needEnv("NEXT_PUBLIC_SUPABASE_URL", failurePrefix), needEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", failurePrefix), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`${failurePrefix}connexion impossible pour compte de test ${who} : ${error?.message ?? "pas d'utilisateur"}`);
  return { client, userId: data.user.id };
}
