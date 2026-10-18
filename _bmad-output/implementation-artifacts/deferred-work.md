- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-me-connecter-et-me-deconnecter.md`
  summary: Vérifier que le lien de réinitialisation (GET sur /auth/confirm) n'est pas consommé par un scanner d'e-mails.
  evidence: Le jeton est à usage unique ; un préchargement du lien par la messagerie le consommerait avant le clic. À tester au premier vrai e-mail ; remède possible : page de confirmation avec bouton (POST). Gravité estimée medium, non vérifiée.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-me-connecter-et-me-deconnecter.md`
  summary: Ajouter des tests de la route /auth/confirm et du garde du proxy quand un lanceur de tests sera installé.
  evidence: Seul lib/auth.ts est testé automatiquement ; la route et le proxy reposent sur des vérifications manuelles (curl local, liste de la preview), car ils exigent un client Supabase simulé.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-voir-mon-cockpit-vide-dans-la-barre-laterale.md`
  summary: Rappeler à chaque nouvelle page de `app/(app)/` de ne pas compter seulement sur la redirection du layout.
  evidence: Le layout redirige sous `Suspense`, en parallèle des pages enfants ; toute page qui lit des données doit passer par la RLS (`owner_id`) et son propre contrôle. À appliquer dès la story 2.1 (notes).
- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-creer-et-lister-mes-notes.md`
  summary: Tester `createNote` avec un client Supabase simulé et prouver la RLS de `notes` avec deux comptes.
  evidence: Aucun test n'atteint l'action ni les policies ; la story 2.3 livre le script à deux comptes (à rejouer après chaque migration). Ajouter alors les cas : sans session, titre vide, échec d'insertion, succès sans `owner_id`.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-creer-et-lister-mes-notes.md`
  summary: Paginer la liste des notes et ne charger qu'un début de texte.
  evidence: `listNotes` charge tout le texte de chaque note sans limite ; Supabase plafonne à 1 000 lignes par défaut. Sans effet avant quelques centaines de notes ; à traiter avec la recherche (2.4). Ajouter aussi `id` comme second critère de tri.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-creer-et-lister-mes-notes.md`
  summary: Ajouter une contrainte de longueur du texte (`body`) côté base.
  evidence: La limite de 50 000 caractères n'existe que dans `lib/domain/notes.ts` ; une contrainte demande une nouvelle migration (un fichier par changement), à grouper avec celle de la story 2.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-modifier-classer-supprimer-une-note.md`
  summary: Tester `updateNote`/`deleteNote` (session, zéro ligne, erreur) et vérifier en base le déclencheur `updated_at` et la contrainte de 50 000 caractères.
  evidence: Rien n'exécute ces cas automatiquement ; à regrouper avec le script à deux comptes de la story 2.3 (ajouter une mise à jour qui change `updated_at`, un texte trop long refusé, une suppression d'une note d'un autre compte qui n'affecte aucune ligne).
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-modifier-classer-supprimer-une-note.md`
  summary: Conserver le filtre de type (`?type=`) au retour sur la liste après modification, suppression ou « Annuler ».
  evidence: Ces actions renvoient sur `/notes` nu : l'utilisateur qui filtrait sur « Procédures » retombe sur « Toutes ». Sans importance avec peu de notes.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-deux-comptes-fictifs-ne-se-voient-pas.md`
  summary: Étendre `tests/isolation.test.ts` à chaque nouvelle table (clients, missions, factures, extraits, historique, réalisations…).
  evidence: Le script ne couvre que `notes` ; la règle de ta charte impose l'isolation sur toutes les tables, et la recherche vectorielle doit aussi filtrer par `owner_id`. À faire dans chaque story qui crée une table.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-deux-comptes-fictifs-ne-se-voient-pas.md`
  summary: Brancher `npm run test:isolation` sur une vérification avant déploiement quand une CI existera.
  evidence: Aucune CI aujourd'hui ; le rejeu après chaque migration dépend de la mémoire. Une action GitHub avec les deux comptes en secrets suffirait.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-1-preparer-le-serveur-pour-l-ia.md`
  summary: la fonction de recherche vectorielle (8.5) doit filtrer par `owner_id` sans perdre de résultats avec l'index HNSW.
  evidence: un index HNSW filtré après coup peut renvoyer moins de `k` lignes ; prévoir une sur-lecture ou le balayage itératif de pgvector, et un test avec plusieurs comptes.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-3-indexer-une-note-a-l-enregistrement.md`
  summary: tester `embedTexts` avec un `fetch` simulé (lots de 16 dans l'ordre, statut non OK, délai).
  evidence: seul l'appel réel (script jetable) le couvre ; une erreur d'ordre entre lots désalignerait extraits et vecteurs pour une note de plus de 16 extraits.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-5-retrouver-les-passages-pertinents.md`
  summary: passer `hnsw.iterative_scan` de `relaxed_order` à `strict_order` dans `match_chunks` quand le nombre d'extraits devient grand.
  evidence: `relaxed_order` peut ranger légèrement hors ordre les résultats de l'index ; la limite interne peut alors couper un extrait un peu plus proche. Sans effet tant que la table est petite (balayage séquentiel) ; modifier la fonction demande de recharger pgvector dans la migration (voir la note de la migration).

