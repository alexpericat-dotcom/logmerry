---
title: 'Story 5.2 : Voir mes tâches du jour (échéances et factures échues)'
type: 'feature'
created: '2026-10-23'
status: 'done'
baseline_commit: 'c613d476f229c3938018aaba263bf6555833b2d0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le cockpit « Aujourd'hui » est vide : il ne dit pas quoi faire en premier parmi les échéances proches et les factures échues.

**Approach:** des fonctions pures (`lib/domain/cockpit/`, reçoivent `asOf`) calculent à la lecture les tâches des règles 1 (échéances à 0–3 jours) et 2 (factures non payées en retard d'au moins 1 jour) à partir du calendrier et des factures ; la table `task_checks` (nouvelle) ne garde que la coche d'une tâche de facture pour la journée.

## Boundaries & Constraints

**Always:**
- Tâches calculées à la lecture, sans liste propre au cockpit ; une échéance ou une facture ne donne qu'une tâche ; tri unique : numéro de règle, date la plus proche, identifiant. Aucune règle ne passe par l'IA. Jour de Paris, `asOf` reçu en argument.
- Règle 1 : échéances saisies avec `0 ≤ jours ≤ 3` (faites comprises : elles restent affichées cochées pour pouvoir décocher) ; en retard exclues (vue « En retard » du calendrier) ; lignes « À confirmer » et lignes de factures du calendrier exclues. Motif : « échéance aujourd'hui » / « échéance dans N jours ».
- Règle 2 : factures de statut non payé ou partiel (`invoiceBalance`) dont l'échéance est dépassée (`isOverdue` / `daysLate` de `lib/domain/invoices.ts`, comme le filtre « Échues »), émises ou non. Motif : « facture échue depuis N jour(s) ».
- Cocher une tâche d'échéance appelle `markDeadlineDone` ; la décocher, `reopenDeadline` (actions de `/calendrier`, inchangées). Cocher une tâche de facture écrit `task_checks` (règle 2, `source_id` = facture, `period_start` = jour de Paris) sans toucher la facture ; elle revient le lendemain si la facture reste échue ; décocher supprime la coche.
- Les tâches cochées descendent en bas, barrées ; la liste se réordonne et l'annonce est faite aux lecteurs d'écran (région `aria-live`, focus conservé). Toutes cochées (au moins une tâche) : « Bravo, tu as fait toutes tes tâches du jour. » Aucune tâche : le message actuel de la page.
- Migration `task_checks` : SQL montré puis approuvé avant application, RLS `owner_id = auth.uid()`, types régénérés ensuite. Test d'isolation couvrant `task_checks`. Tutoiement, thèmes clair et sombre, cibles de 44 px sur téléphone.

**Never:** règles 3 à 7 (stories 5.3, 5.4, 5.4b) et leurs colonnes (`ceiling_key`, seuil : la 5.3 les ajoutera) ; modifier une facture en cochant ; liste de tâches stockée ; rappel ou notification ; ligne « paramètre manquant » (5.3).

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Cas de référence | échéance à J+3, facture échue depuis 1 jour | 2 tâches : « échéance dans 3 jours » puis « facture échue depuis 1 jour » | N/A |
| Bornes règle 1 | échéance à J+4 / hier | aucune tâche | N/A |
| Facture soldée ou échéance non dépassée | statut payé / due aujourd'hui | aucune tâche | N/A |
| Tri | deux échéances à J+1 et J+2, ids différents | date la plus proche, puis identifiant | N/A |
| Cocher une facture | coche du jour | barrée, reste en liste, facture inchangée ; revient décochée le lendemain | échec : rien coché, message |
| Double coche | deux clics simultanés | une seule ligne (unicité) | doublon ignoré |
| Tout fait | toutes cochées | message « Bravo… » | N/A |

</frozen-after-approval>

## Code Map

- `app/(app)/aujourd-hui/page.tsx` -- page vide actuelle ; lit calendrier, factures, coches, rend la liste.
- `app/(app)/calendrier/actions.ts` -- `markDeadlineDone` / `reopenDeadline` (réutilisées) ; `refresh()` revalide déjà `/aujourd-hui`.
- `lib/domain/deadlines.ts` -- `daysUntil`, `deadlineWhen` ; `lib/domain/invoices.ts` -- `isOverdue`, `daysLate` ; `lib/domain/payments.ts` -- `invoiceBalance`.
- `lib/db/deadlines.ts` (`listDeadlines`), `lib/db/invoices.ts` (`listInvoices`), `lib/format.ts` (`todayParis`) -- sources.
- `lib/db/deadline-state.ts` -- modèle d'écriture partagée avec le test d'isolation ; calquer `lib/db/task-checks.ts`.
- `components/deadline-row.tsx` -- modèle de ligne cochable, annonces.
- `supabase/migrations/20261023120000_deadlines.sql` -- modèle de RLS ; nouvelle migration à côté.
- `tests/isolation.test.ts` (bloc `deadlines`, l. ~2050) -- à étendre.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<horodatage>_task_checks.sql` -- table `task_checks` (`owner_id`, `rule_no` 1–7, `source_id`, `period_start`, `checked_at`), unicité `nulls not distinct` sur (owner, règle, source, période), RLS ; SQL montré avant application -- socle
- [x] `lib/supabase/database.types.ts` -- régénéré -- clients typés
- [x] `lib/domain/cockpit/today.ts` + test -- règles 1 et 2, tri, motifs, coches de facture -- logique pure testée
- [x] `lib/db/task-checks.ts`, `app/(app)/aujourd-hui/actions.ts` -- lire, cocher, décocher une facture (écriture idempotente) -- écritures
- [x] `app/(app)/aujourd-hui/page.tsx`, `components/today-tasks.tsx` -- liste, cases, annonces, « Bravo » -- interface
- [x] `tests/isolation.test.ts` -- isolation de `task_checks` (lecture, forge d'`owner_id`, suppression) -- preuve

**Acceptance Criteria:**
- Given une échéance à J+3 et une facture échue depuis 1 jour, when j'ouvre le cockpit, then deux tâches s'affichent avec leurs motifs, règle 1 puis règle 2.
- Given une tâche d'échéance, when je la coche, then l'échéance est « faite » dans le calendrier ; décochée, elle redevient à faire.
- Given une tâche de facture cochée, then la facture est inchangée et la tâche revient le lendemain.

## Implementation Notes

- Migration `20261023150000_task_checks.sql` collée par Alex dans l'éditeur SQL de Supabase ; types reportés à la main (à régénérer au prochain accès MCP).
- Logique pure : `lib/domain/cockpit/today.ts` (`todayTasks`, 7 tests). Lecture/écriture des coches : `lib/db/task-checks.ts` (`listInvoiceTaskChecks`, `setInvoiceTaskChecked`, partagées avec le test d'isolation). Page, `error.tsx`, `components/today-tasks.tsx`, `actions.ts` dans `app/(app)/aujourd-hui/`.
- Titre d'une tâche de facture : « Encaisser la facture … » (neutre : une facture échue non émise est aussi retenue).
- Non fait : parcours dans Chrome (à faire par Alex).

## Spec Change Log

## Review Triage Log

Passe 1 (3 relecteurs : Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | `disabled={pending}` retire le focus clavier de la case cochée | medium | patch : `aria-busy` + garde dans `toggle` |
| 2 | Le focus peut tomber quand la ligne cochée change de place | maybe-false | à vérifier dans Chrome (React déplace le nœud) |
| 3 | « Bravo » absent de la région annoncée | low | patch : ajouté à l'annonce de la dernière coche |
| 4 | Fallback Suspense affiche « Rien à faire » pendant le chargement | low | patch : bandeau sans description |
| 5 | Lecture de `task_checks` en échec = page d'erreur générique, sans `error.tsx` | medium | patch : `error.tsx` comme `/calendrier` |
| 6 | Lecture des coches hors de `lib/db`, filtres jour et règle sans test | medium | patch : `listInvoiceTaskChecks` + test d'isolation (veille, autre règle) |
| 7 | « Relancer » faux pour une facture non émise | medium | patch : « Encaisser la facture » |
| 8 | Lien dans le label, cible sous 44 px | low | patch : lien hors du label, `min-h-11` |
| 9 | Tests manquants (titre de repli, singulier, faite hors fenêtre) | low | patch |
| 10 | Facture inexistante ou orpheline : coche écrite sans erreur ; pas de purge | low | rejeté : coche à soi, sans effet ; correctif = garde en plus ; purge en report |
| 11 | Page ouverte après minuit : coche datée du nouveau jour | low | rejeté : un seul utilisateur, fenêtre étroite, correctif = nouveau paramètre |
| 12 | Tri « cochées en bas » vs tri unique ; `nulls not distinct` absent ; lignes calculées non filtrées | false | voulu par la spec (cochées en bas) ; colonnes NOT NULL ; `listDeadlines` ne rend que des lignes stockées |
| 13 | Statut de facture dérivé de `invoiceBalance` non testé de bout en bout | maybe-false | defer : assemblage de la page à extraire |
| 14 | Journal, statut du sprint, tâches de la spec périmés | low | patch (fait) |

## Design Notes

`task_checks.source_id` n'a pas de clé étrangère (la table servira à plusieurs sortes de sources) : supprimer une facture laisse une coche orpheline, sans effet. Une facture échue non encore émise donne une tâche (cohérent avec le filtre « Échues » de la page Factures, et l'AC « non payées en retard »).

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur
- `npm run test:isolation` -- expected: vert, `task_checks` inclus

**Manual checks (if no CLI):**
- Chrome : cas de référence, cocher/décocher, « Bravo », thèmes clair et sombre, largeur téléphone.
