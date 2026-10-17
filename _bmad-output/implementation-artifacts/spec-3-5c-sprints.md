---
title: 'Story 3.5c : Sprints'
type: 'feature'
created: '2026-10-17'
status: 'review'
baseline_commit: '8e4a030'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5b-taches-d-une-user-story.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** le backlog d'une mission est une seule liste : je ne vois pas ce que je livre **maintenant**, sur quelle période, avec quel objectif (demande d'Alex du 16 octobre : « des sprints, du Backlog, de la User story et des tâches »).

**Approach:** une migration crée `sprints` (rattachés à une mission : nom, objectif en une phrase, dates, état *planifié / en cours / clos*) et ajoute `sprint_id` aux user stories. La page d'une mission montre trois blocs : le **sprint en cours** (objectif, dates, jours restants, avancement en stories et en points), les **sprints planifiés**, puis le **backlog** (stories hors sprint). Je place une story dans un sprint, ou l'en retire, depuis la story dépliée ; je démarre et je clos un sprint ; à la clôture, les stories non terminées retournent au backlog ou passent au sprint suivant (mon choix).

*Cette story fixe aussi ce que le cockpit lira plus tard (dates du sprint, état, stories en cours) : décision de l'auteur du 17 octobre, « on doit relier tout ça au cockpit ». Le cockpit lui-même reste dans les stories 5.x ; voir « Décisions à valider ».*

## Boundaries & Constraints

**Always:**
- SQL montré puis approuvé avant application ; fichier nommé avec la version enregistrée.
- Table `sprints` : `owner_id uuid not null default auth.uid()` + RLS ; `mission_id uuid not null references missions on delete cascade` ; nom obligatoire (1 à 120 caractères) ; objectif facultatif (300 au plus) ; `start_date` et `end_date` obligatoires, **fin ≥ début** (contrainte de base) ; `status` enum `planned` (par défaut), `active`, `closed`. **Un seul sprint `active` par mission**, garanti par un index unique partiel (`where status = 'active'`).
- `user_stories.sprint_id uuid null references sprints on delete set null` : supprimer un sprint renvoie ses stories au backlog. **Les policies d'insertion et de mise à jour de `user_stories` vérifient** (les clés étrangères contournent la RLS) que le sprint est à moi **et de la même mission** que la story.
- Ordre : la colonne `position` ordonne les stories **à l'intérieur de leur liste** (backlog hors sprint, ou un sprint donné) ; une story qui change de liste prend la dernière place de la liste d'arrivée (menu « Sprint ») ou la place visée (glisser-déposer). Le glisser-déposer de la 3.5b s'applique dans chaque liste (`renumber` prend un filtre de liste en plus de la mission).
- **Glisser-déposer entre listes (ajout du 17 octobre, demande d'Alex) :** une story se glisse du backlog vers un sprint planifié ou en cours, d'un sprint vers le backlog ou vers un autre sprint non clos. Un seul `DndContext` couvre la page de la mission, une liste triable par sprint non clos et une pour le backlog. Les sprints **clos** ne sont ni source ni cible (liste figée, sans zone de dépôt) ; le serveur refuse aussi un dépôt dans un sprint clos (« Ce sprint est clos »). Une liste vide reste une cible de dépôt visible. **Le menu « Sprint » reste** : c'est l'équivalent clavier et lecteur d'écran, et il ne change pas. Le dépôt envoie une seule action (`moveStory` : story, sprint d'arrivée, ordre complet de la liste d'arrivée) ; l'écran montre l'issue tout de suite et revient à l'état d'origine avec un message si l'enregistrement échoue. Annonces en français nommant la liste (« déposé dans le sprint « X », position 2 sur 3 »).
- **Démarrer** un sprint : seulement s'il est planifié et qu'aucun autre n'est en cours (sinon « Un sprint est déjà en cours. Clos-le d'abord. »). **Clore** : le sprint passe à « clos » ; les stories **non terminées** reviennent au backlog (par défaut) ou passent à un sprint **planifié** que je choisis ; les stories terminées restent dans le sprint clos (historique). Les stories sont déplacées en **une seule écriture** avant le changement d'état, de sorte qu'un échec laisse le sprint « en cours » et rejouable.
- Avancement d'un sprint : « N sur M stories terminées » et « X sur Y points » (les stories sans points comptent 0) ; jamais « 0 sur 0 » (sprint vide : « Aucune story dans ce sprint »). Terminer toutes les stories ne clôt pas le sprint toute seule.
- Un sprint clos ne se démarre plus ; son nom et son objectif restent modifiables, pas ses dates ni son contenu. Les sprints se suppriment avec confirmation (« N stories retourneront au backlog »).
- Les sprints peuvent se chevaucher en dates (pas de contrôle de chevauchement au MVP).
- Jours restants d'un sprint en cours : calculés à la date du jour de Paris dans `lib/domain/` (« se termine dans 3 jours », « se termine aujourd'hui », « terminé depuis 2 jours »), sans heure.
- Test d'isolation étendu à `sprints` et à `user_stories.sprint_id` ; thèmes clair et sombre ; 44 px sur téléphone ; tutoiement ; erreurs en ligne ; clavier et annonces pour les changements de liste.