- source_spec: `_bmad-output/implementation-artifacts/spec-8-8-poser-une-question-a-l-assistant.md`
  summary: tester `retrieveChunks` avec un faux client Supabase et extraire l'index de la palette ⌘K en fonction pure testée.
  evidence: le mappage des champs, le titre de repli et le décalage d'index (+1 avec l'entrée de l'assistant) ne sont couverts que par les essais de bout en bout et à la main.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-8-poser-une-question-a-l-assistant.md`
  summary: tester `retrieveChunks` (échec de la voie par mots-clés ignoré, échec de la voie par sens fatal) avec un faux client.
  evidence: le comportement n'est couvert que par l'essai de bout en bout ; deux chemins asynchrones et une fusion dépendent de lui.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-10-retrouver-mon-historique.md`
  summary: ajouter un moyen d'effacer l'historique de l'assistant (et décider d'une durée de conservation).
  evidence: les questions tapées sont conservées sans limite ni moyen de les retirer ; la politique de suppression existe en base (aucune interface). À traiter avec la mention RGPD, avant toute donnée réelle.
- source_spec: `_bmad-output/implementation-artifacts/spec-8-10-retrouver-mon-historique.md`
  summary: index sur `message_citations.note_id` et `chunk_id`, et chargement de l'historique à l'ouverture du panneau.
  evidence: chaque suppression de note ou régénération d'extraits parcourt la table des citations (`on delete set null`) ; l'historique est relu à chaque chargement de la mise en page. Négligeable aujourd'hui.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-14-jeu-de-test-du-rag-et-score.md`
  summary: option `--runs N` pour `test:rag` (plusieurs passages, taux de réussite par question) et jeu de questions non vues pour ne pas régler l'assistant sur le jeu de test.
  evidence: le résultat varie d'une exécution à l'autre (18, 19, 20 observés) et la consigne a été réglée sur ce même jeu ; un score unique contre un seuil de 18 est instable.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-appliquer-le-theme-logmerry.md`
  summary: tester le contraste du texte sur les dégradés (Forest sur dégradé 1 et 2, Chalk sur dégradé 5) quand ils seront utilisés, avec le portfolio public et le bandeau du Cockpit.
  evidence: les paires validées de `DESIGN.md` (10,60 ; 7,47 ; 6,65) ne sont pas encore couvertes par un test, car aucun écran n'utilise ces dégradés avec du texte.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-gerer-mes-prospects-et-clients.md`
  summary: Téléphone et adresse (postale) d'un client ou d'un contact, et remarque libre sur une fiche.
  evidence: Non prévus par l'epic 3 (un contact n'a que nom et e-mail facultatif, story 3.2) ; Alex a demandé où seraient e-mail, coordonnées et adresse ; à décider avec la story 3.2.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-gerer-mes-prospects-et-clients.md`
  summary: Tester les Server Actions des notes et des fiches (zéro ligne touchée → « n'existe plus », session absente, identifiant invalide) avec `next/navigation` et `next/cache` remplacés.
  evidence: Retirer `.select("id")` ou inverser `data?.length` ferait afficher un succès sur une fiche d'un autre compte ; le test d'isolation ne vérifie que la base. Choix repris des notes (colle fine), à revoir.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-gerer-mes-prospects-et-clients.md`
  summary: Après l'envoi d'un formulaire (notes, fiches) : message de succès et focus sur le premier champ en erreur.
  evidence: Relecteur aveugle ; commun à tous les formulaires, à traiter avec l'accessibilité (story 7.2).
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-gerer-mes-prospects-et-clients.md`
  summary: Décider le comportement `on delete` des clés étrangères vers `clients` (missions, devis, factures) : refuser ou conserver, et le dire dans le message de suppression.
  evidence: Le message actuel dit « définitif » ; dès qu'une mission référence une fiche, la suppression doit être pensée (story 3.4).

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-ajouter-des-contacts-et-passer-un-prospect-en-client.md`
  summary: Adresse et téléphone sur la fiche client elle-même (entreprise), à saisir avec l'epic 4 (factures).
  evidence: Alex a dit « plus tard » ; l'adresse d'une entreprise appartient à la fiche plus qu'à un contact, et les factures en auront besoin.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-ajouter-des-contacts-et-passer-un-prospect-en-client.md`
  summary: « Contact principal » par fiche (un seul).
  evidence: Alex a dit « on garde pour plus tard » ; demande une règle de base garantissant l'unicité par fiche.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-ajouter-des-contacts-et-passer-un-prospect-en-client.md`
  summary: Tester aussi les Server Actions des contacts (ajout, modification, suppression) et `promoteToClient`, avec la même solution que pour les notes et les fiches.
  evidence: Relecteurs (lacune de vérification) : changer `promoteToClient` en `status: "prospect"` ou retirer `.select("id")` laisserait tous les tests passer.

