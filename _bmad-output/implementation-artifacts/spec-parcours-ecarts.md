---
title: 'Écarts du parcours de démo : mission « En cours » au démarrage d''un sprint, compteur de tâches d''une story terminée, titre de la mission d''un devis accepté'
type: 'feature'
created: '2026-10-29'
status: 'in-progress'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le déroulé du parcours de démo (29 octobre 2026, `docs/parcours-demo.md`) a montré trois comportements que le propriétaire veut changer : (1) démarrer un sprint laisse la mission « À planifier » ; (2) une story « Terminée » affiche « 0/5 tâches » (incohérent) ; (3) le titre automatique de la mission d'un devis accepté (« Devis du 29/10/2026 — Atelier Mistral ») est peu parlant, et la tâche du cockpit le répète telle quelle (« Facturer la mission Devis du… »). Décisions d'Alex du 29 octobre : « ça bascule aussi », « ça ne doit plus l'afficher », « propose-moi plus parlant ». Le quatrième écart (mission terminée avec des stories ouvertes) reste en dette : Alex ne sait pas.

**Approach:** (1) `startSprint` passe la mission de « à planifier » à « en cours » quand le sprint démarre ; (2) le compteur de tâches n'est plus affiché pour une story « Terminée » (liste du backlog et section « Tâches ») ; (3) le titre automatique devient « {Nom du client} — devis du JJ/MM/AAAA », par une migration de la fonction `accept_quote`.

## Boundaries & Constraints

