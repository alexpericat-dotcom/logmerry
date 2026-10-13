---
title: 'Story 2.3 : Deux comptes fictifs ne se voient pas'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '1411a8a899a0d9982652df06ea1f2dfa93ab8bd5'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'isolation entre comptes (règle centrale du projet) n'est vérifiée qu'à la main, une fois ; rien ne la protège d'une régression de migration. Les revues des stories 2.1 et 2.2 ont aussi reporté des vérifications côté base (déclencheur `updated_at`, contrainte de 50 000 caractères, mise à jour ou suppression d'une note d'un autre compte).

**Approach:** un script de test rejouable (`npm run test:isolation`) se connecte avec la clé publique comme « démo A » et « démo B » (comptes fictifs, identifiants dans `.env.test.local`), prouve que B ne peut ni lire, ni modifier, ni supprimer, ni se faire attribuer une note de A, et contrôle les règles de la base. Il nettoie ses notes de test. Le résultat est noté dans `docs/journal.md`.

</frozen-after-approval>

## Implementation Notes

- Implémenté directement (pas de sous-agent : non demandé). `tests/isolation.test.ts`, lancé par `npm run test:isolation` (`node --test` avec `--env-file=.env.local --env-file=.env.test.local`). Séparé de `npm test` (tests unitaires hors ligne) car il utilise le réseau et des identifiants.
- Garde-fous : clé publique uniquement ; refuse tout compte hors `@example.com` ; notes de test préfixées `[isolation-test]`, supprimées au début (restes d'un essai interrompu) et à la fin ; aucun identifiant dans le fichier.
- 11 vérifications, toutes passées le 2026-10-13 : A retrouve sa note (`owner_id` rempli par la base, type par défaut `note`) ; B ne la voit ni dans sa liste ni par son identifiant ; B ne peut ni la modifier ni la supprimer (zéro ligne touchée, note intacte) ; B ne peut ni créer une note au nom de A ni lui donner une des siennes ; sans connexion, rien n'est visible ni créable ; `updated_at` avance à la modification ; texte de plus de 50 000 caractères, titre vide et type inconnu refusés (codes 23514, 22P02).
- Contrôle après exécution (lecture seule) : aucun reste de test dans `notes`.
- L'accès « par adresse directe » est vérifié au niveau de la base (même requête que `getNote`) : `/notes/<id>` d'un autre compte donne donc une page introuvable. Le test des Server Actions elles-mêmes (session, redirection) reste reporté : il demande un client Supabase simulé que le dépôt n'a pas.
- Vérifié en local : lint, `tsc`, `npm test` 20/20, `npm run test:isolation` 13/13 (après revue : note de B ajoutée pour la symétrie, codes d'erreur RLS vérifiés, cas sans connexion durci).

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Le test pouvait réussir parce que l'accès de B est cassé (B ne voit rien) ; pas de cas symétrique | medium | patch | Note de B ajoutée ; chacun voit la sienne ; A ne voit pas celle de B ; B reste propriétaire après la tentative de transfert. |
| Les refus se contentaient d'`ok(error)` (n'importe quelle erreur passait) | medium | patch | Code `42501` (RLS) exigé pour l'insertion au nom d'un autre, le transfert et l'insertion anonyme. |
| Cas sans connexion : erreur de lecture ignorée, pas de mise à jour ni de suppression testées | medium | patch | Lecture sans erreur et vide, insertion refusée en 42501, mise à jour et suppression sans ligne touchée. |
| Échec de connexion sans cause ; échec de nettoyage silencieux | low | patch | Message d'erreur de Supabase ajouté (aucun secret) ; avertissement si la suppression échoue. |
| Pas de modèle d'identifiants ni de prérequis écrit | low | patch | `.env.test.local.example` (noms seulement) et prérequis en tête du fichier. |
| Couvrir les futures tables (extraits, historique, missions) | medium | defer | Seule la table `notes` existe ; chaque nouvelle table doit rejoindre ce script. |
| Test non branché sur une CI ou une liste avant déploiement | low | defer | Aucune CI dans le dépôt ; le rappel « après chaque migration » repose sur la discipline et le journal. |
| Nettoyage par préfixe de titre pourrait effacer une vraie note des comptes de démo | low | false | Comptes réservés au test (`@example.com`, refus sinon) ; le préfixe sert aussi à rattraper les restes d'un essai interrompu. |
| Le test pourrait écrire dans une base de production future | low | false | Seuls les deux comptes fictifs peuvent s'y connecter ; ils n'existent pas ailleurs, et la purge de passage en production les supprime. |
| `updated_at > created_at` pourrait être égal ; ordre des tests | low | false | `now()` est celui de la transaction de la mise à jour, postérieure à l'insertion ; un seul bloc, exécuté dans l'ordre. |
