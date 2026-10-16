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
