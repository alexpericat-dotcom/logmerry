---
title: 'Story 3.5a : Backlog et user stories d''une mission'
type: 'feature'
created: '2026-10-16'
status: 'draft'
baseline_commit: '4cf0217'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** une mission est un bloc : je ne vois pas ce qu'il reste à faire pour mon client ni dans quel ordre.

**Approach:** une migration crée `user_stories` (rattachée à une mission, avec la même vérification d'appartenance que les contacts et les missions) ; la page d'une mission affiche son **backlog** : les user stories dans l'ordre de priorité, avec ajout, modification, suppression, changement de statut et déplacement vers le haut ou le bas ; la progression (« 2 sur 5 stories terminées ») s'affiche sur la mission, dans la liste des missions et sur la fiche du client.

*Cette story remplace l'ancienne « étapes datées » (décision d'Alex, 2026-10-16 : méthode et vocabulaire agile). Les tâches (3.5b) et les sprints (3.5c) suivent, puis l'aide de l'IA (8.16 à 8.19).*

## Boundaries & Constraints

**Décisions proposées (à valider par le propriétaire) :** voir « Décisions à valider » plus bas ; la spec est écrite avec les valeurs recommandées.

**Always:**
- SQL montré puis approuvé avant application ; fichier nommé avec la version enregistrée.
- `owner_id uuid not null default auth.uid()` + RLS ; `mission_id uuid not null references missions on delete cascade` (supprimer une mission supprime son backlog) ; les policies d'insertion et de mise à jour vérifient que la mission est à moi.
- Une user story = un **titre** obligatoire (1 à 200 caractères, points de code : ce que « je veux ») ; facultatifs : **rôle** (« en tant que », 200 au plus), **bénéfice** (« afin de », 300 au plus), **critères d'acceptation** (texte libre, 4 000 au plus), **points** (suite de Fibonacci : 1, 2, 3, 5, 8, 13). Un champ facultatif vide = absent.
- **Statut** : à faire, en cours, terminée (« à faire » par défaut) ; pastille icône + mot, jamais la couleur seule.
- **Priorité** : colonne `position` ; une nouvelle story prend la dernière place ; boutons « Monter » et « Descendre » (pas de glisser-déposer) ; le déplacement échange deux positions voisines et est annoncé aux lecteurs d'écran.
- Phrase affichée « En tant que {rôle}, je veux {titre}, afin de {bénéfice} » quand rôle et bénéfice sont renseignés ; sinon le titre seul.
- Progression : « N sur M stories terminées » ; aucune story : « Aucune user story » (jamais « 0 sur 0 ») ; terminer toutes les stories ne change pas le statut de la mission.
- Test d'isolation étendu à `user_stories` ; thèmes clair et sombre ; 44 px sur téléphone ; tutoiement ; erreurs en ligne nommant le champ.

**Never:** tâches (3.5b) ; sprints (3.5c) ; aide de l'IA (8.16 à 8.19) ; estimation en heures ; glisser-déposer ; commentaires ou pièces jointes ; recherche ⌘K des stories ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Ajout | titre (+ rôle, bénéfice, critères, points) | la story apparaît en dernier dans le backlog ; progression mise à jour | titre vide ou trop long : erreur en ligne ; points hors suite : refusé |
| Modification | nouveaux champs ; champ vidé = absent | story mise à jour à sa place | story supprimée entre-temps : « Cette user story n'existe plus. » |
| Changement de statut | choix d'un statut | statut mis à jour, progression suivie, sans quitter la page | échec : message, état inchangé |
| Monter / descendre | clic | la story échange sa place avec sa voisine ; en haut, « Monter » est désactivé ; en bas, « Descendre » aussi | échec : message, ordre inchangé |
| Suppression | « Supprimer » puis confirmation (focus sur « Annuler ») | story supprimée ; l'ordre des autres est conservé | échec : message, story conservée |
| Backlog vide | aucune story | phrase d'explication + bouton d'ajout ; liste et fiche : « Aucune user story » | N/A |
| Mission supprimée | suppression confirmée | son backlog disparaît avec elle | N/A |
| Mission d'un autre compte | ajout visant une mission étrangère | refusé | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `supabase/migrations/20261015162137_missions.sql`, `20261014230836_contacts.sql` -- modèle de table et de policies avec vérification du parent
- `lib/domain/user-stories.ts` (+ test) -- validation, phrase « En tant que… », progression, déplacement (échange de positions voisines) ; `lib/db/user-stories.ts` -- backlog d'une mission, progression de plusieurs missions en une requête
- `app/(app)/missions/story-actions.ts` -- ajouter, modifier, changer le statut, monter, descendre, supprimer
- `components/backlog.tsx` (liste, formulaire en place, statut, déplacement, suppression avec confirmation ; modèle : `components/contacts-section.tsx`), `components/story-status.tsx`
- `app/(app)/missions/[id]/page.tsx` -- section « Backlog » et progression ; `app/(app)/missions/page.tsx` -- colonne « Avancement » ; `app/(app)/clients/[id]/page.tsx` -- progression dans la liste des missions
- `tests/isolation.test.ts` ; `docs/journal.md`