- source_spec: idée d'Alex du 2026-10-15 (hors spec, à garder pour plus tard)
  summary: pièces jointes aux notes : photos, documents (PDF, etc.) et enregistrements audio.
  evidence: pas décidé ni cadré. Points à trancher le moment venu : stockage dans Supabase Storage (déjà dans la stack) avec une règle d'accès par propriétaire comme pour les tables ; limites de taille et de type ; effet sur le RAG (extraction du texte des documents, transcription des enregistrements, indexation et citation de la source) ; vie privée (les extraits partent chez Mistral AI et Anthropic : mention RGPD, aucune donnée réelle de client pendant le Workshop 8) ; suppression et purge au passage à l'outil pro (fichiers inclus) ; accès mobile (prise de photo, dictée). Probablement un epic à part après le MVP, à relier aux notes (epic 2) et à la base de connaissances.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-creer-des-missions.md`
  summary: tester la suppression d'un compte `auth.users` qui a des fiches et des missions, avant le passage à l'outil pro (la purge de la base).
  evidence: `missions.client_id` est en `on delete restrict` (suppression d'une fiche refusée tant qu'elle a des missions) et `missions.owner_id` en `on delete cascade` ; le `restrict` immédiat peut faire échouer la cascade d'un compte selon l'ordre des suppressions (relecteur, confiance moyenne, non testé). À vérifier avec un compte jetable ; sinon purger les missions avant les fiches, ou passer la clé étrangère en `no action`.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-creer-des-missions.md`
  summary: tester les Server Actions des missions (création, modification, suppression) et le refus de suppression d'une fiche, avec la même solution que pour les notes, fiches et contacts.
  evidence: les tests couvrent la base (isolation) et les règles pures, pas les actions : inverser la vérification d'existence du client ou le code 23503 laisserait tout vert.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-creer-des-missions.md`
  summary: liste des missions sans plafond ni pagination ; double envoi du formulaire sans clé d'idempotence.
  evidence: l'API plafonne à 1 000 lignes par défaut, le total et les filtres ne porteraient que sur les plus récentes ; négligeable pour une activité à un seul utilisateur.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md`
  summary: unicité `(mission_id, position)` ou renumérotation atomique du backlog ; limite du nombre de stories par mission ; tests des Server Actions de stories.
  evidence: deux ajouts ou deux déplacements simultanés (deux onglets) peuvent produire des positions en double, départagées par `created_at` et réparées au prochain déplacement ; aucun test ne couvre les actions ; un compte peut créer des milliers de stories (dégradation de sa propre page).
