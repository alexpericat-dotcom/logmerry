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
