/**
 * Mission FICTIVE « terminée, sans facture » du compte de démonstration A, pour montrer le rappel « Facturer » du cockpit (règle 8).
 * npm run seed:to-invoice           écrit la mission (client « Studio Kōri (démo) », un sprint clos, trois stories faites) ; sans devis ni facture
 * npm run seed:to-invoice -- --dry  affiche ce qui serait écrit, sans rien écrire
 *
 * Idempotent : si la mission existe déjà, rien n'est écrit. Nécessite `npm run seed:activity` (la fiche du client). Se connecte avec la clé PUBLIQUE ;
 * refuse un compte hors @example.com. Identifiants : .env.test.local (ignoré par git). Dates relatives à aujourd'hui.
 */
import { createClient } from "@supabase/supabase-js";

import { addDays } from "../lib/domain/dates.ts";
import { todayParis } from "../lib/format.ts";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
}

const DRY = process.argv.includes("--dry");
const email = env("DEMO_A_EMAIL");
if (!email.endsWith("@example.com")) throw new Error("Le compte de démonstration doit être un compte fictif @example.com.");

const d = (n: number) => addDays(todayParis(), n);
const TITLE = "Site vitrine et prise de rendez-vous en ligne (WordPress)";
const STORIES: [string, string, string, string[], string[]][] = [
  ["Présenter les prestations du studio sur une page", "visiteur du site", "comprendre ce que le studio propose", ["Une page liste chaque prestation avec son prix indicatif"], ["Rédiger les textes", "Mettre en page la page Prestations"]],
  ["Réserver un rendez-vous en ligne", "visiteur du site", "ne pas avoir à téléphoner", ["Le visiteur choisit un créneau libre", "Le studio reçoit un e-mail de confirmation"], ["Brancher l'agenda de réservation", "Tester une réservation de bout en bout"]],
  ["Recevoir un rappel avant le rendez-vous", "visiteur du site", "ne pas oublier le rendez-vous", ["Un rappel part la veille"], ["Programmer le rappel de la veille"]],
];

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
const { error: signInError } = await db.auth.signInWithPassword({ email, password: env("DEMO_A_PASSWORD") });
if (signInError) throw new Error(`Connexion impossible : ${signInError.message}`);

function ok<T>(what: string, r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error || r.data === null) throw new Error(`${what} : ${r.error?.message ?? "aucune ligne"}`);
  return r.data as NonNullable<T>;
}

const already = ok("lecture de la mission", await db.from("missions").select("id").eq("title", TITLE).limit(1));
if (already.length) {
  console.log(`= « ${TITLE} » existe déjà : rien à écrire.`);
} else {
  const kori = ok("fiche Studio Kōri", await db.from("clients").select("id").eq("name", "Studio Kōri (démo)").limit(1));
  if (!kori.length) throw new Error("Fiche « Studio Kōri (démo) » introuvable : lancer d'abord « npm run seed:activity ».");
  console.log(`${DRY ? "(à écrire)" : "+"} ${TITLE} : terminée, 1 sprint clos, ${STORIES.length} stories faites, sans devis ni facture`);
  if (!DRY) {
    const mission = ok(TITLE, await db.from("missions").insert({ client_id: kori[0].id, title: TITLE, status: "done", start_date: d(-75), end_date: d(-9) }).select("id").single());
    // Sprint « planifié » rempli puis clos : la base refuse d'ajouter une story à un sprint clos.
    const sprint = ok("sprint", await db.from("sprints").insert({ mission_id: mission.id, name: "Sprint 1 : pages et réservation", goal: "Mettre en ligne le site et la prise de rendez-vous.", start_date: d(-30), end_date: d(-17), status: "planned" }).select("id").single());
    for (const [i, [title, role, benefit, criteria, tasks]] of STORIES.entries()) {
      const story = ok(title, await db.from("user_stories").insert({ mission_id: mission.id, title, role, benefit, acceptance_criteria: criteria.map((c) => `- ${c}`).join("\n"), points: 3, status: "done", sprint_id: sprint.id, position: i }).select("id").single());
      const rows = ok("tâches", await db.from("tasks").insert(tasks.map((t, k) => ({ story_id: story.id, title: t, position: k }))).select("id"));
      ok("tâches faites", await db.from("tasks").update({ done: true }).in("id", rows.map((r) => r.id)).select("id"));
    }
    ok("clôture du sprint", await db.from("sprints").update({ status: "closed" }).eq("id", sprint.id).select("id"));
    console.log("Terminé : le cockpit doit proposer « Facturer la mission … ».");
  }
}
await db.auth.signOut({ scope: "local" });