- source_spec: `_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md`
  summary: `updateStory` écrase le statut avec celui du formulaire resté ouvert ; avancement de la liste des missions plafonné à 1 000 stories par l'API.
  evidence: ouvrir l'édition, changer le statut par le menu, puis enregistrer le formulaire ramène l'ancien statut ; l'avancement de toutes les missions est lu d'un coup.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5b-taches-d-une-user-story.md`
  summary: ordre des tâches et des stories : mêmes limites que la 3.5a (écritures non atomiques, positions simultanées) ; pas de limite du nombre de tâches par story ; tests des Server Actions de tâches ; glisser au toucher non testé sur un vrai téléphone.
  evidence: deux déplacements simultanés dans deux onglets : le second est refusé si les éléments ont changé, sinon le dernier gagne ; seul l'émulateur de Chrome a servi pour le toucher.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5b-taches-d-une-user-story.md` (relecture)
  summary: « Modifier » une story démonte ses tâches ; message d'erreur de réordonnancement jamais effacé avant le déplacement suivant ; pas de plafond de tâches par story (500 au plus acceptées au réordonnancement) ; ligne de story repliée sur plusieurs lignes à 412 px ; glisser d'une story dépliée difficile sur téléphone.
  evidence: taper une tâche puis cliquer « Modifier » la story et annuler vide le champ ; au-delà de 500 tâches un déplacement répond « a changé entre-temps » ; à 412 px la ligne repliée prend deux lignes (titre sur deux au plus, puis statut).

