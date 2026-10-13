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
