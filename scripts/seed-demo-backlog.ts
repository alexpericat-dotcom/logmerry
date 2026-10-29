/**
 * Backlog FICTIF du compte de démonstration A : missions explicites, user stories, sprints et tâches.
 * npm run seed:backlog           écrit (après `npm run seed:activity`, qui crée les fiches et les missions)
 * npm run seed:backlog -- --dry  affiche ce qui serait écrit, sans rien écrire
 *
 * Tout est inventé (clients, besoins, dates relatives à aujourd'hui). Les missions de `seed-demo-activity.ts` sont retrouvées par leur ancien titre court,
 * puis renommées avec un titre explicite et datées ; leurs stories, sprints et tâches sont créés.
 * Idempotent : si la mission « Automatisation des inscriptions… » a déjà des stories, rien n'est écrit. Se connecte avec la clé PUBLIQUE ;
 * refuse un compte hors @example.com. Identifiants : .env.test.local (ignoré par git).
 *
 * Les sprints clos sont créés « planifiés », remplis, puis clos (la base refuse d'ajouter une story à un sprint clos).
 * Tâches : une story faite a toutes ses tâches cochées, une story en cours en a coché la moitié, une story à faire aucune.
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

const today = todayParis();
const d = (n: number) => addDays(today, n);

type Status = "todo" | "in_progress" | "done";
/** [titre, rôle, bénéfice, critères d'acceptation, points, statut, indice du sprint (null : backlog), tâches] */
type Story = [string, string, string, string[], 1 | 2 | 3 | 5 | 8 | 13, Status, number | null, string[]];
type Sprint = { name: string; goal: string; from: number; to: number; status: "closed" | "active" | "planned" };
type Mission = { was: string; title: string; start: number; end: number; sprints: Sprint[]; stories: Story[] };

