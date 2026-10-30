---
title: 'Épopée 6 : réalisations et portfolio public (stories 6.1, 6.2, 6.3)'
type: 'feature'
created: '2026-10-30'
status: 'in-progress'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Alex n'a aucun endroit pour présenter ses réalisations à un prospect (UJ-3, FR-16). C'est la seule route publique de l'application : la moindre erreur de droits exposerait des données privées à un inconnu.

**Approach:** trois tranches fines, dans cet ordre, une PR chacune. 6.1 : table `realisations` et écran propriétaire (créer, modifier, supprimer). 6.2 : accord du client et publication, garantis par la base elle-même. 6.3 : vue `public_realisations` et page `/portfolio` sans connexion.

## Boundaries & Constraints

**Always:** RLS sur `realisations` avec `owner_id = auth.uid()` ; champs obligatoires = titre, description courte, étiquette d'origine (client réel, formation, ami, démo), accord du client pour publier ; facultatifs = nom du client, secteur, stack (étiquettes), chiffre de résultat ; une réalisation naît non publiée ; la règle « pas de publication sans accord » est une contrainte de la base (`check (not published or client_consent)`), pas seulement un contrôle d'interface ; la vue publique est calculée par la base : nom du client remplacé par « Client, secteur X » sans accord, chiffre de résultat masqué sans accord ; `/portfolio` lit **uniquement** `public_realisations` (AD-10) ; page en lecture seule, en vouvoiement, lisible sur téléphone, message sobre si rien n'est publié ; aucun formulaire public, contact par `mailto:` ; données de démo fictives, étiquetées « démo ».

**Never:** donner à `anon` un droit sur une table (seulement `select` sur la vue, voir le test statique à ajuster) ; exposer `owner_id`, identifiants de client ou de mission, notes, montants ; publier automatiquement ; générer ou reformuler du texte de portfolio par l'IA ; lier une réalisation à un client ou une mission réels dans ces trois stories (le nom du client est un texte libre, voir décision 3).

## Décisions à valider

1. **Découpage : captures d'écran reportées à une 6.4.** Elles demandent un bucket de stockage, ses politiques et un texte alternatif obligatoire par image : c'est la partie la plus risquée de l'épopée et elle est facultative dans l'énoncé. Les trois stories se livrent sans image ; 6.4 les ajoute ensuite. Alternative : tout dans 6.1 (une PR plus lourde).
2. **Adresse du `mailto:`.** Je ne la connais pas et je ne la suppose pas. Proposition : variable serveur `PORTFOLIO_CONTACT_EMAIL` (pas `NEXT_PUBLIC_`, pour ne pas toucher au test statique), lue par la page ; sans valeur, le lien « m'écrire » n'est pas affiché. Quelle adresse veux-tu rendre publique ?
3. **Nom du client en texte libre**, pas de lien vers la fiche client : une jointure vers `clients` ferait entrer une donnée privée dans la vue publique. Deux champs : « Nom du client » et « Secteur » (« Client, secteur X » utilise le second ; secteur vide = « Client confidentiel »).
4. **Chiffre de résultat** : texte libre court (« -30 % de temps de saisie »), pas un nombre, pour éviter tout calcul ou affichage de montant.
5. **Titre de page et ordre** : `/portfolio`, plus récentes d'abord (`published_at`), une carte par réalisation avec sa pastille d'origine ; pas de page de détail au MVP.

## Renégociation du 30 octobre 2026 (après la fusion de la 6.1)

