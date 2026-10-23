---
title: 'Story 5.1b : Calendrier administratif complet'
type: 'feature'
created: '2026-10-23'
status: 'done'
baseline_commit: '9a477269d7da6ba4501b4fb203bf03ce363715db'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le calendrier (5.1a) liste des échéances saisies sans priorité, sans récurrence ni vues, et ne montre ni les factures à émettre ou à relancer, ni les obligations dont la date est inconnue.

**Approach:** `deadlines` reçoit priorité, récurrence (une ligne par occurrence) ; la page `/calendrier` gagne quatre vues, des lignes calculées de factures (lecture seule) et des lignes calculées « À confirmer » (sans date) tirées du profil.

## Boundaries & Constraints

**Always:**
- SQL montré puis approuvé avant application ; nouvelle migration (la 5.1a n'est pas modifiée) ; types régénérés ensuite. RLS inchangée.
- Priorité : `low` / `normal` / `high` (Basse / Normale / Haute), défaut `normal`. « Statut » = à faire / faite (`done_at`) ; « en retard » est dérivé. La remarque de la 5.1a tient lieu de description.
- Récurrence : mensuelle, trimestrielle ou annuelle (choix sous « Plus de champs »). Colonnes `recurrence`, `series_id`, `series_day` (jour du mois visé, 1 à 31, ramené au dernier jour des mois courts) ; index unique `(series_id, due_on)`. Création : la première occurrence + celles des 12 mois suivants (calcul pur dans `lib/domain/`, tests). Complétion **à la lecture** de la page (insertion « ignorer si doublon ») quand l'horizon des 12 prochains mois n'est pas atteint.
- Chaque occurrence se coche, se rouvre et se modifie seule (titre, priorité, source, remarque) ; **sa date n'est pas modifiable** (sinon la grille la régénérerait). Supprimer une occurrence supprime **toute la série à faire** (confirmation le dit) et ôte la récurrence des occurrences faites, qui restent.
- « À confirmer » : liste fixe en code d'obligations attendues (Urssaf, France Travail, TVA, CFE), chacune liée à un champ du profil. Une ligne calculée, **sans date, marquée « À confirmer »**, s'affiche tant qu'aucune échéance saisie de cette catégorie n'existe, avec sa raison (donnée du profil vide ou « À confirmer », ou « aucune règle de calendrier vérifiée »). France Travail est omise si le profil dit « non inscrit », la TVA si « franchise en base ». Aucune date n'est calculée ni estimée ; l'utilisateur saisit la vraie échéance avec sa source.
- Factures (lecture seule, calculées, lien vers la facture) : **à émettre** = sans date d'émission, datée de son échéance de paiement ; **à relancer** = non soldée (statut `invoiceBalance` ≠ payée) dont l'échéance est dépassée. Jamais stockées dans `deadlines`.
- Vues par paramètre d'URL `?vue=` : Aujourd'hui, Cette semaine (aujourd'hui → dimanche), Ce mois-ci (aujourd'hui → fin de mois), En retard, plus « Toutes » par défaut (les trois sections de la 5.1a). Calculs sur le jour de Paris, `today` reçu en argument. Les lignes « À confirmer » n'apparaissent que dans « Toutes ».
- Test d'isolation étendu aux occurrences d'une série (un autre compte ne les voit ni ne les coche). Tutoiement, thèmes clair et sombre, 44 px sur téléphone, annonces et focus comme en 5.1a.

**Never:** rendez-vous ou agenda ; date de cotisation, d'impôt ou de TVA calculée ; nouvelle clé de règle ; tâche du cockpit (5.2) ; facture stockée comme échéance ; rappel ou notification ; modification en bloc d'une série.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Série mensuelle | 31 janv., mensuelle | 13 lignes jusqu'à +12 mois : 28 févr., 31 mars… (jour visé 31) | récurrence inconnue : refusée |
| Complétion | dernière occurrence à moins de 12 mois | lignes manquantes insérées une seule fois, même si deux lectures simultanées | doublon ignoré par l'index unique |
| Cocher une occurrence | « Faite » | seule cette ligne est faite | N/A |
| Supprimer une occurrence | confirmation | occurrences à faire supprimées, faites conservées sans récurrence | échec : rien de supprimé |
| Profil sans fréquence Urssaf | aucune échéance Urssaf | ligne « Déclaration Urssaf — À confirmer », sans date, raison : profil | N/A |
| Échéance Urssaf saisie | une ligne de catégorie Urssaf | la ligne « À confirmer » disparaît | N/A |
| Facture sans émission | `issued_on` vide | ligne « À émettre » à la date d'échéance | N/A |
| Facture partiellement payée, échue | statut partiel | ligne « À relancer », retard en jours | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261023120000_deadlines.sql` -- table, RLS, garde de 5.1a (à ne pas modifier) ; nouvelle migration à côté.
- `lib/domain/deadlines.ts` (+ test) -- validation, `groupDeadlines`, `deadlineWhen` : ajouter priorité, récurrence, génération des occurrences, vues, lignes « À confirmer » ; lit `PROFILE_FIELDS` / `fieldState` de `lib/domain/profile.ts`.
- `lib/db/deadlines.ts`, `lib/db/deadline-state.ts` -- lecture paginée, `setDeadlineDone` (réutilisée telle quelle) ; ajouter complétion de série et suppression de série.
- `app/(app)/calendrier/{page,actions}.tsx|ts` -- page, actions ; `components/deadline-{form,row}.tsx`, `deadlines-panel.tsx` -- formulaire, ligne, sections.
- `lib/db/invoices.ts` (`listInvoices`), `lib/domain/payments.ts` (`invoiceBalance`), `lib/db/profile.ts` -- sources des lignes calculées.
- `tests/isolation.test.ts` (bloc factures/encaissements en modèle) ; `scripts/seed-demo.ts` -- données fictives.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<horodatage>_deadlines_calendar.sql` -- enums, colonnes `priority`, `recurrence`, `series_id`, `series_day`, index unique ; SQL montré avant application -- socle
- [x] `lib/supabase/database.types.ts` -- régénéré -- clients typés
- [x] `lib/domain/deadlines.ts` + test -- priorité, récurrence, grille d'occurrences (fin de mois, bissextile), vues, lignes « À confirmer », lignes de factures -- logique pure testée
- [x] `lib/db/deadlines.ts`, `app/(app)/calendrier/actions.ts` -- création de série, complétion, suppression de série -- écritures
- [x] `app/(app)/calendrier/page.tsx`, `components/deadline-*.tsx`, `deadlines-panel.tsx` -- vues, champs priorité/récurrence, lignes calculées -- interface
- [x] `tests/isolation.test.ts` -- isolation des occurrences (`seed-demo.ts` ne sème que des fiches clients : rien à y ajouter) -- preuve

**Acceptance Criteria:**
- Given des échéances, when j'ouvre une vue, then seules celles de la vue s'affichent.
- Given une série créée, when je coche une occurrence, then les autres restent à faire.
- Given un profil sans fréquence Urssaf et aucune échéance Urssaf, when j'ouvre « Toutes », then une ligne « À confirmer » sans date apparaît ; aucune date n'est inventée.
- Given une facture sans émission ou échue non soldée, then elle apparaît en ligne calculée, absente de `deadlines`.

## Implementation Notes

- Migration `20261023140000_deadlines_calendar.sql` appliquée par l'auteur dans l'éditeur SQL de Supabase (le MCP a été refusé deux fois) ; elle n'est donc pas dans l'historique Supabase, le fichier du dépôt fait foi. `database.types.ts` mis à jour à la main d'après le schéma lu par le MCP.
- Nouveaux fichiers : `components/calendar-line-row.tsx`. Logique pure dans `lib/domain/deadlines.ts` (`addMonths`, `seriesDates`, `missingOccurrences`, `inView`, `invoiceLines`, `toConfirmLines`), 22 tests.
- `validateDeadlineInput` reçoit désormais `today`. Mise à jour d'une occurrence : date et récurrence jamais modifiées ; supprimer une occurrence appelle `delete_deadline_series`.
- Limite connue : l'index unique `(series_id, due_on)` ne contient pas `owner_id` ; un `series_id` d'un autre compte ne se devine pas (UUID), à durcir plus tard.

## Spec Change Log

## Review Triage Log

Passe 1 (3 relecteurs : Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | « Faites » retriée par date d'échéance au lieu de la date de réalisation | medium | `.sort(byDate)` appliqué à toute section ; corrigé (tri seulement si des lignes calculées s'intercalent) : patch |
| 2 | Sections sans objet dans une vue (« Rien à venir. » en « En retard ») | low | cosmétique, correction directe (sections masquées) : patch |
| 3 | Première date d'une série au-delà de +12 mois : aucune ligne créée, « enregistré » affiché | medium | `seriesDates` rend `[]` : patch (validation + test) |
| 4 | Échec d'écriture de la complétion = page entière en erreur | medium | `throw` en lecture de page : patch (journalisé, page rendue) |
| 5 | Supprimer une occurrence faite : la ligne reste (détachée) alors que la série à faire part | medium | RPC ne supprime que les non faites : patch (suppression de la ligne ensuite) |
| 6 | Date verrouillée (`disabled`) vide après une erreur de validation | low | non soumise : patch (`readOnly`) |
| 7 | Ordre non déterministe à date égale | low | patch (clé en départage) |
| 8 | Lien « Ouvrir » vers la page courante (CFE) ; cible tactile < 44 px | low | patch |
| 9 | Compteur « échéances en retard » inclut des factures | low | libellé corrigé : patch |
| 10 | Aucun test de l'écriture réelle de complétion (idempotence) | medium | patch : test d'isolation avec le même `upsert` |
| 11 | Facture sans émission et échue ne montre que « à émettre » | false | décision de l'auteur (« à relancer » = émise) |
| 12 | Une échéance faite masque « À confirmer » de sa catégorie | false | conforme à la spec (« tant qu'aucune échéance saisie de la catégorie n'existe ») ; risque noté en report |
| 13 | Série supprimée entre lecture et complétion : ressuscitée | maybe-false | fenêtre de course étroite (un seul utilisateur) : defer |
| 14 | Pas de test des actions (date figée, routage de suppression), de la composition du panneau, ni du mappage page → lignes | medium | defer : extraction en fonctions pures à faire avec la 5.2 |
| 15 | Annonce du changement de vue pour lecteurs d'écran ; orpheline faite avec `series_id` | low | defer |
| 16 | Types édités à la main ; migration absente de l'historique Supabase | medium | defer : régénérer et comparer au prochain accès MCP |
| 17 | Journal et contexte d'épopée non mis à jour | low | patch (journal) |

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur
- `npm run test:isolation` -- expected: vert, occurrences de série incluses

**Manual checks (if no CLI):**
- Chrome : série mensuelle créée, vues, ligne « À confirmer », lignes de factures, thèmes clair et sombre, largeur téléphone.
