---
title: 'Story 3.5b : Tâches d''une user story'
type: 'feature'
created: '2026-10-16'
status: 'review'
baseline_commit: '4689420'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** une user story dit *quoi* livrer, pas *quoi faire concrètement* : je ne peux pas la découper ni suivre où j'en suis dans une story.

**Approach:** une migration crée `tasks` (rattachée à une user story, même vérification d'appartenance du parent que `user_stories`) ; sous chaque story du backlog, une liste de tâches : ajout, coche, modification, suppression, **glisser-déposer** ; les stories deviennent **compactes** (une ligne repliée, le détail se déplie) et se réordonnent aussi par glisser-déposer ; la story affiche « 3 sur 4 tâches faites » **sans jamais changer son statut toute seule**.

## Boundaries & Constraints

**Always:**
- SQL montré puis approuvé avant application ; fichier nommé avec la version enregistrée.
- `owner_id uuid not null default auth.uid()` + RLS ; `story_id uuid not null references user_stories on delete cascade` (supprimer une story ou sa mission emporte ses tâches) ; insertion et mise à jour exigent une story à moi.
- Une tâche = **titre** obligatoire (1 à 200 caractères, points de code) + case « faite » (booléen, `false` par défaut) ; rien d'autre.
- **Ordre par glisser-déposer**, pour les tâches **et** les stories (remplace « Monter / Descendre » de la 3.5a) : une poignée par ligne ; souris, toucher (la poignée seule capte le geste, pas d'appui long) et **clavier** (poignée au focus, Espace pour saisir, flèches, Espace pour poser, Échap pour annuler) avec annonces aux lecteurs d'écran en français ; l'ordre est enregistré à la dépose (renumérotation 0, 1, 2… comme aujourd'hui) et se rétablit avec un message en cas d'échec. Bibliothèque : **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`), seule dépendance ajoutée : le glisser-déposer natif du navigateur ne marche pas au toucher. Une nouvelle tâche ou story prend la dernière place (`nextPosition`).
- **Story compacte** : repliée, une seule ligne = poignée, menu de statut (mot en clair), titre, points, « 3/4 tâches » et bouton pour déplier (≥ 44 px de haut sur téléphone, titre sur deux lignes au plus) ; dépliée : phrase « En tant que… », critères, tâches, « Modifier » / « Supprimer ». Une seule story dépliée à la fois n'est pas imposé ; l'état déplié n'est pas mémorisé.
- Avancement d'une story : « N sur M tâches faites » ; aucune tâche : rien d'affiché (jamais « 0 sur 0 »). Cocher la dernière tâche **ne passe pas** la story en « Terminée », et terminer une story ne coche pas ses tâches.
- Les tâches vivent dans la story dépliée (compteur « 3/4 » visible dès la ligne repliée).
- Test d'isolation étendu à `tasks` ; thèmes clair et sombre ; 44 px sur téléphone ; tutoiement ; erreurs en ligne ; cocher en un clic, mise à jour optimiste.

**Never:** sous-tâches ; durée, échéance ou responsable d'une tâche ; tâches sans story ; sprints (3.5c) ; aide de l'IA (8.17 : découpage en tâches ; 8.20 : ordre logique du backlog) ; dépendance autre que dnd-kit.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Ajout | titre | tâche en dernière place ; avancement mis à jour | titre vide ou trop long : erreur en ligne |
| Cocher / décocher | clic sur la case | état persisté, avancement suivi, statut de la story inchangé | échec : message, case rétablie |
| Modification | nouveau titre | tâche mise à jour | tâche supprimée entre-temps : « Cette tâche n'existe plus. » |
| Glisser-déposer (tâche ou story) | déposer sur une autre place, ou clavier (Espace, flèches, Espace) | nouvel ordre affiché tout de suite, enregistré, annoncé | échec : ordre rétabli et message ; élément supprimé ailleurs : écran rechargé |
| Déposer au même endroit / Échap | annulation | rien n'est écrit | N/A |
| Suppression | « Supprimer » puis confirmation (focus sur « Annuler ») | tâche supprimée, annonce, focus sur le champ « Nouvelle tâche » de la story | échec : message, tâche conservée |
| Story sans tâche | aucune | bouton « Ajouter une tâche » seul, pas d'avancement | N/A |
| Story ou mission supprimée | suppression confirmée | ses tâches disparaissent ; la confirmation de suppression de story mentionne le nombre de tâches | N/A |
| Story d'un autre compte | ajout visant une story étrangère | refusé | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `supabase/migrations/20261016102336_user_stories.sql` -- modèle de table et de policies
- `lib/domain/tasks.ts` (+ test) -- validation du titre, `taskProgress`/libellé ; `reorder` et `nextPosition` réutilisés
- `lib/db/tasks.ts` -- tâches des stories d'une mission en une requête (jointure par `story_id in (...)`)
- `app/(app)/missions/task-actions.ts` -- ajouter, modifier, cocher, monter, descendre, supprimer (même squelette que `story-actions.ts`)
- `components/sortable-list.tsx` -- enveloppe dnd-kit commune (poignée, capteurs souris/toucher/clavier, annonces françaises) pour les stories et les tâches
- `components/tasks.tsx` -- liste sous une story dépliée ; `components/backlog.tsx` (`StoryItem` compact/déplié ; retrait de « Monter/Descendre » et de `moveStory` au profit d'une action `reorderStories(missionId, ids)`)
- `app/(app)/missions/[id]/page.tsx` -- charge les tâches ; `components/delete-story` (confirmation) -- compte des tâches
- `tests/isolation.test.ts` ; `docs/journal.md` ; `epics.md`, `sprint-status.yaml`

## Tasks & Acceptance

- [x] Migration `tasks` (SQL montré avant application)
- [x] Règles pures + tests (`lib/domain/tasks.ts`)
- [x] Accès aux données et Server Actions
- [x] Ajout de dnd-kit et enveloppe commune de liste triable (clavier, toucher, annonces)
- [x] Stories compactes (repliées/dépliées) et glisser-déposer du backlog
- [x] Liste de tâches sous chaque story, avancement, confirmation de suppression de story mise à jour
- [x] Tests d'isolation, journal, relecture indépendante

**Acceptance Criteria:**
- Given une story, when j'ajoute une tâche avec un titre, then elle apparaît en dernier sous la story ; sans titre, then une erreur en ligne nomme le champ.
- Given 4 tâches dont 3 cochées, then la story affiche « 3 sur 4 tâches faites » et son statut n'a pas bougé.
- Given plusieurs tâches ou stories, when je glisse l'une d'elles à une autre place (souris, toucher ou clavier), then l'ordre change, persiste après rechargement et est annoncé ; en cas d'échec, l'ordre d'origine revient avec un message.
- Given un backlog de 10 stories, then repliées elles tiennent chacune sur une ligne (deux au plus pour un long titre) sur téléphone comme sur ordinateur.
- Given une tâche, when je la modifie ou la supprime (après confirmation), then la liste le reflète ; given une story supprimée, then ses tâches disparaissent.
- Given une story d'un autre compte, when j'ajoute une tâche, then c'est refusé (`npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Migration proposée (à approuver avant application)

```sql
-- Story 3.5b : tâches d'une user story (RLS : owner_id = auth.uid()).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  story_id uuid not null references public.user_stories (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  done boolean not null default false,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_story_idx on public.tasks (story_id, position);
create index tasks_owner_idx on public.tasks (owner_id);

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une story à moi.
create policy tasks_select on public.tasks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.user_stories s where s.id = story_id and s.owner_id = (select auth.uid()))
  );
create policy tasks_update on public.tasks for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.user_stories s where s.id = story_id and s.owner_id = (select auth.uid()))
  );
create policy tasks_delete on public.tasks for delete to authenticated
  using (owner_id = (select auth.uid()));
```

## Décisions à valider

1. **Une tâche = un titre + une case « faite »** (pas de durée, échéance ni responsable : outil à une seule personne).
2. **Aucun automatisme** entre tâches et statut de la story (cocher tout ne termine pas la story).
3. **Stories compactes** : une ligne repliée, détail et tâches au dépli.
4. **Glisser-déposer** pour les stories et les tâches avec **dnd-kit** (nouvelle dépendance, justifiée par le toucher et le clavier) ; « Monter / Descendre » disparaissent, remplacés par la poignée utilisable au clavier. *(Cela change la décision 4 de la 3.5a, qui avait écarté le glisser-déposer « pour plus tard ».)*
5. **Ordre logique** : hors de cette story. L'ordre de base reste « dernier ajouté en dernier ». L'IA s'en occupe dans une story à part, **8.20 « Ordonner le backlog avec l'IA »** : un bouton « Proposer un ordre logique » (dépendances d'abord, socle avant confort, avec une phrase de raison par déplacement), proposition éphémère à appliquer ou ignorer, rien n'est écrit sans ton accord. En attendant, je fais déjà demander à l'IA de 8.16 de proposer ses stories **dans un ordre logique**, donc un backlog généré arrive ordonné.

## Implementation Notes

- Migration `tasks` appliquée par l'outil Supabase (fichier `20261016170000_tasks.sql`) ; `get_advisors` : rien de nouveau (seul l'avertissement connu sur la protection contre les mots de passe compromis).
- Écarts au Code Map : `reorder` (monter/descendre) est remplacé par `isPermutation` (la liste envoyée doit contenir exactement les mêmes éléments, sinon « a changé entre-temps » et rechargement) ; `lib/db/renumber.ts` renumérote stories et tâches (même `ponytail:` : une mise à jour par ligne déplacée, non atomique) ; `reorderStories` remplace `moveStory`. Une liste triable commune (`components/sortable-list.tsx`) porte la poignée, les capteurs souris/toucher/clavier, l'ordre optimiste et les annonces en français.
- Vérifié dans Chrome (compte fictif, données supprimées ensuite) : déplacement d'une story et d'une tâche au clavier (Espace, flèches, Espace ; Échap annule, annonces, focus conservé) et à la souris (événements pointeur), ordre conservé après rechargement ; ajout (focus et annonce), coche (statut de la story inchangé), titre vide refusé, modification, suppression avec confirmation (focus sur « Annuler », retour sur « Supprimer », focus sur le champ d'ajout après suppression) ; téléphone 412 px : aucun débordement, aucune cible sous 44 px ; thèmes clair et sombre.
- Le glisser à la souris n'a pas pu être rejoué avec l'outil de glisser du navigateur (il envoie des événements HTML5, pas des événements pointeur) : à confirmer à la main sur la preview.

## Triage de la relecture indépendante (3 relecteurs, 2026-10-16)

Aucune faille de cloisonnement (migration, identifiants forgés dans `addTask`, `reorderTasks`, `reorderStories`, XSS : rien). Corrigés :
- **Titre qui n'est pas du texte** (appel à la main d'une Server Action) : un 500 au lieu d'un message ; c'est maintenant un titre vide. **Validation avant la session** : sans connexion, un titre invalide renvoyait un message au lieu de la redirection ; la validation se fait désormais sous la session.
- **Liste d'identifiants non bornée ni normalisée** : `parseReorderIds` (tableau d'UUID, 500 au plus, rendus en minuscules comme la base : une casse mélangée donnait « a changé entre-temps » à tort).
- **`reorderTasks` sur une story inexistante ou étrangère répondait « ok »** (liste vide = permutation de la liste vide) : `renumber` renvoie « changé » quand le parent n'a aucune ligne.
- **Accessibilité du dépli** : `aria-controls` ne pointe plus vers un identifiant absent quand la story est repliée ; le « (déplier) » caché, redondant avec `aria-expanded`, est retiré. Champs de tâche limités à 200 caractères comme la base. `isRedirect` et `UNREACHABLE` copiés trois fois : factorisés dans `lib/client-actions.ts`. Spec alignée sur le code (focus après suppression d'une tâche, toucher par la poignée sans appui long, menu de statut au lieu de pastille).
- **Tests** : `renumber` (fausse base : ordre inchangé, échange, doublons de position, liste périmée, parent vide, ligne disparue, erreurs, échec au milieu qui laisse des positions écrites : limite figée), `parseReorderIds`, doublons croisés, ordre « caractère nul puis espaces », cas à exactement deux tâches ; isolation : B ne renumérote pas la tâche de A, le propriétaire ne se change pas, contraintes à la mise à jour, `updated_at` à la coche, A ne peut pas écrire dans la story de B, la tâche de B reste dans sa story, la cascade vérifie que la tâche existait.

Reportés (`deferred-work.md`) : pas de plafond du nombre de tâches par story (au-delà de 500, un réordonnancement est refusé) ; « Modifier » une story démonte ses tâches (un titre de tâche en cours de saisie est perdu) ; un message d'erreur de réordonnancement reste affiché jusqu'au prochain déplacement ; une story dépliée est difficile à glisser sur téléphone (la replier avant) et la ligne repliée passe sur plusieurs lignes à 412 px ; écriture non atomique et positions simultanées (déjà reportés avec la 3.5a) ; deux tests d'isolation partagent leurs données (ordre obligatoire).

Rejetés : message « ont changé entre-temps » pour une liste qui n'est pas à moi (volontaire : aucun oracle d'existence) ; tests de performance de `isPermutation` sur 5 000 identifiants (la liste est bornée à 500) ; espaces insécables du titre (JS les retire, la base `btrim` non : sans effet, la base accepte le titre nettoyé).