const MISSIONS: Mission[] = [
  {
    was: "Automatisation des inscriptions",
    title: "Automatisation des inscriptions aux ateliers : formulaire, e-mails et tableau de suivi",
    start: -60,
    end: 30,
    sprints: [
      { name: "Sprint 1 : formulaire et base", goal: "Un formulaire d'inscription en ligne qui alimente la base des participants.", from: -56, to: -43, status: "closed" },
      { name: "Sprint 2 : e-mails automatiques", goal: "Confirmation et rappel envoyés sans intervention manuelle.", from: -42, to: -29, status: "closed" },
      { name: "Sprint 3 : liste d'attente et paiements", goal: "Gérer la liste d'attente et suivre les paiements des places.", from: -7, to: 6, status: "active" },
      { name: "Sprint 4 : tableau de bord et recette", goal: "Donner à l'équipe un tableau de bord et valider l'ensemble avec elle.", from: 7, to: 20, status: "planned" },
    ],
    stories: [
      ["S'inscrire à un atelier depuis une page web", "participant", "réserver ma place sans appeler l'atelier", ["Le formulaire demande le nom, l'e-mail, l'atelier et le nombre de places", "Une inscription crée une ligne dans la base en moins de 10 secondes", "Un e-mail invalide est refusé avec un message clair"], 5, "done", 0, ["Dessiner le formulaire dans Tally", "Créer la table Participants dans Airtable", "Relier le formulaire à la table", "Tester avec cinq inscriptions fictives"]],
      ["Voir la liste des inscrits par atelier", "animatrice de l'atelier", "préparer le matériel selon le nombre de personnes", ["Une vue filtrée par atelier existe", "Le nombre d'inscrits et de places restantes s'affiche en tête"], 3, "done", 0, ["Créer la vue filtrée", "Ajouter le décompte des places restantes"]],
      ["Recevoir un e-mail de confirmation", "participant", "avoir la preuve que ma place est réservée", ["L'e-mail part dans les 2 minutes", "Il rappelle la date, le lieu et le nombre de places", "Il contient un lien pour écrire à l'atelier"], 3, "done", 1, ["Rédiger le modèle d'e-mail", "Créer le scénario Make déclenché par une nouvelle inscription", "Tester avec trois adresses"]],
      ["Recevoir un rappel 48 heures avant l'atelier", "participant", "ne pas oublier la date", ["Le rappel part 48 heures avant, pas avant", "Aucun rappel pour une inscription annulée"], 2, "done", 1, ["Programmer le scénario de rappel", "Exclure les inscriptions annulées"]],
      ["Être mis sur liste d'attente quand l'atelier est complet", "participant", "avoir une chance d'obtenir une place libérée", ["Quand le nombre de places est atteint, l'inscription passe en liste d'attente", "Le participant est prévenu qu'il est en liste d'attente", "L'ordre d'arrivée est conservé"], 5, "in_progress", 2, ["Ajouter le statut « liste d'attente »", "Calculer les places restantes à chaque inscription", "Rédiger l'e-mail de liste d'attente"]],
      ["Être prévenu automatiquement quand une place se libère", "participant en liste d'attente", "saisir la place avant qu'elle soit reprise", ["Le premier de la liste reçoit un e-mail à la libération d'une place", "Il a 24 heures pour confirmer, puis la place passe au suivant"], 5, "todo", 2, ["Détecter une annulation", "Écrire le scénario de proposition de place", "Gérer le délai de 24 heures"]],
      ["Suivre quels participants ont payé", "gestionnaire de l'atelier", "relancer uniquement les impayés", ["Une colonne « payé » existe pour chaque inscription", "Une vue liste les impayés de plus de 7 jours"], 3, "in_progress", 2, ["Ajouter la colonne « payé »", "Créer la vue des impayés"]],
      ["Consulter un tableau de bord des inscriptions", "gestionnaire de l'atelier", "décider d'ouvrir une session supplémentaire", ["Le tableau montre les inscrits par atelier et par semaine", "Les ateliers presque complets sont signalés"], 5, "todo", 3, ["Choisir les indicateurs", "Construire le tableau dans Airtable", "Le faire relire par la gestionnaire"]],
      ["Exporter la liste des inscrits en CSV", "animatrice de l'atelier", "l'imprimer pour l'accueil", ["Le fichier contient nom, e-mail et nombre de places", "Il ne contient que l'atelier choisi"], 2, "todo", null, ["Créer la vue d'export", "Vérifier l'encodage des accents"]],
      ["Annuler son inscription depuis l'e-mail de confirmation", "participant", "libérer ma place si je ne peux plus venir", ["Un lien d'annulation figure dans l'e-mail", "L'annulation libère la place et déclenche la liste d'attente"], 5, "todo", null, ["Créer le lien d'annulation sécurisé", "Mettre à jour le statut et le décompte"]],
      ["Envoyer un questionnaire de satisfaction après l'atelier", "gestionnaire de l'atelier", "améliorer les prochains ateliers", ["Le questionnaire part le lendemain de l'atelier", "Les réponses sont rassemblées dans une même table"], 3, "todo", null, ["Rédiger cinq questions", "Programmer l'envoi du lendemain"]],
    ],
  },
  {
    was: "Suivi de commandes no-code",
    title: "Suivi des commandes de la boutique : application mobile no-code et alertes de livraison",
    start: -60,
    end: 35,
    sprints: [
      { name: "Sprint 1 : catalogue et commandes", goal: "Saisir et retrouver une commande depuis un téléphone.", from: -45, to: -32, status: "closed" },
      { name: "Sprint 2 : suivi de livraison", goal: "Suivre l'état de chaque commande jusqu'à la livraison.", from: -6, to: 7, status: "active" },
      { name: "Sprint 3 : alertes aux clients", goal: "Prévenir les clients et repérer les retards.", from: 8, to: 21, status: "planned" },
    ],
    stories: [
      ["Saisir une commande depuis mon téléphone", "gérante de la boutique", "ne plus noter les commandes sur papier", ["La saisie tient en moins d'une minute", "Le client, les articles et la date de livraison souhaitée sont enregistrés", "Une commande sans client est refusée"], 5, "done", 0, ["Créer les tables Clients, Articles et Commandes", "Construire l'écran de saisie dans Glide", "Tester sur deux téléphones"]],
      ["Voir les commandes à préparer aujourd'hui", "préparateur de commandes", "préparer dans l'ordre d'urgence", ["La liste est triée par date de livraison", "Les commandes déjà préparées n'y figurent pas"], 3, "done", 0, ["Créer la vue « à préparer »", "Trier par date de livraison"]],
      ["Changer le statut d'une commande (préparée, expédiée, livrée)", "préparateur de commandes", "que tout le monde voie l'avancement", ["Trois boutons changent le statut d'une commande", "La date de chaque changement est conservée"], 3, "in_progress", 1, ["Ajouter les boutons de statut", "Enregistrer l'historique des changements", "Tester le retour en arrière"]],
      ["Enregistrer le numéro de suivi du transporteur", "gérante de la boutique", "répondre vite à un client qui demande où est son colis", ["Le numéro de suivi se saisit à l'expédition", "Un lien ouvre la page du transporteur"], 2, "done", 1, ["Ajouter le champ", "Générer le lien de suivi"]],
      ["Prévenir le client par SMS quand sa commande part", "client de la boutique", "organiser ma réception", ["Le SMS part au passage au statut « expédiée »", "Il contient le numéro de suivi", "Un client sans téléphone ne reçoit rien et aucune erreur n'apparaît"], 5, "todo", 2, ["Choisir le service de SMS", "Écrire le scénario Make", "Gérer le cas sans numéro"]],
      ["Voir les commandes en retard de plus de 3 jours", "gérante de la boutique", "traiter les retards avant les réclamations", ["Une vue liste les commandes non livrées après 3 jours", "Le nombre de jours de retard est affiché"], 3, "todo", 2, ["Calculer le retard", "Créer la vue des retards"]],
      ["Retrouver une commande par nom du client", "gérante de la boutique", "répondre au téléphone sans chercher", ["La recherche accepte un nom partiel", "Elle ignore les accents et les majuscules"], 2, "todo", null, ["Ajouter la barre de recherche", "Tester avec des noms accentués"]],
      ["Imprimer une étiquette d'expédition", "préparateur de commandes", "gagner du temps au colisage", ["L'étiquette contient l'adresse et le numéro de commande", "Elle s'imprime depuis le téléphone"], 8, "todo", null, ["Choisir le format d'étiquette", "Générer le PDF depuis les données", "Tester l'impression"]],
      ["Suivre le chiffre d'affaires par semaine", "gérante de la boutique", "voir si le mois se présente bien", ["Un graphique montre le total des commandes par semaine", "Il compare avec la semaine précédente"], 5, "todo", null, ["Calculer les totaux", "Construire le graphique"]],
    ],
  },
  {
    was: "Base de connaissances interne (RAG)",
    title: "Base de connaissances interne du cabinet : recherche et assistant IA avec sources",
    start: -60,
    end: 40,
    sprints: [
      { name: "Sprint 1 : rassembler les documents", goal: "Réunir et découper les procédures du cabinet.", from: -50, to: -37, status: "closed" },
      { name: "Sprint 2 : indexation et recherche", goal: "Retrouver un document par mot-clé et par sens.", from: -36, to: -23, status: "closed" },
      { name: "Sprint 3 : assistant avec sources", goal: "Répondre aux questions en citant les sources, ou refuser.", from: -5, to: 8, status: "active" },
    ],
    stories: [
      ["Importer les procédures internes du cabinet", "assistante administrative", "retrouver une procédure au même endroit", ["Les documents Word et PDF sont importés sans perte de texte", "Chaque document garde son titre et sa date"], 5, "done", 0, ["Lister les documents à importer", "Écrire la procédure d'import", "Importer un premier lot de 20 documents"]],
      ["Découper les documents en extraits indexables", "consultant no-code", "obtenir des réponses précises plutôt que des documents entiers", ["Un extrait fait environ une page", "Le titre du document est gardé avec chaque extrait"], 5, "done", 0, ["Choisir la taille des extraits", "Tester sur trois documents longs"]],
      ["Rechercher par mot-clé dans la base", "collaborateur du cabinet", "trouver un document en quelques secondes", ["Une recherche rend les extraits qui contiennent les mots tapés", "Les accents sont ignorés"], 3, "done", 1, ["Créer la recherche par mots", "Tester les accents"]],
      ["Rechercher par sens, même avec d'autres mots", "collaborateur du cabinet", "trouver une réponse même si je ne connais pas le titre", ["Une question en langage courant rend les extraits proches", "Les résultats d'un autre utilisateur ne sont jamais visibles"], 8, "done", 1, ["Calculer les représentations des extraits", "Créer la recherche par proximité", "Vérifier le cloisonnement par compte"]],
      ["Poser une question à l'assistant", "collaborateur du cabinet", "avoir une réponse sans lire dix documents", ["La réponse arrive en moins de 20 secondes", "Elle s'appuie uniquement sur les extraits retrouvés"], 8, "in_progress", 2, ["Écrire la consigne de l'assistant", "Brancher la recherche à la réponse", "Mesurer le temps de réponse"]],
      ["Voir les sources citées sous chaque réponse", "collaborateur du cabinet", "vérifier d'où vient l'information", ["Chaque réponse liste les documents utilisés", "Un clic ouvre le document source"], 5, "in_progress", 2, ["Renvoyer les sources avec la réponse", "Afficher les sources sous la réponse"]],
      ["Refuser de répondre quand aucune source ne convient", "associé du cabinet", "ne jamais donner une réponse inventée", ["Sans extrait assez proche, l'assistant dit qu'il ne sait pas", "Il propose de reformuler la question"], 5, "todo", 2, ["Définir un seuil de proximité", "Rédiger le message de refus", "Tester avec dix questions hors sujet"]],
      ["Garder l'historique de mes questions", "collaborateur du cabinet", "reprendre une recherche commencée hier", ["Les conversations sont listées par date", "Je peux effacer mon historique"], 3, "todo", null, ["Enregistrer les échanges", "Afficher la liste des conversations"]],
      ["Mettre à jour un document sans tout réindexer", "assistante administrative", "garder la base à jour facilement", ["Modifier un document ne recalcule que ses extraits", "Les anciens extraits ne sont plus proposés"], 8, "todo", null, ["Détecter les documents modifiés", "Remplacer uniquement leurs extraits"]],
      ["Mesurer le taux de bonnes réponses sur 20 questions test", "associé du cabinet", "décider si l'outil est assez fiable pour l'équipe", ["Vingt questions avec leur source attendue sont rédigées", "Le taux de bonnes réponses est calculé et noté"], 5, "todo", null, ["Rédiger les 20 questions", "Lancer la mesure", "Noter le résultat"]],
    ],
  },
  {
    was: "Audit des outils",
    title: "Audit des outils numériques du studio et plan de simplification",
    start: 14,
    end: 45,
    sprints: [{ name: "Sprint 1 : inventaire des outils", goal: "Savoir quels outils l'équipe utilise et ce qu'ils coûtent.", from: 14, to: 27, status: "planned" }],
    stories: [
      ["Lister tous les outils utilisés par l'équipe", "directrice du studio", "savoir ce que nous utilisons vraiment", ["Chaque outil a un nom, un usage et un responsable", "Les outils utilisés en doublon sont repérés"], 3, "todo", 0, ["Préparer le tableau d'inventaire", "Remplir avec chaque membre de l'équipe"]],
      ["Relever le coût mensuel de chaque outil", "directrice du studio", "repérer les abonnements inutiles", ["Le coût mensuel et la date de renouvellement figurent pour chaque outil", "Le total mensuel est calculé"], 3, "todo", 0, ["Rassembler les factures", "Calculer le total mensuel"]],
      ["Cartographier le parcours d'un projet client", "cheffe de projet", "voir où l'on perd du temps", ["Le parcours est dessiné de la demande à la facture", "Chaque étape indique l'outil utilisé"], 5, "todo", 0, ["Interroger la cheffe de projet", "Dessiner le parcours", "Le faire relire"]],
      ["Interroger l'équipe sur ses irritants", "membre de l'équipe", "que mes difficultés soient prises en compte", ["Un court questionnaire est envoyé à toute l'équipe", "Les réponses sont regroupées par thème"], 3, "todo", null, ["Rédiger le questionnaire", "Regrouper les réponses"]],
      ["Proposer un plan de simplification chiffré", "directrice du studio", "décider quoi garder, remplacer ou supprimer", ["Chaque outil est classé : garder, remplacer ou supprimer", "L'économie mensuelle estimée est indiquée comme estimation"], 8, "todo", null, ["Classer les outils", "Estimer l'économie", "Rédiger le plan"]],
      ["Présenter les conclusions en réunion d'équipe", "directrice du studio", "embarquer l'équipe dans les changements", ["Une présentation de quinze minutes est prête", "Les questions de l'équipe sont notées"], 2, "todo", null, ["Préparer la présentation", "Animer la réunion"]],
    ],
  },
  {
    was: "Tableau de bord des ventes",
    title: "Tableau de bord des ventes en ligne (Looker Studio)",
    start: -140,
    end: -110,
    sprints: [
      { name: "Sprint 1 : connexion des données", goal: "Alimenter le tableau de bord automatiquement.", from: -140, to: -127, status: "closed" },
      { name: "Sprint 2 : graphiques et partage", goal: "Rendre les chiffres lisibles et partagés avec l'équipe.", from: -126, to: -113, status: "closed" },
    ],
    stories: [
      ["Connecter la billetterie au tableau de bord", "gérante de l'atelier", "voir les ventes sans export manuel", ["Les ventes se mettent à jour chaque nuit", "Un échec de mise à jour est signalé par e-mail"], 5, "done", 0, ["Créer la connexion à la billetterie", "Planifier la mise à jour de nuit", "Ajouter l'alerte d'échec"]],
      ["Voir les ventes par jour et par atelier", "gérante de l'atelier", "savoir quels ateliers se vendent bien", ["Un graphique par jour et un tableau par atelier", "Un filtre par période"], 3, "done", 0, ["Construire le graphique par jour", "Construire le tableau par atelier"]],
      ["Comparer avec le mois précédent", "gérante de l'atelier", "voir si l'activité progresse", ["Chaque total affiche l'écart avec le mois précédent", "Un écart négatif est signalé par une icône et un mot, pas par la couleur seule"], 3, "done", 1, ["Calculer l'écart", "Ajouter l'indicateur lisible"]],
      ["Partager le tableau avec l'équipe en lecture seule", "membre de l'équipe", "consulter les chiffres sans pouvoir les casser", ["Un lien de partage existe, sans droit de modification", "Il se révoque en un clic"], 2, "done", 1, ["Configurer le partage", "Tester avec un compte de l'équipe"]],
      ["Recevoir un résumé chaque lundi par e-mail", "gérante de l'atelier", "démarrer la semaine avec les chiffres en tête", ["L'e-mail part le lundi à 8 heures", "Il contient les cinq chiffres clés de la semaine passée"], 3, "done", 1, ["Choisir les cinq chiffres", "Programmer l'envoi du lundi"]],
    ],
  },
  {
    was: "Newsletter automatisée",
    title: "Newsletter mensuelle automatisée (Brevo et Make)",
    start: -120,
    end: -90,
    sprints: [
      { name: "Sprint 1 : abonnés et modèle", goal: "Collecter les abonnés avec leur accord et préparer le modèle.", from: -120, to: -107, status: "closed" },
      { name: "Sprint 2 : envoi automatique", goal: "Composer et envoyer la newsletter sans intervention manuelle.", from: -106, to: -93, status: "closed" },
    ],
    stories: [
      ["Collecter les adresses des abonnés avec leur accord", "gérante de la boutique", "respecter la réglementation sur les données personnelles", ["Le formulaire contient une case d'accord non cochée par défaut", "La date de l'accord est conservée"], 3, "done", 0, ["Créer le formulaire d'abonnement", "Enregistrer la date de l'accord"]],
      ["Composer la newsletter à partir d'un modèle", "gérante de la boutique", "gagner du temps chaque mois", ["Le modèle reprend le logo et les couleurs de la boutique", "Seuls les textes et les images changent d'un mois à l'autre"], 3, "done", 0, ["Dessiner le modèle dans Brevo", "Tester l'affichage sur téléphone"]],
      ["Alimenter la newsletter avec les nouveautés du catalogue", "gérante de la boutique", "ne pas recopier les produits à la main", ["Les nouveautés du mois sont insérées automatiquement", "Un produit sans photo est ignoré"], 5, "done", 1, ["Lire le catalogue avec Make", "Insérer les produits dans le modèle", "Ignorer les produits sans photo"]],
      ["Programmer l'envoi le premier mardi du mois", "gérante de la boutique", "que la newsletter parte à date fixe", ["L'envoi part le premier mardi à 9 heures", "Un envoi de test précède l'envoi réel"], 2, "done", 1, ["Programmer le scénario", "Envoyer un test à l'équipe"]],
      ["Se désabonner en un clic", "abonné à la newsletter", "ne plus recevoir de messages dont je ne veux plus", ["Chaque e-mail contient un lien de désabonnement", "Le désabonnement est pris en compte immédiatement"], 2, "done", 1, ["Ajouter le lien dans le modèle", "Vérifier la prise en compte"]],
    ],
  },
];

