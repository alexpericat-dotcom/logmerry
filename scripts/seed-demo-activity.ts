/**
 * Activité FICTIVE du compte de démonstration A : clients, missions, devis, factures, encaissements, échéances.
 * npm run seed:activity           purge les restes de tests (« [essai-ui] », « [isolation-test] ») puis écrit l'activité
 * npm run seed:activity -- --dry  affiche ce qui serait fait, sans rien écrire
 *
 * Tout est inventé (noms, montants, dates relatives à aujourd'hui) ; les fiches portent l'origine « demo » et le suffixe « (démo) ».
 * Idempotent : si la fiche « Atelier Lumière (démo) » existe, rien n'est écrit (la purge non plus ; une écriture interrompue se reprend en supprimant à la main les lignes « (démo) »). Se connecte avec la clé PUBLIQUE ; refuse un compte hors @example.com.
 */
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
}

const DRY = process.argv.includes("--dry");
const email = env("DEMO_A_EMAIL");
if (!email.endsWith("@example.com")) throw new Error("Le compte de démonstration doit être un compte fictif @example.com.");

const EUR = (n: number) => Math.round(n * 100);
const parisToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
/** Jour décalé de `n` jours (calcul en UTC sur la date seule : pas de décalage d'heure d'été). */
const day = (n: number, from = parisToday) => new Date(Date.parse(`${from}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const year = Number(parisToday.slice(0, 4));
const thisMonth = Number(parisToday.slice(5, 7));
const ofMonth = (m: number, d: number) => `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
const { error: signInError } = await db.auth.signInWithPassword({ email, password: env("DEMO_A_PASSWORD") });
if (signInError) throw new Error(`Connexion impossible : ${signInError.message}`);

function ok<T>(what: string, r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error || r.data === null) throw new Error(`${what} : ${r.error?.message ?? "aucune ligne"}`);
  return r.data as NonNullable<T>;
}

const already = await db.from("clients").select("id").eq("name", "Atelier Lumière (démo)").limit(1);
if (already.error) throw new Error(`Lecture impossible : ${already.error.message}`);
if (already.data?.length) {
  console.log("= L'activité de démonstration existe déjà : rien à écrire.");
  process.exit(0);
}

// 1. Restes de tests : on retire dans l'ordre des dépendances (encaissements, factures, devis, missions, fiches).
const junk = (col: string) => `${col}.like.%[essai-ui]%,${col}.like.%[isolation-test]%`; // marqueurs de test seulement (les missions « Devis du … » créées par un vrai envoi ne sont pas touchées)
const junkClients = ok("lecture des fiches de test", await db.from("clients").select("id").or(junk("name")));
const junkMissions = ok("lecture des missions de test", await db.from("missions").select("id").or(junk("title")));
console.log(`${DRY ? "(à purger)" : "-"} ${junkClients.length} fiche(s) et ${junkMissions.length} mission(s) de test`);
if (!DRY) {
  const cIds = junkClients.map((c) => c.id);
  const byClient = cIds.length ? ok("missions des fiches de test", await db.from("missions").select("id").in("client_id", cIds)) : [];
  const mIds = [...new Set([...junkMissions, ...byClient].map((m) => m.id))];
  if (mIds.length) {
    const inv = ok("lecture des factures de test", await db.from("invoices").select("id").in("mission_id", mIds));
    if (inv.length) {
      ok("suppression des encaissements de test", await db.from("payments").delete().in("invoice_id", inv.map((i) => i.id)).select("id"));
      ok("suppression des factures de test", await db.from("invoices").delete().in("id", inv.map((i) => i.id)).select("id"));
    }
  }
  if (cIds.length) ok("suppression des devis de test", await db.from("quotes").delete().in("client_id", cIds).select("id"));
  if (mIds.length) ok("suppression des devis de missions de test", await db.from("quotes").delete().in("mission_id", mIds).select("id"));
  // Un devis envoyé ou accepté ne se supprime pas (règle de la base) : sa mission et sa fiche restent, et on le dit.
  let kept = 0;
  for (const id of mIds) if ((await db.from("missions").delete().eq("id", id)).error) kept += 1;
  for (const id of cIds) if ((await db.from("clients").delete().eq("id", id)).error) kept += 1;
  if (kept) console.log(`! ${kept} ligne(s) de test conservée(s) : un devis envoyé ou accepté ne se supprime pas`);
}

// 2. Activité fictive.
const CLIENTS = [
  { key: "lumiere", name: "Atelier Lumière (démo)", status: "client" },
  { key: "verdier", name: "Maison Verdier (démo)", status: "client" },
  { key: "morel", name: "Cabinet Morel & Fils (démo)", status: "client" },
  { key: "kori", name: "Studio Kōri (démo)", status: "client" },
  { key: "epis", name: "Boulangerie Les Trois Épis (démo)", status: "prospect" },
  { key: "dupre", name: "Dupré Conseil (démo)", status: "prospect" },
  { key: "horizon", name: "Association Horizon (démo)", status: "prospect" },
] as const;
const MISSIONS = [
  { key: "inscriptions", client: "lumiere", title: "Automatisation des inscriptions", status: "in_progress" },
  { key: "commandes", client: "verdier", title: "Suivi de commandes no-code", status: "in_progress" },
  { key: "rag", client: "morel", title: "Base de connaissances interne (RAG)", status: "in_progress" },
  { key: "audit", client: "kori", title: "Audit des outils", status: "planned" },
  { key: "ventes", client: "lumiere", title: "Tableau de bord des ventes", status: "done" },
  { key: "newsletter", client: "verdier", title: "Newsletter automatisée", status: "done" },
] as const;
/** Factures soldées (une par mois jusqu'au mois en cours), puis trois factures ouvertes. Les mois futurs sont ignorés. */
const PAID = [
  { m: 1, mission: "ventes", cents: EUR(1800) },
  { m: 2, mission: "newsletter", cents: EUR(2400) },
  { m: 3, mission: "ventes", cents: EUR(1200) },
  { m: 4, mission: "newsletter", cents: EUR(3100) },
  { m: 5, mission: "ventes", cents: EUR(2600) },
  { m: 6, mission: "inscriptions", cents: EUR(1900) },
  { m: 8, mission: "commandes", cents: EUR(1500) },
  { m: 9, mission: "inscriptions", cents: EUR(2800) },
  { m: 10, mission: "commandes", cents: EUR(2200) },
].filter((p) => p.m <= thisMonth);
const DEADLINES = [
  { title: "Déclaration de chiffre d'affaires (URSSAF)", in: 2, category: "urssaf", source: "https://www.autoentrepreneur.urssaf.fr/" },
  { title: "Actualisation mensuelle (France Travail)", in: 9, category: "france_travail", source: "https://www.francetravail.fr/" },
  { title: "Rassembler les justificatifs de dépenses", in: 12, category: "supporting_documents", source: "https://www.service-public.fr/" },
  { title: "Renouvellement de l'assurance RC pro", in: 25, category: "renewals", source: "https://www.service-public.fr/" },
  { title: "Paiement de la CFE", in: 48, category: "cfe", source: "https://www.impots.gouv.fr/" },
] as const;

console.log(`${DRY ? "(à écrire)" : "+"} ${CLIENTS.length} fiches, ${MISSIONS.length} missions, 2 devis envoyés, ${PAID.length + 3} factures, ${DEADLINES.length} échéances`);
if (DRY) {
  await db.auth.signOut();
  process.exit(0);
}

const clientId: Record<string, string> = {};
for (const c of CLIENTS) clientId[c.key] = ok(c.name, await db.from("clients").insert({ name: c.name, status: c.status, origin: "demo" }).select("id").single()).id;

const missionId: Record<string, string> = {};
for (const m of MISSIONS) {
  const start = m.status === "planned" ? day(14) : day(-60);
  missionId[m.key] = ok(m.title, await db.from("missions").insert({ client_id: clientId[m.client], title: m.title, status: m.status, start_date: start }).select("id").single()).id;
}

// Devis : créés « brouillon » (la base n'accepte que cela), puis envoyés. Le premier est resté sans réponse depuis plus de 7 jours.
for (const q of [
  { client: "kori", mission: "audit", cents: EUR(1800), sent: day(-10) },
  { client: "epis", mission: null, cents: EUR(950), sent: day(-3) },
]) {
  const row = ok("devis", await db.from("quotes").insert({ client_id: clientId[q.client], mission_id: q.mission ? missionId[q.mission] : null, amount_ht_cents: q.cents }).select("id").single());
  ok("envoi du devis", await db.from("quotes").update({ status: "sent", sent_on: q.sent }).eq("id", row.id).select("id"));
}

async function invoice(mission: string, cents: number, issued: string, due: string, paid: { cents: number; on: string } | null) {
  const inv = ok("facture", await db.from("invoices").insert({ mission_id: missionId[mission], amount_ht_cents: cents, issued_on: issued, due_on: due }).select("id").single());
  if (paid) ok("encaissement", await db.from("payments").insert({ invoice_id: inv.id, amount_ht_cents: paid.cents, received_on: paid.on }).select("id").single());
}
for (const p of PAID) {
  const recent = day(-2);
  const received = p.m !== thisMonth ? ofMonth(p.m, 15) : recent.startsWith(parisToday.slice(0, 7)) ? recent : ofMonth(p.m, 1); // jamais en dehors du mois en cours
  await invoice(p.mission, p.cents, day(-20, received), received, { cents: p.cents, on: received });
}
await invoice("inscriptions", EUR(1500), day(-40), day(-10), null); // échue, non payée
await invoice("commandes", EUR(2100), day(-24), day(6), null); // à encaisser bientôt
await invoice("rag", EUR(3000), day(-10), day(20), { cents: EUR(1000), on: day(-5) }); // acompte reçu

for (const d of DEADLINES) ok(d.title, await db.from("deadlines").insert({ title: d.title, due_on: day(d.in), category: d.category, source: d.source, note: "DEMO : date fictive." }).select("id").single());

console.log("Terminé : activité fictive écrite.");
await db.auth.signOut();