**Never:** modification du cockpit (stories 5.x : il lira ces données plus tard) ; retirer le menu « Sprint » (alternative clavier et lecteurs d'écran du glisser-déposer entre listes) ; sprint sans mission ; vélocité ou graphique d'avancement ; estimation en heures ; aide de l'IA (8.19) ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Créer un sprint | nom, objectif, début, fin | sprint « planifié » ajouté sous les autres | nom vide ou trop long, fin avant début : erreur en ligne nommant le champ |
| Placer une story | menu « Sprint » de la story dépliée | la story passe dans ce sprint, en dernière place ; avancement des deux listes mis à jour ; annonce | sprint supprimé entre-temps : « Ce sprint n'existe plus. », écran rechargé |
| Retirer une story | choix « Hors sprint » | retour au backlog, en dernière place | échec : message, état inchangé |
| Placer dans un sprint clos | choix d'un sprint clos | refusé : le menu ne propose que « Hors sprint », les sprints planifiés et le sprint en cours | contrôle serveur : « Ce sprint est clos. » |
| Démarrer | clic sur « Démarrer le sprint » | état « en cours » ; le bloc passe en tête | un autre sprint en cours : message ; double démarrage : l'index unique refuse |
| Clore, stories non terminées, choix « backlog » | clic sur « Clore », choix par défaut | non terminées hors sprint, sprint « clos » avec ses stories terminées | échec avant la clôture : sprint toujours « en cours » |
| Clore, choix « sprint suivant » | un sprint planifié choisi | non terminées déplacées à la fin de ce sprint | sprint choisi disparu ou non planifié : refus |
| Clore sans story non terminée | tout est terminé | clôture directe | N/A |
| Fin avant début | dates inversées | refusé avant tout envoi, et par la base | erreur en ligne |
| Supprimer un sprint | « Supprimer » puis confirmation | stories renvoyées au backlog ; confirmation avec leur nombre | échec : message, sprint conservé |
| Mission supprimée | suppression confirmée | ses sprints disparaissent ; les stories aussi (déjà le cas) | N/A |
| Sprint d'une autre mission | `sprint_id` forgé dans une story | refusé (policy) | 42501 |
| Réordonner dans une liste | glisser-déposer dans le sprint ou le backlog | ordre enregistré dans cette liste seulement | liste changée entre-temps : « a changé entre-temps », rechargement |
| Glisser une story dans une autre liste | dépôt sur une story ou sur la liste (même vide) d'un sprint planifié, en cours, ou du backlog | story dans la liste d'arrivée à la place visée (dernière si le dépôt vise la liste) ; avancements et annonce mis à jour | échec : ordre d'origine rétabli, message en ligne ; liste d'arrivée changée entre-temps : « a changé entre-temps », rechargement |
| Glisser vers un sprint clos | dépôt au-dessus d'un sprint clos | impossible : pas de zone de dépôt, la story reste où elle était | action forgée : « Ce sprint est clos. » |
| Glisser une story d'un sprint clos | tentative de saisie | impossible : pas de poignée | N/A |
| Glisser avec le clavier | Espace sur la poignée, flèches haut et bas (de liste en liste), Espace, Échap annule | mêmes effets que la souris, annonces nommant la liste, focus rendu à la poignée de la story déposée | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `supabase/migrations/20261016102336_user_stories.sql` -- modèle de table et de policies avec vérification du parent
- `lib/domain/sprints.ts` (+ test) -- validation (nom, objectif, dates), états et libellés, avancement (stories et points), jours restants à l'heure de Paris, liste d'arrivée d'une story (`positionInList`)
- `lib/db/sprints.ts`, `lib/db/user-stories.ts` (`sprint_id` dans les colonnes), `lib/db/renumber.ts` (filtre de liste)
- `app/(app)/missions/sprint-actions.ts` -- créer, modifier, démarrer, clore, supprimer ; `story-actions.ts` -- `setStorySprint`, `reorderStories` avec filtre de liste
- `components/backlog.tsx` (trois blocs), `components/sprint-block.tsx` (en-tête, avancement, actions), `components/sprint-form.tsx`, menu « Sprint » dans la story dépliée
- `app/(app)/missions/[id]/page.tsx` -- charge les sprints ; `tests/isolation.test.ts` ; `docs/journal.md`, `epics.md`, `sprint-status.yaml`

## Tasks & Acceptance

- [x] Migration `sprints` + `user_stories.sprint_id` + policies (SQL montré avant application)
- [x] Règles pures + tests (`lib/domain/sprints.ts`)
- [x] Accès aux données et Server Actions (sprints, `setStorySprint`, réordonnancement par liste)
- [x] Page de la mission : trois blocs, menu « Sprint », création, démarrage, clôture, suppression
- [x] Tests d'isolation, journal, relecture indépendante
- [x] Glisser-déposer entre listes : règles pures + test (`lib/domain/story-board.ts`), action `moveStory`, un seul contexte de glisser-déposer dans `components/backlog.tsx`, zones de dépôt, aperçu, annonces ; vérifié dans Chrome (souris, clavier, téléphone)

**Acceptance Criteria:**
- Given une mission, when je crée un sprint (nom, objectif, début, fin), then il apparaît « planifié » ; si la fin précède le début, then une erreur en ligne nomme le champ.
- Given des stories au backlog, when je place une story dans un sprint, then elle quitte le backlog, prend la dernière place du sprint, et les avancements se mettent à jour ; en la retirant, elle revient au backlog.
- Given un sprint planifié et aucun en cours, when je le démarre, then il devient « en cours » et apparaît en tête de page ; s'il y en a déjà un, then c'est refusé.
- Given un sprint en cours avec des stories non terminées, when je le clos, then les non terminées reviennent au backlog (ou passent au sprint planifié choisi), les terminées restent dans le sprint clos.
- Given un sprint supprimé, then ses stories retournent au backlog.
- Given une story du backlog, when je la glisse sur un sprint planifié ou en cours (sur une story ou sur la liste vide), then elle y entre à la place visée et les avancements se mettent à jour ; when je la glisse hors d'un sprint vers le backlog ou un autre sprint non clos, then elle change de liste de la même façon.
- Given un sprint clos, then aucune story n'en sort ni n'y entre par glisser-déposer, et `moveStory` forgé vers ce sprint est refusé.
- Given le clavier seul, when je saisis une story avec Espace et la déplace avec les flèches, then elle change de liste avec une annonce nommant la liste ; le menu « Sprint » fait toujours la même chose.
- Given une story d'une autre mission ou d'un autre compte, when je forge un `sprint_id`, then c'est refusé (`npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Migration proposée (à approuver avant application)

```sql
-- Story 3.5c : sprints d'une mission et rattachement des user stories (RLS : owner_id = auth.uid()).
create type public.sprint_status as enum ('planned', 'active', 'closed');

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  goal text check (goal is null or char_length(btrim(goal)) between 1 and 300),
  start_date date not null,
  end_date date not null,
  status public.sprint_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprints_dates_check check (end_date >= start_date)
);

create index sprints_mission_idx on public.sprints (mission_id, start_date);
create index sprints_owner_idx on public.sprints (owner_id);
-- Un seul sprint « en cours » par mission.
create unique index sprints_one_active_per_mission on public.sprints (mission_id) where status = 'active';

create trigger sprints_set_updated_at before update on public.sprints
  for each row execute function public.set_updated_at();

alter table public.sprints enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une mission à moi.
create policy sprints_select on public.sprints for select to authenticated
  using (owner_id = (select auth.uid()));
create policy sprints_insert on public.sprints for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy sprints_update on public.sprints for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy sprints_delete on public.sprints for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Rattachement d'une story à un sprint : supprimer le sprint renvoie la story au backlog.
alter table public.user_stories add column sprint_id uuid references public.sprints (id) on delete set null;
create index user_stories_sprint_idx on public.user_stories (sprint_id, position);

-- Le sprint d'une story doit être à moi ET de la même mission (la clé étrangère contourne la RLS).
drop policy if exists user_stories_insert on public.user_stories;
drop policy if exists user_stories_update on public.user_stories;
create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (sprint_id is null or exists (select 1 from public.sprints sp where sp.id = sprint_id and sp.owner_id = (select auth.uid()) and sp.mission_id = user_stories.mission_id))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (sprint_id is null or exists (select 1 from public.sprints sp where sp.id = sprint_id and sp.owner_id = (select auth.uid()) and sp.mission_id = user_stories.mission_id))
  );
```

Les policies d'insertion et de mise à jour de `user_stories` sont remplacées (pas la lecture ni la suppression) : le contrôle existant sur la mission est conservé, le contrôle du sprint s'y ajoute. Le lien avec le cockpit n'ajoute aucune colonne : le cockpit lira `sprints` (dates, état) et `user_stories` (statut, sprint).

## Décisions à valider

1. **Trois états** pour un sprint : planifié, en cours, clos ; **un seul en cours** par mission ; les sprints peuvent se chevaucher en dates.
2. **Placer une story** par le glisser-déposer entre listes (backlog, sprint planifié, sprint en cours ; jamais un sprint clos) **et** par le menu « Sprint » de la story dépliée, qui reste pour le clavier et les lecteurs d'écran. *(Décision initiale : menu seul. Changée le 17 octobre à la demande d'Alex.)*
3. **À la clôture :** les stories non terminées reviennent au backlog par défaut, ou passent à un sprint planifié de ton choix ; les terminées restent dans le sprint clos.
4. **Avancement d'un sprint** en stories et en points ; terminer toutes les stories ne clôt pas le sprint toute seule.
5. **Lien avec le cockpit (à décider maintenant, à construire dans les stories 5.x) :** (a) le cockpit affichera les tâches non faites des stories « en cours » du sprint en cours, avec le motif « dans ton sprint, qui se termine dans N jours » ; (b) une **septième règle** prévient quand un sprint se termine à J-2 avec des stories non terminées ; (c) ces tâches passent **après** les six règles existantes (échéances, factures, plafond…) ; (d) le cockpit lit les données, l'IA ne décide rien. Si tu valides, je corrigerai le PRD (FR-14 passe à sept règles) et les stories 5.x au moment de les spécifier.
6. **Pas de contrôle de chevauchement**, de vélocité ni de graphique au MVP.