**Always:** (1) seule une mission « à planifier » bascule ; « en cours », « terminée » et « annulée » ne bougent jamais ; le sprint reste démarré même si la bascule échoue (la bascule est un second temps, son échec ne défait rien et n'affiche pas d'erreur) ; la bascule se limite aux missions du propriétaire (RLS) ; la page de la mission se rafraîchit. (2) Le compteur reste affiché pour les stories « À faire » et « En cours » et sert toujours de repère ; rien ne coche les tâches à la place du propriétaire ; les tâches elles-mêmes restent visibles dans le détail de la story. (3) Le titre reste borné à 200 caractères (nom de client coupé comme aujourd'hui) ; la migration est versionnée, SQL montré avant d'être appliqué, appliquée par Alex ; types régénérés si le schéma change (il ne change pas : une fonction seulement) ; les missions existantes ne sont pas renommées.

**Never:** cocher des tâches automatiquement ; bloquer le démarrage d'un sprint ; changer le statut d'une mission « terminée » ou « annulée » ; renommer les missions déjà créées ; toucher au quatrième écart (avertissement d'une mission terminée avec des stories ouvertes).

## Décisions à valider

1. **Titre (proposition retenue : « {Nom} — devis du JJ/MM/AAAA »).** Exemples : « Atelier Mistral — devis du 29/10/2026 », rappel du cockpit « Facturer la mission Atelier Mistral — devis du 29/10/2026 ». Le nom du client vient en tête : les missions d'un même client se rangent ensemble dans la liste. Alternatives écartées : « Mission pour {Nom} (devis du JJ/MM) » (le rappel dirait « la mission Mission pour… »), « {Nom} : à nommer » (le titre ne dirait plus d'où vient la mission). Le propriétaire peut toujours renommer.
2. **Compteur d'une story terminée :** masqué (pas remplacé par un texte). Alternative : « N tâches » sans « faites ». Proposition : masqué, comme le demande Alex.

## I/O & Edge-Case Matrix

| Scénario | État | Comportement attendu |
|----------|------|----------------------|
| Démarrer un sprint, mission « à planifier » | statut `planned` | sprint « en cours » ; mission « en cours » |
| Démarrer un sprint, mission « en cours » | statut `in_progress` | sprint démarré ; statut inchangé |
| Démarrer un sprint, mission « terminée » ou « annulée » | `done` / `cancelled` | sprint démarré ; statut inchangé |
| Démarrage refusé (un sprint déjà actif, sprint déjà démarré) | erreur | mission inchangée |
| Bascule de la mission en échec | erreur d'écriture | le sprint reste démarré, aucun message |
| Story « Terminée » avec 0/5 tâches | statut `done` | pas de compteur (liste, détail) ; lecteur d'écran : rien non plus |
| Story « À faire » ou « En cours » avec tâches | autres statuts | compteur « N/M tâches » comme aujourd'hui |
| Story terminée puis rouverte | retour à « À faire » | le compteur revient |
| Devis accepté, nom court | « Atelier Mistral », envoyé le 29/10/2026 | mission « Atelier Mistral — devis du 29/10/2026 » |
| Nom de client très long | plus de 170 caractères | titre borné à 200 caractères, préfixe conservé |
| Devis déjà accepté (rejeu) | statut `accepted` | renvoie la mission existante, aucune nouvelle |

</frozen-after-approval>

## Code Map

- `app/(app)/missions/sprint-actions.ts` : `startSprint`, après la mise à jour du sprint, `update missions set status = 'in_progress' where id = … and status = 'planned'`.
- `components/story-list.tsx` (compteur de la ligne) et `components/tasks.tsx` (compteur de la section) : masqués quand la story est terminée ; `tasks.tsx` reçoit le statut de la story si besoin.
- `supabase/migrations/…_accept_quote_title.sql` : `create or replace function public.accept_quote` avec le nouveau titre ; `tests/sql/quotes-lifecycle.sql` (lignes 78 et 91 : titre daté, préfixe, borne de 200).
- Tests : `tests/actions/` (démarrage de sprint : bascule, statuts inchangés, échec), `tests/components/` (compteur masqué ou visible selon le statut), `quotes-lifecycle.sql`.
- Docs : `docs/parcours-demo.md` (écarts levés), `deferred-work.md` (écarts 1 à 3 retirés, 4 conservé), `docs/journal.md`.

## Tasks & Acceptance

- [ ] Démarrage de sprint : bascule de la mission « à planifier » vers « en cours » ; tests (tous les statuts, échec de la bascule).
- [ ] Compteur masqué pour une story terminée (liste et détail) ; tests de composant.
- [ ] Migration du titre (SQL montré, appliquée par Alex) ; script SQL de cycle de vie mis à jour et rejoué.
- [ ] Mutations à la main (bascule de tout statut, bascule hors « à planifier », compteur toujours visible, ancien titre) : toutes détectées.
- [ ] 3 relecteurs ; `npm test`, `tsc`, lint, `next build` en copie propre ; `test:isolation`.
- [ ] Contrôle visuel d'Alex : démarrer un sprint sur une mission « À planifier », passer une story « Terminée », accepter un devis.

**Acceptation :** un sprint démarré met la mission « En cours » ; une story terminée n'affiche plus de compteur ; un devis accepté crée une mission nommée « {Client} — devis du JJ/MM/AAAA ».

## Review Triage Log

(29 octobre 2026, 3 relecteurs, 26 constats, aucun bloquant)

Corrigés : exception pendant la bascule de la mission (le sprint démarré ne doit pas afficher « Démarrage impossible » : `try/catch` + test avec exception, la mutation « catch qui relance » est détectée) ; test « démarrage refusé » à trois cas avec leurs messages ; borne exacte du titre dans `quotes-lifecycle.sql` (192 caractères) ; JSDoc de `Tasks` fusionné ; fixture de `missions.test.ts` et commentaire de `seed-demo-activity.ts` au nouveau format.
Reportés (dette) : câblage des compteurs (`story-list.tsx`, `tasks.tsx`) sans test de composant (`Tasks` demande de simuler actions, dnd-kit et IA ; la règle est testée en fonction pure) ; bascule sans trace quand la base renvoie une erreur ; missions déjà créées gardent l'ancien titre ; docs `parcours-demo.md` et `deferred-work.md` à mettre à jour après la fusion de la PR #83 (écart 4 conservé) ; `StoryStatus` plus strict que `string` pour `showTaskProgress`.
Vérifié après la migration (appliquée par Alex le 29 octobre 2026) : `tests/sql/quotes-lifecycle.sql` rejoué, 47 vérifications sur 47 (titre « Cabinet Test — devis du 19/10/2026 », longueur 192, `accept_quote` refusé à `anon`) ; `test:isolation` 129 sur 129.
Rejetés : `routes()` cumulatif (il remplace la réponse) ; région `role="status"` vide (elle reste dans le DOM pour annoncer les changements) ; droits de `accept_quote` (`create or replace` les conserve) ; espace final du nom du client dans le titre (cosmétique).
