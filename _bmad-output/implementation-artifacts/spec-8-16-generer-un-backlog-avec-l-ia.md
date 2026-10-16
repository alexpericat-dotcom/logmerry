---
title: 'Story 8.16 : Générer un backlog avec l''IA'
type: 'feature'
created: '2026-10-16'
status: 'review'
baseline_commit: '15830ee'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** écrire un backlog de user stories à partir de rien est long ; les idées sont déjà dans un brief du client et dans mes notes de rendez-vous.

**Approach:** sur la page d'une mission, un bouton « Proposer des user stories avec l'IA » ouvre un panneau : je colle un brief (facultatif) et je coche les notes liées à la fiche du client que l'IA peut lire ; Claude propose jusqu'à 8 user stories (« En tant que… je veux… afin de… », critères d'acceptation, points suggérés) que je relis une à une : **garder**, **modifier puis garder**, ou **rejeter**. **Rien n'est enregistré avant que je garde une proposition.** Les stories gardées vont à la fin du backlog, dans l'ordre proposé.

*Cette story vient avant les tâches (3.5b) et les sprints (3.5c) : décision d'Alex du 2026-10-16 (« je veux que l'IA m'aide à générer le backlog et les user stories »).*

## Boundaries & Constraints

**Décisions proposées (à valider par le propriétaire) :** voir « Décisions à valider » plus bas ; la spec est écrite avec les valeurs recommandées.

**Always:**
- Appel à Claude **côté serveur seulement**, avec le même modèle et la même clé que l'assistant (`AI_CHAT_MODEL`, `ANTHROPIC_API_KEY`) ; délai de 60 s ; une erreur n'expose ni contenu ni clé (message générique « Proposition impossible pour le moment. Réessaie. »).
- **Ce que l'IA reçoit, et rien d'autre :** le brief que j'ai saisi (8 000 caractères au plus), le titre de la mission et le nom du client, les **titres** des stories déjà au backlog (pour ne pas les redoubler) et le texte des notes que j'ai cochées. Seules les notes **liées à la fiche de ce client** sont proposées au choix, lues sous RLS : jamais une note d'un autre compte ni d'un autre client. Au plus 5 notes et 30 000 caractères de notes au total (les plus récentes d'abord) ; au-delà, un message le dit et propose d'en décocher.
- Tout ce qui est donné au modèle est de la **donnée, pas une consigne** (comme pour le résumé de note) : texte échappé dans des balises ; la consigne fixe dit de ne jamais obéir à une instruction qui s'y trouverait.
- Sortie **structurée** (outil `propose_stories`) : 1 à 8 propositions, chacune avec titre, rôle, bénéfice, critères d'acceptation, points (suite de Fibonacci ou aucun) et, si elle vient d'une note, l'identifiant de cette note.
- **Vérification avant affichage**, proposition par proposition : une proposition invalide est écartée (titre vide ou trop long, points hors suite remis à « aucun », note citée absente de celles fournies : citation retirée) ; une proposition qui contient un **nombre absent du brief, des notes et du titre de la mission** (10 ou plus, ou décimal : même règle que le résumé de note) est **rejetée** et signalée. Si aucune ne survit : « L'IA n'a rien proposé d'exploitable. Précise ton brief. »
- **Rien d'enregistré avant « Garder »** : la proposition n'existe qu'à l'écran (état du navigateur) ; fermer le panneau l'oublie. Le brief n'est stocké nulle part.
- Une proposition gardée passe par l'ajout existant (`addStory` : mêmes règles, mêmes erreurs, dernière place du backlog) ; « Modifier » ouvre le formulaire des stories prérempli.
- Aucun conseil fiscal ou juridique : la consigne l'interdit ; aucun chiffre inventé (vérification ci-dessus).
- **Mention de confidentialité** visible dans le panneau : « Ton brief et les notes cochées sont envoyés à Anthropic pour générer les propositions. N'y mets pas de données réelles de clients. » (point RGPD ouvert du projet, comme pour Mistral AI).
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, état de chargement annoncé (`role="status"`), erreurs en ligne, annulation possible pendant la génération.
- Tests : règles pures (consigne, message, lecture et vérification de la réponse, plafonds), isolation (le panneau ne propose que des notes liées à la fiche et à moi), et un **jeu de 5 essais réels** avec des données fictives noté dans `docs/ia-backlog-tests.md`.

**Never:** enregistrement automatique ; mémoire de l'historique des générations ; génération de tâches (8.17) ; relecture d'une story existante (8.18) ; composition d'un sprint (8.19) ; envoi d'une note d'un autre compte ou d'un autre client ; nouvelle dépendance (l'appel est un `fetch`, comme pour le résumé).

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Génération avec brief | brief collé, aucune note cochée | 1 à 8 propositions à relire | brief et notes vides : « Colle un brief ou coche au moins une note. » |
| Génération avec notes | notes du client cochées | propositions, celles qui viennent d'une note la citent (lien) | notes trop volumineuses : message, rien envoyé |
| Garder | « Garder » sur une proposition | story ajoutée à la fin du backlog, la proposition disparaît du panneau | échec d'ajout : message, la proposition reste |
| Modifier puis garder | formulaire prérempli | story ajoutée avec mes modifications | erreurs en ligne comme à l'ajout |
| Rejeter | « Rejeter » | la proposition disparaît ; rien n'est enregistré | N/A |
| Fermer le panneau | croix ou Échap | propositions oubliées, rien d'enregistré | N/A |
| Proposition à nombre inventé | la réponse contient un chiffre absent des sources | cette proposition est écartée et signalée (« 1 proposition écartée : un chiffre ne venait pas de tes sources ») | N/A |
| Réponse inexploitable | Claude renvoie un format invalide, est coupé ou refuse | « Proposition impossible pour le moment. Réessaie. » ; journal sans contenu | N/A |
| Attente trop longue | plus de 60 s | message générique ; je peux relancer | N/A |
| Backlog déjà fourni | stories existantes | l'IA ne propose pas de doublon de titre (consigne) ; un doublon exact est écarté à l'affichage | N/A |
| Note d'un autre compte ou d'un autre client | identifiant forgé dans la demande | ignoré (lecture sous RLS, filtrée sur la fiche de la mission) | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Mission supprimée entre-temps | génération puis « Garder » | « Cette mission n'existe plus. » | message visible |

## Code Map

- `lib/ai/summary.ts`, `lib/domain/summary.ts` -- modèle d'appel Claude, de consigne, d'échappement et de vérification des chiffres inventés
- `lib/domain/story-proposals.ts` (+ test) -- consigne, message, lecture de la réponse, vérification, plafonds
- `lib/ai/story-proposals.ts` -- appel à l'API Messages avec l'outil `propose_stories`
- `lib/db/notes.ts` -- notes liées à la fiche de la mission (titre, texte, date), lues sous RLS
- `app/(app)/missions/proposal-actions.ts` -- `proposeStories(missionId, brief, noteIds)` (ne renvoie que des propositions, n'écrit rien)
- `components/story-proposals.tsx` -- panneau (brief, choix des notes, chargement, relecture, garder / modifier / rejeter) ; `components/backlog.tsx` -- bouton d'ouverture
- migration `user_stories.source_note_id` (voir décision 1) ; `tests/isolation.test.ts` ; `docs/ia-backlog-tests.md` ; `docs/journal.md`

## Tasks & Acceptance

- [x] Migration `source_note_id` (SQL montré avant application)
- [x] Règles pures + tests (consigne, message, lecture, vérification, plafonds)
- [x] Appel à Claude et Server Action (aucune écriture)
- [x] Panneau de relecture, garder / modifier / rejeter, lien vers la note source
- [x] Tests d'isolation, jeu de 5 essais réels (`docs/ia-backlog-tests.md`), journal

**Acceptance Criteria:**
- Given une mission et un brief, when je demande des propositions, then je vois 1 à 8 user stories à relire et **rien** n'est ajouté au backlog tant que je ne garde pas une proposition.
- Given des notes liées au client cochées, then les propositions qui en viennent citent la note (lien) ; given une note d'un autre client ou d'un autre compte, then elle n'est ni proposée ni envoyée (`npm run test:isolation`).
- Given une proposition gardée, then elle est ajoutée à la fin du backlog avec ses champs ; given « Modifier », then le formulaire prérempli applique les mêmes règles qu'un ajout.
- Given une réponse qui contient un chiffre absent du brief, des notes et du titre de la mission, then cette proposition est écartée et signalée.
- Given une panne ou une réponse inexploitable, then un message générique s'affiche, sans contenu de note ni clé.
- Given le panneau, then la mention de confidentialité est visible avant l'envoi.
- Given le jeu de 5 essais fictifs, then les résultats sont notés (propositions utilisables, citations justes, aucun chiffre inventé).

## Migration proposée (à approuver avant application, si décision 1 = « conserver la source »)

```sql
-- Story 8.16 : note d'origine d'une user story proposée par l'IA (facultative).
alter table public.user_stories
  add column source_note_id uuid references public.notes (id) on delete set null;

create index user_stories_source_note_idx on public.user_stories (source_note_id);

-- Les clés étrangères contournent la RLS : la note citée doit être à moi.
drop policy user_stories_insert on public.user_stories;
drop policy user_stories_update on public.user_stories;

create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (source_note_id is null
         or exists (select 1 from public.notes n where n.id = source_note_id and n.owner_id = (select auth.uid())))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (source_note_id is null
         or exists (select 1 from public.notes n where n.id = source_note_id and n.owner_id = (select auth.uid())))
  );
```

Supprimer la note d'origine ne supprime pas la story : le lien est simplement retiré (`on delete set null`).

## Décisions à valider

1. **Garder la note source sur la story gardée** (migration ci-dessus) plutôt que de l'afficher seulement pendant la relecture. Recommandé : on retrouve plus tard d'où vient une exigence, et ça sert la story 8.18 et le cockpit.
2. **Contexte envoyé à l'IA** : le brief, la mission, les titres du backlog et **les notes que tu coches** parmi celles liées au client, lues directement (pas par recherche vectorielle), plafonnées à 5 notes et 30 000 caractères. Plus simple et plus prévisible que le RAG ; le RAG pourra remplacer la lecture directe si tes notes deviennent trop nombreuses.
3. **Relecture** : trois boutons par proposition (Garder, Modifier, Rejeter) plutôt qu'« ajouter toutes les cochées » : tu gardes la main stories par story.
4. **Volume** : jusqu'à 8 propositions par génération, points suggérés en Fibonacci (modifiables), ordre proposé = ordre de priorité.
5. **Ordre du travail** : cette story passe **avant** les tâches (3.5b) et les sprints (3.5c) ; les stories 8.17 à 8.19 suivront chacune la même logique « l'IA propose, tu valides ».
6. **Coût** : un appel par génération (quelques dizaines de milliers de caractères au plus), sans plafond quotidien pour l'instant ; je note le nombre d'appels dans le journal pendant les essais.

## Implementation Notes

- Migration `20261016140000_user_stories_source_note.sql` : refusée par l'outil Supabase, appliquée par Alex dans l'éditeur SQL (pas d'entrée dans l'historique des migrations) ; vérifiée : colonne présente, les règles d'insertion et de mise à jour vérifient la note, alertes de sécurité inchangées.
- Écarts au Code Map : `components/story-form.tsx` (le formulaire des stories sorti de `backlog.tsx` pour éviter un import circulaire avec le panneau) ; `tests/proposals-run.ts` et le script `npm run test:proposals` ; la lecture des notes liées se fait dans l'action (même requête que dans `lib/db/notes.ts`, qui offre aussi `listNotesWithBodyForClient`, non utilisée pour l'instant : à retirer si elle le reste).
- Une proposition « Modifier » garde sa note d'origine (champ `source_note_id` ajouté au formulaire à l'envoi).
- Normalisations ajoutées après l'essai réel : voir `docs/ia-backlog-tests.md`.
- Reste : relecture indépendante, puis présentation.

## Triage de la relecture indépendante (3 relecteurs, 2026-10-16)

Aucune faille de cloisonnement ni fuite de clé ou de contenu (échappement solide, notes filtrées par la RLS et par la fiche de la mission, texte du modèle rendu en texte, lien généré à partir d'un UUID lu en base). Corrigés :
- **Note trop volumineuse** : une seule note de plus de 30 000 caractères faisait partir l'appel sans aucune source (le modèle inventait des stories « sourcées sur rien ») et bloquait les notes suivantes. Maintenant : elle est laissée de côté sans bloquer les autres, et si rien d'exploitable ne reste (ni brief, ni note), un message le dit **sans appeler Claude** ; vérifié par la matrice « notes trop volumineuses : message, rien envoyé ».
- **Annulation pendant la génération** (exigence de la spec absente) : « Annuler » et la croix sont actifs pendant l'attente ; le résultat tardif est jeté (l'appel serveur va, lui, au bout et coûte : dit à l'écran) ; vérifié dans Chrome (le panneau ne se remplit pas après annulation).
- **Panneau perdu** en ouvrant l'ajout à la main : le panneau reste monté, seulement masqué.
- **Focus et annonces** : retour du focus au bouton à la fermeture (l'effet remplace un appel avant que le bouton n'existe), titre du panneau après « Garder » ou « Rejeter » avec annonce, Échap dans un champ ne ferme plus le panneau, message d'écart dans une région live.
- **Doublons de titre** : accents, espaces et ponctuation ne les masquent plus. **Chiffres** : ceux du rôle et du bénéfice sont vérifiés ; les titres du backlog comptent comme sources (« Phase 12 »). **Appel d'outil** : plusieurs appels, liste écrite en texte JSON acceptés. **Note citée** : casse et espaces tolérés ; points : chiffres seulement.
- **Normalisation du bénéfice** : « de Gaulle », « d'abord », « d'autres » étaient amputés ; « afin de / de / d' » ne sont retirés que devant un infinitif ; « afin que… » est gardé ; « je veux » retiré du titre ; majuscule abaissée seulement devant un infinitif (« Notion », « Excel », « PDF » gardés).
- **Story gardée dont la note source a disparu** (ou n'est pas de la fiche de la mission) : gardée sans source plutôt qu'en échec sur une clé étrangère ; erreurs de champ d'une proposition dites avec « Modifier ».
- **Tests** : le scénario d'isolation de `proposals-run.ts` appelait une copie de la requête ; la requête est maintenant `notesForProposal`, utilisée par l'action et par l'essai (une régression du filtre fait échouer l'essai). Bornes exactes des 30 000 caractères, mutations signalées (nombres du rôle et du bénéfice, appels multiples, casse). Validations de taille faites sous la session (sans connexion : redirection). Code mort retiré (`listNotesWithBodyForClient`, paramètre `signal`) ; la page de modification d'une mission ne charge plus tout le backlog pour un compte ; migration rendue rejouable (`if not exists`).

Reportés : limite de fréquence ou plafond quotidien des générations (décision 6 de la spec : sans plafond ; un utilisateur connecté peut appeler l'action en boucle, coût d'API) ; faux positifs de la vérification des nombres sur les formes « 2.400 », « 16/10/2026 » contre « 16 octobre » et « 12 300 » (la proposition est écartée et signalée, jamais affichée à tort) ; faux négatifs : les nombres de 1 à 9 et écrits en lettres ne sont pas contrôlés (règle héritée du résumé de note : à ne pas survendre) ; l'unicité de position des stories gardées en parallèle (déjà reportée avec la 3.5a) ; `maxDuration` de la fonction (le délai de 60 s est dans l'appel, la durée maximale de la fonction n'a pas été vérifiée sur Vercel).

Rejetés avec preuve : le brief reste en mémoire quand on ferme le panneau (état local à la page, voulu : fermer oublie les propositions, pas la saisie ; rien n'est stocké) ; `PROPOSAL_SYSTEM_PROMPT` dans le paquet du navigateur (une consigne n'est pas un secret) ; la modification d'une proposition échappe à la vérification des chiffres (c'est l'utilisateur qui écrit) ; scénario 4 des essais (le chiffre « 4500 » du brief le rend « connu ») : la ligne du journal est corrigée pour dire ce qu'elle prouve (le modèle n'obéit pas), pas que le code bloque l'injection ; le contenu proposé reste relu par l'utilisateur.