Décision d'Alex : le portfolio doit être **très visuel et très professionnel, avec un effet « waouh »**, et la page doit aussi décrire **ce qu'il sait faire, comment se passe une mission avec un client et ce qu'il lui apporte**. Réponses : images d'abord (décision 1 inversée), style de l'identité LogMerry (titres pixel, dégradé, ombres dures), textes rédigés par moi puis validés par lui, formules nommées **sans prix**. Nouvel ordre : **6.2** publication et accord (sans image) → **6.3** captures d'écran (stockage, texte alternatif obligatoire, ancienne « 6.4 ») → **6.4** page publique `/portfolio` complète : accroche, « Ce que je fais » (formules), « Comment ça se passe » (déroulé d'une mission), « Ce que j'apporte », réalisations avec captures, contact. Le lien de la page en ligne d'une réalisation (`link_url`, https seulement) est déjà livré. **Encore à fournir par Alex avant la 6.4** : nom public (vérification de marque en cours, CLAUDE.md), adresse du `mailto:` (décision 2 jamais tranchée), photo ou pas, ville ou zone, et la relecture des textes. Les textes de la page sont des données de la page (fichier de contenu relu par Alex), pas des promesses inventées : aucun tarif, aucun délai ni garantie chiffrée sans son accord.

## I/O & Edge-Case Matrix

| Scénario | État | Comportement attendu |
|----------|------|----------------------|
| Création | titre, description, origine | enregistrée, non publiée |
| Publier sans accord | `client_consent = false` | refus, message clair ; la base refuse aussi par l'API |
| Publier avec accord | accord coché | publiée, `published_at` posée par la base |
| Retirer l'accord d'une réalisation publiée | accord décoché | dépubliée d'office (jamais publiée sans accord) |
| Visiteur sans connexion | `/portfolio` | seules les publiées ; nom anonymisé et chiffre masqué sans accord |
| Visiteur, table directe | `select` sur `realisations` | refusé (aucun droit à `anon`) |
| Deux comptes | A publie | B ne voit rien de A dans l'app ; `/portfolio` montre les publiées de tous les propriétaires (un seul réel : Alex) |
| Aucune publiée | vue vide | message sobre, pas d'erreur |
| Texte piégé (`<script>`, adresse) | titre ou description | affiché comme texte, jamais interprété |

</frozen-after-approval>

## Code Map

- `supabase/migrations/…_realisations.sql` : table, RLS, contrainte, déclencheur `published_at`, vue `public_realisations`, `grant select … to anon` sur la vue seulement. **SQL montré avant d'être appliqué ; appliqué par Alex**, puis `database.types.ts` régénéré (MCP).
- `lib/domain/realisations.ts` (+ test) : analyse des champs, étiquettes d'origine, règle de publication.
- `lib/db/realisations.ts`, `app/(app)/realisations/` : liste, formulaire, actions serveur (session vérifiée) ; entrée dans la barre latérale.
- `app/portfolio/page.tsx` : page publique ; `lib/auth.ts` (`accessDecision`) : `/portfolio` rendu public, tests du proxy mis à jour.
- `lib/security-static.test.ts` : exception explicite et étroite (vue `public_realisations` seule), le test continue d'échouer pour toute table ouverte à `anon`.
- `tests/isolation.test.ts` : fuite par la vue (colonnes, non publiées, accord absent), lecture de la table par `anon` refusée.
- `scripts/seed-demo.ts` : 3 réalisations fictives « démo » (dont une non publiée et une sans accord).
- `docs/journal.md`, `deferred-work.md`, `sprint-status.yaml`.

## Tasks & Acceptance

- [ ] 6.1 Migration (table, RLS) + types ; domaine et tests ; écran propriétaire (créer, modifier, supprimer, non publiée par défaut).
- [ ] 6.2 Contrainte de publication, `published_at`, bouton « Publier » / « Retirer », message de blocage ; mutation de la contrainte détectée.
- [ ] 6.3 Vue publique, page `/portfolio`, garde d'accès, test statique ajusté, test d'isolation `anon`.
- [ ] Par PR : 3 relecteurs, journal, CI verte ; fusion sur ton accord.

**Critères de réussite :** les 3 stories de `epics.md` (6.1 à 6.3, hors captures), `npm test` et `test:isolation` verts, un visiteur en navigation privée ne voit que les publiées.