- source_spec: `_bmad-output/implementation-artifacts/spec-8-17-decouper-une-story-en-taches-avec-l-ia.md`
  summary: pas de plafond de générations par utilisateur (coût d'API), comme la 8.16 ; la vérification des chiffres ne contrôle pas les entiers de 1 à 9 ni les nombres en lettres ; la consigne seule empêche un conseil fiscal ou juridique sans chiffre.
  evidence: un utilisateur connecté peut relancer la génération en boucle ; « Prévoir huit relances » passerait.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-17-decouper-une-story-en-taches-avec-l-ia.md` (relecture)
  summary: un ajout de tâches lancé puis panneau fermé réussit sans retour visible ; positions en double si deux onglets ajoutent ensemble (pas de contrainte unique sur `(story_id, position)`).
  evidence: fermer le panneau pendant « Garder » vide l'annonce ; la page se rafraîchit mais rien ne dit que c'est enregistré.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-21-generer-un-prompt-depuis-une-mission.md`
  summary: pas de plafond de générations ; pas d'anonymisation des noms de client dans les titres ; notes jamais envoyées (à proposer en choix explicite plus tard) ; vérification des nombres limitée (entiers de 1 à 9 et nombres en lettres non contrôlés).
  evidence: un nom de client écrit dans un titre de story part tel quel ; la consigne seule empêche un conseil fiscal ou juridique sans chiffre.

- source_spec: `_bmad-output/implementation-artifacts/spec-8-21-generer-un-prompt-depuis-une-mission.md` (relecture)
  summary: actions serveur d'un même client sérialisées (après « Annuler », la relance attend la fin de l'appel précédent, jusqu'à 60 s : vaut pour 8.16, 8.17 et 8.21) ; erreurs de lecture avalées par `withSession` sans journal ; consigne générée non filtrée contre mot de passe ou conseil fiscal ; régions « live » remontées à chaque annonce à tester avec un vrai lecteur d'écran ; backlog et tâches au-delà de 1 000 lignes.
  evidence: Annuler puis relancer tout de suite attend l'ancien appel ; une erreur de statut inconnu ne laisse aucune trace ; un objectif « demande le mot de passe admin » peut être repris dans la consigne.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5c-sprints.md`
  summary: niveau de titre « Tâches » (h3) identique à celui du nom du sprint (h3) quand une story est dans un sprint ; la confirmation de suppression d'une mission ne dit pas combien de sprints partent avec elle ; positions identiques pour les stories reportées à la clôture (renumérotées au prochain glisser-déposer) ; pas de contrôle de chevauchement des sprints ; lien avec le cockpit à construire (stories 5.x).
  evidence: structure de titres : Sprints (h2) > sprint (h3) > Tâches (h3) ; seules les stories sont comptées à la suppression d'une mission.

## De la relecture de la 3.5c (17 octobre)
- Région vocale unique et toujours montée (au lieu d'une région recréée à chaque annonce, muette sur certains lecteurs d'écran) ; deux `role="status"` dans la même section.
- Clôture : les stories reportées prennent la même position ; conserver leur ordre dans le sprint.
- Tests d'actions serveur (`closeSprint`, `place`, `moveStory`, `deleteSprint`, `renumber` avec filtre de liste) et d'isolation d'un sprint clos (à écrire avec le déclencheur).
- `parisToday` autour du changement d'heure du 25 octobre 2026 ; sprint planifié dont la fin est passée.
- `moveStory` et `closeSprint` : deux écritures non atomiques (procédure stockée si une panne entre les deux devient gênante).

## De la relecture de la 8.17b (17 octobre)
- Test automatique de `addStoryWithTasks` : compensation, tâches forgées, note disparue (faux client Supabase).
- Vérifier dans le navigateur : compensation (échec d'ajout des tâches) et thème clair du panneau.
- Mode « Modifier » d'une proposition : les tâches restent modifiables pendant l'envoi (le formulaire des stories n'expose pas son état d'envoi).
- Garder une story et ses tâches dans une seule fonction SQL transactionnelle (aujourd'hui compensation en deux écritures).

## De la relecture de la 8.18 (17 octobre)
- Réponse coupée par `max_tokens` sur une très grosse story : message distinct de « Relecture impossible ».
- `mergeReview` valide aussi les champs non cochés : message trompeur si un champ ancien non coché est invalide.
- Une réponse avec remarques mais sans version `story` est refusée (les remarques seraient utiles).
- Titres des autres stories envoyés sans plafond ; pas de limite de générations (déjà noté).
- Test automatique de `applyStoryReview` (écriture conditionnelle sur `updated_at`) avec un faux client Supabase.
- Thème clair de la relecture non vérifié dans le navigateur.

## De la relecture de la 8.19 (17 octobre)
- Test automatique de `placeStoriesInSprint` et `composeSprint` (faux client Supabase).
- Deux placements concurrents dans le même sprint depuis deux onglets : positions à égalité (aucune perte).
- Lecture du backlog plafonnée à 1 000 lignes par PostgREST (négligeable en solo).
- L'objectif d'un sprint ne passe pas par `validateSprintInput` (longueur seulement) : retours à la ligne acceptés.
- Compléter la mention de confidentialité des 8.16 et 8.17 (titre de la mission, nom du client, comme en 8.18 et 8.19).
- Thème clair du panneau « Composer avec l'IA » non vérifié ; placement partiel et sprint clos par course vérifiés par la lecture du code seulement.

## De la relecture de la 8.20 (18 octobre)
- Fenêtre de course entre la relecture du serveur et `renumber` : un glisser-déposer passé entre les deux serait écrasé (`renumber` ne vérifie que l'ensemble des stories, pas l'ordre) ; écritures par ligne sans transaction (même limite que le glisser-déposer).
- `parseReorderIds` plafonne à 500 identifiants : un backlog hors sprint de plus de 500 stories ne pourrait pas être réordonné (message « a changé entre-temps » trompeur).
- Ouvrir l'ajout d'une story à la main démonte le panneau d'ordre et perd la proposition en cours.
- Story omise par l'IA et identifiants forgés en sortie brute : couverts par les tests purs, pas par un essai réel.
- Thème clair du panneau d'ordre non vérifié.

## De la relecture de la 3.6 (18 octobre)
- Deux acceptations simultanées : la sérialisation repose sur `select … for update` dans `accept_quote` (correct à la lecture) mais aucun test à deux connexions ne la prouve ; le script SQL ne joue qu'une transaction (un retrait du `for update` passerait inaperçu). Test à écrire avec deux sessions du même compte (le devis envoyé qu'il crée n'est pas supprimable : fiche jetable à nettoyer par SQL).
- Les actions `quote-actions.ts` (gardes `.eq("status", …)`, correspondance des codes d'erreur, cas « figé ») n'ont pas de test propre : couvertes par le script SQL et le parcours Chrome seulement.
- Le cycle complet des devis (figés, `accept_quote`) vit dans `tests/sql/quotes-lifecycle.sql`, collé à la main : pas dans la CI. À automatiser si un compte de test jetable devient possible.
- « Mission liée » propose aussi les missions terminées et annulées.
- Date d'envoi dans le futur acceptée sans avertissement (pas de règle dans la spec).
- `set_updated_at` reste exécutable par `anon` et `public` (antérieur à la 3.6, non exploitable : fonction de déclencheur) ; `quotes_guard` durci dans la migration 20261018100300.
- Le cockpit (epic 5) devra filtrer `status = 'sent'` pour les règles 5 et 6 : un brouillon n'y compte pas.