const counts = MISSIONS.reduce((n, m) => ({ sprints: n.sprints + m.sprints.length, stories: n.stories + m.stories.length, tasks: n.tasks + m.stories.reduce((t, s) => t + s[7].length, 0) }), { sprints: 0, stories: 0, tasks: 0 });
console.log(`${DRY ? "(à écrire)" : "+"} ${MISSIONS.length} missions explicites, ${counts.sprints} sprints, ${counts.stories} user stories, ${counts.tasks} tâches`);

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
const { error: signInError } = await db.auth.signInWithPassword({ email, password: env("DEMO_A_PASSWORD") });
if (signInError) throw new Error(`Connexion impossible : ${signInError.message}`);

function ok<T>(what: string, r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error || r.data === null) throw new Error(`${what} : ${r.error?.message ?? "aucune ligne"}`);
  return r.data as NonNullable<T>;
}

const first = MISSIONS[0];
const existing = ok("lecture des missions", await db.from("missions").select("id, title").in("title", MISSIONS.flatMap((m) => [m.was, m.title])));
const byTitle = new Map(existing.map((m) => [m.title, m.id]));
const firstId = byTitle.get(first.title) ?? byTitle.get(first.was);
if (firstId) {
  const has = ok("lecture des stories", await db.from("user_stories").select("id").eq("mission_id", firstId).limit(1));
  if (has.length) {
    console.log("= Le backlog de démonstration existe déjà : rien à écrire.");
    await db.auth.signOut({ scope: "local" });
    process.exit(0);
  }
}
const missing = MISSIONS.filter((m) => !byTitle.has(m.was) && !byTitle.has(m.title));
if (missing.length) throw new Error(`Missions introuvables (lancer d'abord « npm run seed:activity ») : ${missing.map((m) => m.was).join(", ")}`);
if (DRY) {
  console.log("Essai à blanc terminé : rien n'a été écrit.");
  await db.auth.signOut({ scope: "local" });
  process.exit(0);
}