## Tasks & Acceptance

- [ ] Migration `user_stories` (SQL montré avant application)
- [ ] Règles pures + tests (`lib/domain/user-stories.ts`)
- [ ] Accès aux données et Server Actions (ajouter, modifier, statut, monter, descendre, supprimer)
- [ ] Section « Backlog » sur la mission ; progression sur la mission, la liste et la fiche client
- [ ] Tests d'isolation, journal

**Acceptance Criteria:**
- Given une mission, when j'ajoute une user story avec un titre, then elle apparaît à la dernière place du backlog ; sans titre, then une erreur en ligne nomme le champ.
- Given plusieurs stories, when je monte ou descends une story, then l'ordre change et persiste ; la première ne peut pas monter, la dernière ne peut pas descendre.
- Given 5 stories dont 2 terminées, then la mission affiche « 2 sur 5 stories terminées » (page de la mission, liste des missions, fiche du client).
- Given une story, when je la modifie ou la supprime (après confirmation), then le backlog le reflète ; given une mission supprimée, then son backlog disparaît.
- Given une mission d'un autre compte, when j'ajoute une story, then c'est refusé (`npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Migration proposée (à approuver avant application)

```sql
-- Story 3.5a : user stories du backlog d'une mission (RLS : owner_id = auth.uid()).
create type public.story_status as enum ('todo', 'in_progress', 'done');

create table public.user_stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  role text check (role is null or char_length(btrim(role)) between 1 and 200),
  benefit text check (benefit is null or char_length(btrim(benefit)) between 1 and 300),
  acceptance_criteria text check (acceptance_criteria is null or char_length(btrim(acceptance_criteria)) between 1 and 4000),
  points smallint check (points is null or points in (1, 2, 3, 5, 8, 13)),
  status public.story_status not null default 'todo',
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_stories_mission_idx on public.user_stories (mission_id, position);
create index user_stories_owner_idx on public.user_stories (owner_id);

create trigger user_stories_set_updated_at before update on public.user_stories
  for each row execute function public.set_updated_at();

alter table public.user_stories enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une mission à moi.
create policy user_stories_select on public.user_stories for select to authenticated
  using (owner_id = (select auth.uid()));
create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy user_stories_delete on public.user_stories for delete to authenticated
  using (owner_id = (select auth.uid()));
```

Supprimer une mission emporte son backlog (`on delete cascade`) : la mission est le parent. Le lien avec un sprint (`sprint_id`) viendra avec la 3.5c, et le lien avec la note d'origine d'une story générée par l'IA avec la 8.16 : une migration par besoin.

## Décisions à valider

1. **Format d'une user story** : un titre obligatoire (le « je veux »), plus rôle, bénéfice, critères d'acceptation et points en facultatif. Les stories se lisent « En tant que… je veux… afin de… » quand tu remplis rôle et bénéfice.
2. **Points** : suite de Fibonacci (1, 2, 3, 5, 8, 13), facultatifs ; ils serviront à composer un sprint (3.5c, 8.19). Pas d'heures.
3. **Statuts** : à faire, en cours, terminée.
4. **Priorité par boutons « Monter » et « Descendre »** plutôt que par glisser-déposer : simple, accessible au clavier et au toucher. Le glisser-déposer pourra venir plus tard.
5. **Pas d'automatisme** : terminer toutes les stories ne passe pas la mission en « Terminée ».
