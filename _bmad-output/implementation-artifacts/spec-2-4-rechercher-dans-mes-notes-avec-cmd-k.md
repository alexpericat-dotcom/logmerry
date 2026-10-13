---
title: 'Story 2.4 : Rechercher dans mes notes avec ⌘K'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '91767c05860a057a2af0b9f8f8f199d869902d0a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** retrouver une note oblige à parcourir la liste ; il n'existe aucune recherche.

**Approach:** une migration ajoute une colonne de recherche plein texte (français) sur `notes`, un index et une fonction `search_notes` sous RLS ; une palette ouverte par ⌘K (ou Ctrl+K) et par un bouton « Rechercher » de la barre latérale interroge cette fonction via une Server Action et ouvre la note choisie.

## Boundaries & Constraints

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; fonction `security invoker` (la RLS s'applique) avec `search_path` vide, réservée au rôle `authenticated` ; le raccourci a un bouton équivalent visible nommé « Rechercher » avec `aria-keyshortcuts` ; inactif pendant une composition IME ; Échap ferme la palette et rend le focus à l'élément précédent ; « Aucun résultat » explicite ; au plus 20 résultats ; requête limitée à 100 caractères ; textes en français, tutoiement ; test d'isolation étendu à la recherche (A trouve sa note, B ne la trouve pas).

**Décision du propriétaire :** plein texte français avec correspondance de début de mot (« rend » trouve « rendez-vous » dès la frappe) ; les mots courants sont ignorés ; les accents ne sont pas neutralisés (limite connue).

**Never:** recherche dans clients et missions (story 3.7) ; entrée « Demander à l'assistant » (epic 8) ; recherche vectorielle ; service externe ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ouverture | ⌘K ou Ctrl+K, ou clic sur « Rechercher » | palette ouverte, focus dans le champ | pendant une composition IME : ignoré |
| Recherche | un mot présent dans un titre ou un texte | les notes qui le contiennent s'affichent (titre, type, début du texte), meilleure correspondance d'abord | N/A |
| Ouvrir un résultat | flèches puis Entrée, ou clic | la note s'ouvre (`/notes/<id>`), la palette se ferme | N/A |
| Aucun résultat | mot absent | « Aucun résultat » | N/A |
| Champ vide | rien saisi | pas de résultats, pas d'appel | N/A |
| Autre compte | note d'un autre compte contenant le mot | jamais affichée | RLS |
| Fermeture | Échap | palette fermée, focus rendu à l'élément précédent | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Erreur de la base | échec de la fonction | « Recherche impossible pour le moment. Réessaie. » | message dans la palette |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- une migration `<version>_notes_search.sql` (voir Design Notes)
- `lib/db/notes.ts` -- pattern `createClient()` serveur à suivre pour l'appel de `search_notes`
- `app/(app)/notes/actions.ts` -- `withSession` y existe mais n'est pas exporté ; la nouvelle action `searchNotes` vit dans un fichier voisin et refait la vérification de session (même schéma : signed-out → `redirect`)
- `components/app-sidebar.tsx` -- y placer le déclencheur « Rechercher » (icône seule barre repliée, texte conservé pour les lecteurs d'écran)
- `components/search-palette.tsx` -- nouveau : `<dialog>` natif (piège de focus, Échap et retour du focus fournis par le navigateur), champ `role="combobox"`, liste `role="listbox"`, annonce `role="status"`
- `lib/domain/` -- `search.ts` : normalisation de la requête (espaces, 100 caractères) + test
- `tests/isolation.test.ts` -- ajouter les cas de recherche (A trouve, B non, sans connexion refusé)
- `components/ui/` -- `badge`, `button`, `input` ; pas de `command` ni `dialog` (hors périmètre : aucune dépendance ajoutée)

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<version>_notes_search.sql` -- colonne `search`, index GIN, fonction `search_notes`, droits -- migration
- [x] `lib/domain/search.ts` + test -- normalisation de la requête -- règle pure testée
- [x] `app/(app)/notes/search-actions.ts` -- Server Action `searchNotes` -- lecture sous RLS
- [x] `components/search-palette.tsx` + `components/app-sidebar.tsx` -- palette, raccourci, bouton -- interface
- [x] `tests/isolation.test.ts` -- recherche à deux comptes -- isolation
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given plusieurs notes, when j'appuie sur ⌘K (ou je clique sur « Rechercher ») et je tape un mot, then les notes qui le contiennent s'affichent et Entrée ouvre celle choisie.
- Given un mot absent, when je le tape, then « Aucun résultat » s'affiche.
- Given une note d'un autre compte contenant le mot, when je cherche, then elle n'apparaît jamais (prouvé par `npm run test:isolation`).
- Given la palette ouverte, when j'appuie sur Échap, then elle se ferme et le focus revient où il était.
- Given la migration appliquée, then la fonction `search_notes` n'est exécutable que par les comptes connectés et le conseiller de sécurité ne signale rien de nouveau.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Clic sur le rembourrage de la palette la ferme | medium | patch | `e.target === dialog` vrai aussi pour le rembourrage ; test de position du clic |
| Rejet réseau de `searchNotes` non géré dans l'effet | medium | patch | `answered` jamais posé, aucun message ; `try/catch` ajouté |
| Réponse en vol après saisie vidée ou fermeture | low | patch | `latest` incrémenté aussi quand la saisie est vide |
| Option active non défilée dans la liste | low | patch | `scrollIntoView({block:"nearest"})` |
| Sémantique SQL non testée (corps, début de mot, ordre, mots vides, opérateurs, limite 20, refus 42501) | medium | patch | cas ajouté à `tests/isolation.test.ts` (15/15) |
| Accents non neutralisés | low | rejeté | limite décidée par le propriétaire (frozen) |
| `[:alnum:]` coupe les mots accentués | false | rejeté | mesuré : « procédure » intact, base `en_US.UTF-8` |
| `title` / `body` NULL | false | rejeté | colonnes `NOT NULL` |
| Palette dans une barre repliée / instances multiples | false | rejeté | une seule instance, barre toujours affichée, libellé `sr-only` |
| `search` exposé par `select *` | false | rejeté | requêtes existantes à colonnes explicites |
| Corps complet renvoyé (20 lignes) | low | rejeté | reste côté serveur, extrait envoyé au client |
| Résultats vidés entre deux frappes, pas de « Recherche… », plus de 20 non signalé | low | rejeté | confort ; limite de 20 voulue par la spec |
| Test de la Server Action (mocks) | low | rejeté | colle fine ; essai manuel suffit pour le Workshop 8 |
| Avis NOTICE sur requête vide | false | rejeté | renvoie une liste vide, vérifié par le test |

## Design Notes

SQL proposé pour l'option A (montré avant application ; les options B et C changeraient seulement la construction de la requête) :

```sql
alter table public.notes add column search tsvector generated always as (
  setweight(to_tsvector('french'::regconfig, title), 'A') ||
  setweight(to_tsvector('french'::regconfig, body), 'B')
) stored;

create index notes_search_idx on public.notes using gin (search);

create function public.search_notes(query text)
returns table (id uuid, title text, body text, type public.note_type, created_at timestamptz)
language sql stable security invoker set search_path = ''
as $$
  with words as (
    select w
    from unnest(string_to_array(
      lower(regexp_replace(left(query, 100), '[^[:alnum:]]+', ' ', 'g')), ' ')) as w
    where w <> ''
  ), q as (
    select to_tsquery('french'::regconfig, string_agg(w || ':*', ' & ')) as tsq from words
  )
  select n.id, n.title, n.body, n.type, n.created_at
  from public.notes n, q
  where q.tsq is not null and n.search @@ q.tsq
  order by ts_rank(n.search, q.tsq) desc, n.created_at desc
  limit 20;
$$;

revoke execute on function public.search_notes(text) from public, anon;
grant execute on function public.search_notes(text) to authenticated;
```

Choix techniques sans enjeu pour l'utilisateur : `<dialog>` natif plutôt que la bibliothèque shadcn `Command` (aucune dépendance, focus et Échap fournis par le navigateur) ; déclencheur placé en haut de la barre latérale ; 200 ms d'attente entre la frappe et l'appel, réponses périmées ignorées. L'accent n'est pas neutralisé (« procedure » ne trouve pas « procédure ») : à revoir si l'usage le demande.

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_tables` montre `search` ; `get_advisors` (sécurité) sans nouvel avertissement.
- Sur la preview : ⌘K sur Safari, Chrome et Firefox Mac (réserve de la conception), recherche d'un mot, « Aucun résultat », Entrée ouvre la note, Échap rend le focus.