for (const m of MISSIONS) {
  const id = (byTitle.get(m.title) ?? byTitle.get(m.was)) as string;
  ok(`mission « ${m.title} »`, await db.from("missions").update({ title: m.title, start_date: d(m.start), end_date: d(m.end) }).eq("id", id).select("id"));

  // Sprints : tous « planifiés » sauf l'actif ; les sprints clos le deviennent après avoir reçu leurs stories.
  const sprintIds: string[] = [];
  for (const s of m.sprints) {
    const row = ok(s.name, await db.from("sprints").insert({ mission_id: id, name: s.name, goal: s.goal, start_date: d(s.from), end_date: d(s.to), status: s.status === "active" ? "active" : "planned" }).select("id").single());
    sprintIds.push(row.id);
  }

  let position = 0;
  for (const [title, role, benefit, criteria, points, status, sprint, tasks] of m.stories) {
    const story = ok(title, await db.from("user_stories").insert({
      mission_id: id, title, role, benefit, acceptance_criteria: criteria.map((c) => `- ${c}`).join("\n"), points, status,
      sprint_id: sprint === null ? null : sprintIds[sprint], position: position++,
    }).select("id").single());
    const rows = ok("tâches", await db.from("tasks").insert(tasks.map((t, i) => ({ story_id: story.id, title: t, position: i }))).select("id, position"));
    const doneCount = status === "done" ? tasks.length : status === "in_progress" ? Math.floor(tasks.length / 2) : 0;
    const doneIds = rows.filter((r) => r.position < doneCount).map((r) => r.id);
    if (doneIds.length) ok("tâches faites", await db.from("tasks").update({ done: true }).in("id", doneIds).select("id"));
  }

  for (const [i, s] of m.sprints.entries()) if (s.status === "closed") ok(`clôture de ${s.name}`, await db.from("sprints").update({ status: "closed" }).eq("id", sprintIds[i]).select("id"));
  console.log(`+ ${m.title} : ${m.sprints.length} sprint(s), ${m.stories.length} stories`);
}

console.log("Terminé : backlog fictif écrit.");
await db.auth.signOut({ scope: "local" });
