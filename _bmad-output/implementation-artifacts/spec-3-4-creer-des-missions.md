---
title: 'Story 3.4 : Créer des missions'
type: 'feature'
created: '2026-10-15'
status: 'review'
baseline_commit: 'aec6daf'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** je n'ai aucun endroit pour noter le travail que je fais pour un client ; la page « Missions » de la barre latérale est grisée.

**Approach:** une migration crée la table `missions` (rattachée obligatoirement à une fiche, RLS qui vérifie aussi que la fiche est à moi) ; une page « Missions » liste mes missions (filtre par statut, tri) ; la fiche d'un client affiche ses missions et permet d'en créer ; une mission se modifie et se supprime après confirmation.

## Boundaries & Constraints

**Décisions du propriétaire (2026-10-15) :** champs d'une mission : client et titre obligatoires, statut (en cours, terminée, annulée ; « en cours » par défaut), date de début et date de fin facultatives ; ni montant ni description (l'epic 4 s'en charge) ; supprimer une fiche qui a des missions est **refusé** avec un message clair ; page Missions + section « Missions » sur la fiche (avant les notes) ; modification et suppression avec confirmation.

**Always:**
- SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée ou l'horodatage d'origine si appliqué par l'éditeur SQL.
- `owner_id uuid not null default auth.uid()` + RLS ; `client_id uuid not null references clients on delete restrict` ; les policies d'insertion et de mise à jour vérifient que la fiche est à moi (modèle de `contacts`).
- Titre 1 à 200 caractères (points de code, comme les notes) ; `end_date >= start_date` quand les deux sont saisies (règle en base et en serveur) ; un champ facultatif vide = absent.
- Statut en enum Postgres ; libellés français « En cours », « Terminée », « Annulée » ; pastille avec icône et mot (jamais la couleur seule), sans réutiliser la couleur du prospect.
- Suppression de la fiche : la base refuse (clé étrangère) ; l'action le traduit en « Cette fiche a N missions : supprime-les ou garde la fiche. » et `DeleteClient` affiche le nombre de missions avant de proposer la suppression.
- Tableau réutilisable `DataTable` : nom de la mission en lien, colonne client, statut, dates en mono tabulaire ; état `role="status"` après filtre ; vide = phrase d'explication + une action.
- Test d'isolation étendu à `missions` (deux comptes : visibilité, modification, suppression, création au nom de l'autre ou sur une fiche étrangère, contraintes, suppression de fiche refusée tant qu'elle a des missions).
- Thèmes clair et sombre, 44 px sur téléphone, tutoiement, erreurs en ligne nommant le champ.

**Never:** étapes datées (3.5) ; devis (3.6) ; recherche ⌘K des missions (3.7) ; montants, factures ; lien note-mission ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Création depuis la fiche | titre (+ statut, dates) ; client déjà choisi | la mission apparaît sur la fiche et dans la liste | titre vide ou trop long : erreur en ligne |
| Création depuis la page Missions | choix d'un client + titre | idem | aucun client : « Crée d'abord une fiche client ou prospect » |
| Dates incohérentes | fin avant début | refusé, erreur en ligne sur la date de fin | aucune écriture |
| Modification | nouveau titre, statut, dates ; client inchangé | mission mise à jour ; champ vidé = absent | mission supprimée entre-temps : « Cette mission n'existe plus. » |
| Suppression | confirmation (focus sur « Annuler ») | mission supprimée, la fiche reste | échec : message, mission conservée |
| Suppression d'une fiche avec missions | « Supprimer cette fiche » | refusée, nombre de missions indiqué | message visible, fiche conservée |
| Fiche d'un autre compte | `client_id` forgé | refusé | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Filtre par statut | `?statut=terminee` | seules les missions terminées | statut inconnu : ignoré |

## Code Map

- `supabase/migrations/20261014230836_contacts.sql` -- modèle de table et de policies avec vérification de la fiche
- `lib/domain/missions.ts` (+ test) -- validation (titre, statut, dates), vue (filtre, tri), libellés ; modèle : `lib/domain/clients.ts`
- `lib/db/missions.ts` -- liste de mes missions (avec le nom du client), missions d'une fiche, une mission, nombre de missions d'une fiche
- `app/(app)/missions/` -- `page.tsx` (liste), `nouvelle/page.tsx`, `[id]/page.tsx` (vue) et `[id]/modifier/page.tsx` ; `actions.ts` (créer, modifier, supprimer)
- `app/(app)/clients/[id]/page.tsx` -- section « Missions » avant « Notes » ; `app/(app)/clients/actions.ts` et `components/delete-client.tsx` -- refus et message de suppression
- `components/mission-form.tsx`, `components/mission-status.tsx`, `components/delete-mission.tsx`
- `lib/nav.ts` -- activer « Missions » ; `tests/isolation.test.ts` ; `docs/journal.md`

