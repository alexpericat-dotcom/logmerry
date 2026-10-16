---
title: 'Story 3.5 : Découper une mission en étapes'
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

**Problem:** une mission est un bloc : je ne vois pas ce qui reste à faire ni où j'en suis.

**Approach:** une migration crée `mission_steps` (titre, date obligatoire, fait ou non), rattachée à une mission avec la même vérification d'appartenance que les contacts ; la page d'une mission affiche ses étapes par ordre de date, avec ajout, modification, suppression et case « faite » sur place ; la progression (« 2 sur 5 ») s'affiche sur la mission, dans la liste des missions et sur la fiche du client.

## Boundaries & Constraints

**Décisions proposées (à valider par le propriétaire) :** voir « Décisions à valider » plus bas ; la spec est écrite avec les valeurs recommandées.

**Always:**
- SQL montré puis approuvé avant application ; fichier nommé avec la version enregistrée.
- `owner_id uuid not null default auth.uid()` + RLS ; `mission_id uuid not null references missions on delete cascade` (supprimer une mission supprime ses étapes) ; les policies d'insertion et de mise à jour vérifient que la mission est à moi.
- Titre 1 à 200 caractères (points de code) ; **date obligatoire** (colonne `date not null`) ; faite = `done_at timestamptz` (nul = à faire).
- Tri : par date croissante, puis les étapes faites et non faites mélangées dans l'ordre des dates ; à égalité de date, l'ordre de création.
- Progression : « N sur M » (étapes faites sur étapes totales) ; une mission sans étape n'affiche pas de progression (« Aucune étape »), jamais « 0 sur 0 ».
- Une étape à faire dont la date est passée est marquée « En retard » (icône + mot, jamais la couleur seule) ; « passée » = avant aujourd'hui à Paris.
- Cocher et décocher une étape : un clic, sans quitter la page ; l'état est annoncé aux lecteurs d'écran (`aria-pressed` ou case native avec libellé nommant l'étape).
- Test d'isolation étendu à `mission_steps` ; thèmes clair et sombre ; 44 px sur téléphone ; tutoiement ; erreurs en ligne nommant le champ.

**Never:** changer automatiquement le statut de la mission quand toutes les étapes sont faites ; rappels ou notifications (epic 5) ; réorganisation par glisser-déposer ; sous-étapes ; description ou durée d'une étape ; recherche ⌘K des étapes ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Ajout | titre + date sur une mission | l'étape apparaît à sa place par date ; progression mise à jour | titre vide : erreur en ligne ; date vide ou invalide : « Une étape a besoin d'une date. » |
| Cocher | clic sur la case d'une étape | étape faite (`done_at` = maintenant), progression + 1 | échec : message, état inchangé |
| Décocher | clic sur une étape faite | à nouveau à faire (`done_at` nul) | idem |
| Modification | nouveau titre ou nouvelle date | étape remise à sa place par date | étape supprimée entre-temps : « Cette étape n'existe plus. » |
| Suppression | « Supprimer » puis confirmation (focus sur « Annuler ») | étape supprimée, progression recalculée | échec : message, étape conservée |
| Étape en retard | à faire, date avant aujourd'hui (Paris) | pastille « En retard » | N/A |
| Mission sans étape | aucune étape | phrase d'explication + bouton d'ajout ; liste et fiche affichent « Aucune étape » | N/A |
| Mission supprimée | suppression confirmée | ses étapes disparaissent avec elle | N/A |
| Mission d'un autre compte | ajout visant une mission étrangère | refusé | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `supabase/migrations/20261015162137_missions.sql`, `20261014230836_contacts.sql` -- modèle de table et de policies avec vérification du parent
- `lib/domain/mission-steps.ts` (+ test) -- validation (titre, date obligatoire), tri, progression, « en retard » ; `lib/db/mission-steps.ts` -- étapes d'une mission, progression de plusieurs missions en une requête
- `app/(app)/missions/step-actions.ts` -- ajouter, modifier, cocher, supprimer
- `components/mission-steps.tsx` (liste, formulaire en place, case, suppression avec confirmation ; modèle : `components/contacts-section.tsx`)
- `app/(app)/missions/[id]/page.tsx` -- section « Étapes » et progression ; `app/(app)/missions/page.tsx` -- colonne « Avancement » ; `app/(app)/clients/[id]/page.tsx` -- progression dans la liste des missions
- `tests/isolation.test.ts` ; `docs/journal.md`

## Tasks & Acceptance

- [ ] Migration `mission_steps` (SQL montré avant application)
- [ ] Règles pures + tests (`lib/domain/mission-steps.ts`)
- [ ] Accès aux données et Server Actions (ajouter, modifier, cocher, supprimer)
- [ ] Section « Étapes » sur la mission ; progression sur la mission, la liste et la fiche client
- [ ] Tests d'isolation, journal

**Acceptance Criteria:**
- Given une mission, when j'ajoute une étape (titre + date), then elle s'affiche à sa place par ordre de date ; sans date, then elle est refusée avec un message qui nomme le champ.
- Given 5 étapes dont 2 faites, then la mission affiche « 2 sur 5 » (page de la mission, liste des missions, fiche du client).
- Given une étape, when je la coche puis la décoche, then la progression suit, sans quitter la page.
- Given une étape à faire dont la date est passée, then elle porte la pastille « En retard ».
- Given une mission supprimée, then ses étapes disparaissent ; given une mission d'un autre compte, when j'ajoute une étape, then c'est refusé (`npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Migration proposée (à approuver avant application)

```sql
-- Story 3.5 : étapes datées d'une mission (RLS : owner_id = auth.uid()).
create table public.mission_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  due_date date not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mission_steps_mission_idx on public.mission_steps (mission_id, due_date);
create index mission_steps_owner_idx on public.mission_steps (owner_id);

create trigger mission_steps_set_updated_at before update on public.mission_steps
  for each row execute function public.set_updated_at();

alter table public.mission_steps enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une mission à moi.
create policy mission_steps_select on public.mission_steps for select to authenticated
  using (owner_id = (select auth.uid()));
create policy mission_steps_insert on public.mission_steps for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy mission_steps_update on public.mission_steps for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy mission_steps_delete on public.mission_steps for delete to authenticated
  using (owner_id = (select auth.uid()));
```

La suppression d'une mission emporte ses étapes (`on delete cascade`) : la mission est le parent, une étape n'a pas de sens seule. Contrairement aux missions d'une fiche, aucun refus n'est nécessaire.

## Décisions à valider

1. **Étape faite** : `done_at` (la date de la case cochée) plutôt qu'un simple booléen : on sait quand, ça servira au cockpit. L'étape reste modifiable.
2. **Modifier et supprimer une étape** : oui, sur place, comme les contacts (formulaire dans la liste, confirmation avant suppression).
3. **Où** : section « Étapes » sur la page de la mission ; progression « N sur M » aussi dans la liste des missions (colonne « Avancement ») et sur la fiche du client.
4. **« En retard »** : une étape non faite dont la date est passée porte cette pastille (icône + mot). Un peu au-delà de l'epic, mais cela prépare le cockpit « Aujourd'hui » (epic 5) sans coût.
5. **Pas d'automatisme** : toutes les étapes faites ne passent pas la mission en « Terminée » ; tu gardes la main sur le statut.
