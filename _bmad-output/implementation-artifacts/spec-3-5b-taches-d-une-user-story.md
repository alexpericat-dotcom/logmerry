---
title: 'Story 3.5b : Tâches d''une user story'
type: 'feature'
created: '2026-10-16'
status: 'draft'
baseline_commit: '4689420'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** une user story dit *quoi* livrer, pas *quoi faire concrètement* : je ne peux pas la découper ni suivre où j'en suis dans une story.

**Approach:** une migration crée `tasks` (rattachée à une user story, même vérification d'appartenance du parent que `user_stories`) ; sous chaque story du backlog, une liste de tâches : ajout, coche, modification, suppression, déplacement ; la story affiche « 3 sur 4 tâches faites » **sans jamais changer son statut toute seule**.

## Boundaries & Constraints

**Always:**
- SQL montré puis approuvé avant application ; fichier nommé avec la version enregistrée.
- `owner_id uuid not null default auth.uid()` + RLS ; `story_id uuid not null references user_stories on delete cascade` (supprimer une story ou sa mission emporte ses tâches) ; insertion et mise à jour exigent une story à moi.
- Une tâche = **titre** obligatoire (1 à 200 caractères, points de code) + case « faite » (booléen, `false` par défaut) ; rien d'autre.
- **Ordre** : colonne `position`, une nouvelle tâche prend la dernière place ; « Monter » / « Descendre » (mêmes règles que le backlog : `aria-disabled`, renumérotation, annonce aux lecteurs d'écran), en réutilisant `reorder` et `nextPosition` de `lib/domain/user-stories.ts`.
- Avancement d'une story : « N sur M tâches faites » ; aucune tâche : rien d'affiché (jamais « 0 sur 0 »). Cocher la dernière tâche **ne passe pas** la story en « Terminée », et terminer une story ne coche pas ses tâches.
- Tâches repliées par défaut (« 3 sur 4 tâches faites » sert de bouton) pour ne pas alourdir le backlog ; état déplié non mémorisé.
- Test d'isolation étendu à `tasks` ; thèmes clair et sombre ; 44 px sur téléphone ; tutoiement ; erreurs en ligne ; cocher en un clic, mise à jour optimiste.

**Never:** sous-tâches ; durée, échéance ou responsable d'une tâche ; tâches sans story ; sprints (3.5c) ; aide de l'IA (8.17 : découpage en tâches) ; glisser-déposer ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Ajout | titre | tâche en dernière place ; avancement mis à jour | titre vide ou trop long : erreur en ligne |
| Cocher / décocher | clic sur la case | état persisté, avancement suivi, statut de la story inchangé | échec : message, case rétablie |
| Modification | nouveau titre | tâche mise à jour | tâche supprimée entre-temps : « Cette tâche n'existe plus. » |
| Monter / descendre | clic | échange avec la voisine ; haut/bas désactivés (`aria-disabled`) | échec : message, ordre inchangé |
| Suppression | « Supprimer » puis confirmation (focus sur « Annuler ») | tâche supprimée, annonce, focus sur le titre de la story | échec : message, tâche conservée |
| Story sans tâche | aucune | bouton « Ajouter une tâche » seul, pas d'avancement | N/A |
| Story ou mission supprimée | suppression confirmée | ses tâches disparaissent ; la confirmation de suppression de story mentionne le nombre de tâches | N/A |
| Story d'un autre compte | ajout visant une story étrangère | refusé | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `supabase/migrations/20261016102336_user_stories.sql` -- modèle de table et de policies
- `lib/domain/tasks.ts` (+ test) -- validation du titre, `taskProgress`/libellé ; `reorder` et `nextPosition` réutilisés
- `lib/db/tasks.ts` -- tâches des stories d'une mission en une requête (jointure par `story_id in (...)`)
- `app/(app)/missions/task-actions.ts` -- ajouter, modifier, cocher, monter, descendre, supprimer (même squelette que `story-actions.ts`)
- `components/tasks.tsx` -- liste repliable sous une story ; branchée dans `components/backlog.tsx` (`StoryItem`)
- `app/(app)/missions/[id]/page.tsx` -- charge les tâches ; `components/delete-story` (confirmation) -- compte des tâches
- `tests/isolation.test.ts` ; `docs/journal.md` ; `epics.md`, `sprint-status.yaml`

## Tasks & Acceptance

- [ ] Migration `tasks` (SQL montré avant application)
- [ ] Règles pures + tests (`lib/domain/tasks.ts`)
- [ ] Accès aux données et Server Actions
- [ ] Liste de tâches sous chaque story, avancement, confirmation de suppression de story mise à jour
- [ ] Tests d'isolation, journal, relecture indépendante

**Acceptance Criteria:**
- Given une story, when j'ajoute une tâche avec un titre, then elle apparaît en dernier sous la story ; sans titre, then une erreur en ligne nomme le champ.
- Given 4 tâches dont 3 cochées, then la story affiche « 3 sur 4 tâches faites » et son statut n'a pas bougé.
- Given plusieurs tâches, when je monte ou descends une tâche, then l'ordre persiste ; la première ne monte pas, la dernière ne descend pas.
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
3. **Tâches repliées par défaut** sous la story, l'avancement « 3 sur 4 tâches faites » servant de bouton pour les déplier.
4. **Réordonnancement par boutons**, comme le backlog.