## Implementation Notes

- **Régression trouvée par le test d'isolation, corrigée par une seconde migration** (`20261017130000_user_stories_policies_note_and_sprint.sql`) : la migration `20261017120000_sprints.sql` a remplacé les policies d'insertion et de mise à jour de `user_stories` en repartant de la version de la 3.5a et a effacé le contrôle de la note d'origine de la 8.16. La migration de rattrapage réunit le contrôle de la note ET celui du sprint de la même mission. À retenir : repartir de `pg_policies`, pas du fichier d'origine.
- Écarts au Code Map : l'affichage des stories (`StoryItem`, `StoryList`) est extrait de `components/backlog.tsx` vers `components/story-list.tsx` pour être réutilisé dans les blocs de sprint (`components/sprint-block.tsx`) ; `renumber` prend un filtre de liste (`sprint_id`) ; `reorderStories` reçoit le sprint de la liste ; `setStorySprint` place une story ; la date du jour est calculée côté serveur (`parisToday`) et passée à l'écran. À la clôture, les stories reportées prennent toutes la même position (la suivante de la liste d'arrivée), départagées par leur date de création, en **une** écriture ; le prochain glisser-déposer les renumérote.
- Vérifié dans Chrome (compte fictif, données supprimées ensuite) : création d'un sprint (dates inversées refusées avec le nom conservé, focus sur le nom), placement de stories par le menu « Sprint » (annonce, focus sur le titre du backlog, avancement « 0 sur 2 stories terminées · 0 sur 8 points »), démarrage, refus d'un deuxième sprint en cours (« Un sprint est déjà en cours. Clos-le d'abord. »), changement de statut d'une story, clôture (focus sur « Annuler », choix « backlog » ou « sprint suivant ») avec la story non terminée passée au sprint planifié et la terminée restée dans le sprint clos, sprint clos figé (sans poignée, menu « Sprint » désactivé), suppression avec confirmation (« 1 story retournera au backlog ») ; téléphone 412 px : aucun débordement, aucune cible sous 44 px.
- Un ancien serveur de développement resté actif (`next-server`, que `pkill -f "next dev"` ne tue pas) servait une ancienne version : la section « Sprints » semblait absente. À arrêter avec `pkill -f next-server` aussi.
- Reste : relecture indépendante ; la règle du cockpit (décision 5) est à construire dans les stories 5.x et à reporter dans le PRD (FR-14 à sept règles).