## Tasks & Acceptance

- [x] Migration `missions` (SQL montré avant application)
- [x] Règles pures + tests (`lib/domain/missions.ts`)
- [x] Accès aux données et Server Actions (créer, modifier, supprimer) ; refus de suppression de la fiche
- [x] Pages : liste, création, vue, modification ; section sur la fiche ; navigation activée
- [x] Tests d'isolation, journal

**Acceptance Criteria:**
- Given une fiche client, when je crée une mission avec un titre, then elle apparaît sur la fiche et dans la page Missions ; sans titre, then une erreur en ligne nomme le champ.
- Given une mission, when je la modifie ou la supprime (après confirmation), then la liste le reflète ; when la suppression échoue, then elle reste.
- Given une fiche avec des missions, when je veux la supprimer, then c'est refusé avec le nombre de missions ; sans mission, la suppression marche comme avant.
- Given des dates où la fin précède le début, then c'est refusé.
- Given le filtre « Terminées », then seules les missions terminées sont listées.
- Given un compte B, then il ne voit, ne modifie, ne supprime ni ne crée rien sur les missions et fiches de A (`npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Migration proposée (à approuver avant application)

```sql
-- Story 3.4 : missions d'une fiche client (RLS : owner_id = auth.uid()).
create type public.mission_status as enum ('in_progress', 'done', 'cancelled');

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status public.mission_status not null default 'in_progress',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create index missions_client_idx on public.missions (client_id);
create index missions_owner_idx on public.missions (owner_id);

create trigger missions_set_updated_at before update on public.missions
  for each row execute function public.set_updated_at();

alter table public.missions enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une fiche à moi.
create policy missions_select on public.missions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy missions_insert on public.missions for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );
create policy missions_update on public.missions for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );
create policy missions_delete on public.missions for delete to authenticated
  using (owner_id = (select auth.uid()));
```

`on delete restrict` : la base elle-même empêche de supprimer une fiche qui a des missions ; l'interface explique pourquoi.

## Implementation Notes

- Migration appliquée par l'outil Supabase (version 20261015162137, fichier renommé). `get_advisors` : rien de nouveau.
- Écarts au Code Map : `components/unset.tsx` (valeur absente accessible), `formatDate` dans `lib/format.ts` (date sans heure), `whitespace-nowrap` sur la pastille partagée `components/ui/badge.tsx` (effet sur toutes les pastilles, voulu : la pastille « En cours » se coupait en deux lignes sur téléphone), `missionsRefusal` dans `lib/domain/missions.ts` (un fichier d'actions serveur ne peut exporter que des fonctions asynchrones).
- Accord du refus de suppression : « 1 mission : supprime-la », « N missions : supprime-les » (la spec disait « N missions » seulement).

## Triage de la relecture indépendante (3 relecteurs, 2026-10-16)

Corrigés :
- Modification : le client vient de la mission, pas du champ caché (qui pouvait faire échouer l'enregistrement sans message, répondre « fiche inexistante » à tort ou revalider la mauvaise fiche) ; vérifié dans Chrome avec un champ falsifié.
- Refus de suppression de la fiche : message générique si le compte de missions est nul ou illisible (plus de faux « a des missions ») ; lien « Voir ses missions » dans la note.
- Dates : année avant 1900 refusée (0000 passait en JavaScript, Postgres la refuse).
- Mission déjà supprimée : retour à la liste au lieu d'une page morte ; pages de la mission revalidées après suppression.
- Tiret « non renseignée » : texte pour lecteurs d'écran à la place d'un `aria-label` sur un `span` ; doublon d'`isUuid` retiré ; deux requêtes de la page de modification de fiche en parallèle ; cast qui masquait le typage de `save` remplacé par un type union.
- Tests : longueur en émoji, tris par fin, client et statut, départage et accents, `nextDir`, adresse (tri décroissant, tableau), identifiant mal formé, dates avec espaces, année 0000 ; isolation avec codes d'erreur précis (23514, 22P02, 42501) et mission de A vérifiée entière.
- Cases des tâches de la spec cochées.

Reportés (`deferred-work.md`) : suppression d'un compte `auth.users` qui a des fiches et des missions (le `restrict` immédiat peut échouer selon l'ordre des cascades) ; plafond de 1 000 lignes de l'API sur la liste ; tests des Server Actions de missions ; double envoi du formulaire sans clé d'idempotence.

Rejetés avec preuve : « le client choisi saute après une erreur » (menu non contrôlé : vérifié dans Chrome, le client est conservé) ; défense en profondeur par `owner_id` (même schéma que clients et notes, la RLS est la barrière, `server-only` en place) ; message d'erreur obsolète après annulation de la confirmation (schéma existant des suppressions, cosmétique) ; liste filtrée vide sans bouton (les pastilles de filtre restent le moyen d'agir).
