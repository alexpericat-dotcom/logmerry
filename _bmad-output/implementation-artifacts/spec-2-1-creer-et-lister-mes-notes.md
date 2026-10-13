---
title: 'Story 2.1 : Créer et lister mes notes'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd903bc99559b009f3249f1d2944604ab72852f33'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'application n'a aucune table ni aucune page de notes ; l'entrée « Notes » de la barre est inactive. Sans notes, rien à retrouver ni à interroger plus tard.

**Approach:** une première migration crée la table `notes` (titre, texte, statut brouillon/actif, `owner_id`, RLS), puis une page `/notes` liste mes notes du plus récent au plus ancien et une page `/notes/nouvelle` en crée une par Server Action, avec validation du titre.

## Boundaries & Constraints

**Always:** migration dans `supabase/migrations/` ; SQL montré au propriétaire et approuvé avant application ; `owner_id` + RLS sur la table (select, insert, update, delete) ; textes en français, tutoiement ; formulaire à libellés associés, erreur en ligne (`aria-invalid`, `aria-describedby`) ; un seul `h1` par page ; `<title>` « {Page} · LogMerry » ; la note créée a le statut `active` ; l'entrée « Notes » de la barre devient active.

**Never:** type de note, modification, suppression, filtre (story 2.2) ; page de détail d'une note ; recherche (2.4) ; éditeur riche ; donnée réelle de client ; clé `service_role` ; indexation ou IA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Création | titre « Rendez-vous X » + texte | note enregistrée, retour sur `/notes`, elle est en tête de liste | N/A |
| Titre vide | titre vide ou espaces | rien n'est enregistré, « Saisis un titre pour ta note. » sous le champ, valeurs conservées | message en ligne |
| Titre trop long | plus de 200 caractères | refus, message qui nomme le champ | message en ligne |
| Texte vide | titre seul | note enregistrée (texte facultatif) | N/A |
| Liste ordonnée | plusieurs notes | de la plus récente à la plus ancienne | N/A |
| Liste vide | aucune note | phrase d'explication et bouton « Créer une note » | N/A |
| Sans session | appel de l'action ou de la page sans connexion | redirection vers `/auth/login` ; aucune écriture | refus de la base (RLS) |
| Échec de la base | erreur Supabase à l'enregistrement | message français, valeurs conservées | « Enregistrement impossible. Réessaie. » |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- n'existe pas encore ; un fichier `20261013131016_create_notes.sql`
- `lib/nav.ts` -- passer l'entrée « Notes » à `available: true` ; `lib/nav.test.ts` exige alors `app/(app)/notes/page.tsx`
- `app/(app)/layout.tsx` -- vérifie déjà le jeton ; ne pas modifier
- `lib/supabase/server.ts` -- client serveur à réutiliser (RLS via la session)
- `components/ui/` -- `button`, `input`, `label`, `card`, `badge` disponibles ; pas de `textarea` (utiliser un `<textarea>` stylé comme `Input`)
- `lib/domain/` -- à créer : `notes.ts` (validation du titre, extrait) et son test

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<horodatage>_create_notes.sql` -- enum `note_status`, table `notes`, index, RLS et 4 policies -- critère « table créée par migration »
- [x] `lib/domain/notes.ts` + `lib/domain/notes.test.ts` -- `validateNoteInput`, `excerpt` -- règles pures testées
- [x] `lib/db/notes.ts` -- `listNotes()` côté serveur, du plus récent au plus ancien -- lecture
- [x] `app/(app)/notes/actions.ts` -- Server Action `createNote` : vérifie la session, valide, insère, redirige -- écriture
- [x] `components/note-form.tsx` -- formulaire (`useActionState`) avec erreurs en ligne -- création
- [x] `app/(app)/notes/page.tsx` et `app/(app)/notes/nouvelle/page.tsx` -- liste (état vide, chargement) et création -- pages
- [x] `lib/nav.ts` -- « Notes » disponible -- navigation
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given la migration appliquée, when j'inspecte la table `notes`, then la RLS est activée avec quatre policies filtrées sur `owner_id`, et le conseiller de sécurité Supabase ne signale rien sur cette table.
- Given que je crée une note avec titre et texte, when je valide, then elle apparaît en tête de la liste.
- Given un titre vide, when je valide, then un message clair le refuse et rien n'est enregistré.
- Given aucune note, when j'ouvre `/notes`, then je vois une phrase d'explication et le bouton « Créer une note ».

## Implementation Notes

- Implémenté directement (pas de sous-agent : non demandé). Code : `lib/domain/notes.ts` (+ test), `lib/db/notes.ts`, `app/(app)/notes/` (liste, création, Server Action `createNote`), `components/note-form.tsx`, `components/ui/textarea.tsx`. « Notes » est actif dans `lib/nav.ts`.
- Migration appliquée le 2026-10-13 sur le projet LogMerry avec `apply_migration`, après approbation du SQL par le propriétaire. Supabase l'a enregistrée sous la version `20261013131016` ; le fichier a été renommé `20261013131016_create_notes.sql` pour correspondre (plus de réconciliation à prévoir).
- Vérifié après application : `list_tables` montre `public.notes` avec RLS activée et 0 ligne ; `pg_policies` montre les 4 policies (select, insert, update, delete) sur `owner_id = (select auth.uid())` ; le conseiller de sécurité ne signale rien sur `notes` (un seul avertissement de projet : protection contre les mots de passe compromis désactivée, hors périmètre).
- Vérifié en local : lint, `tsc`, build, `npm test` 17/17 (après revue : texte limité à 50 000 caractères, caractère nul retiré, décompte en points de code, session vérifiée avant validation).
- Non vérifié (demande une session) : création et liste réelles, état vide, titre vide refusé. À contrôler sur la preview.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Validation avant contrôle de session, `getClaims` en erreur ignoré | medium | patch | La matrice demande « aucune écriture » sans session. Session vérifiée en premier ; erreur de `getClaims` traitée comme déconnecté. |
| Échec réseau de l'insertion ou de `getClaims` non géré | medium | patch | L'exception affichait la page d'erreur et perdait la saisie. `try/catch` avec message français ; `redirect` hors du `try`. |
| Titre compté en unités UTF-16 (emoji refusés à tort) | low | patch | Décompte en points de code, comme `char_length` ; deux tests. |
| Texte sans longueur maximale ; caractère nul refusé par Postgres | medium | patch | Maximum de 50 000 caractères dans la fonction de validation (message qui nomme le texte), caractère nul retiré ; tests. |
| Erreur de chargement : écran d'erreur anglais sans reprise | medium | patch | `app/(app)/notes/error.tsx` avec message français et « Réessayer ». |
| Titre ou extrait sans espaces débordent de la carte | low | patch | `break-words min-w-0`. |
| `excerpt` coupe un emoji en deux | low | patch | Découpe par points de code ; test. |
| Pas de test de `createNote` (client simulé) ni de la RLS à deux comptes | medium | defer | Aucun client simulé dans le dépôt ; le script à deux comptes est l'objet de la story 2.3. |
| Liste sans pagination, corps complet chargé, ordre instable à égalité | low | defer | Sans effet sous quelques centaines de notes ; à traiter avec la recherche (2.4). |
| Focus non déplacé sur le champ en erreur, pas de compteur de caractères | low | defer | Reporté à la story d'accessibilité (7.2), comme pour les formulaires de connexion. |
| Session expirée en navigation côté client | low | false | Le proxy s'exécute à chaque requête, y compris les navigations : redirection vers la connexion. |
| `btrim` (espaces) et `trim` (tout espace) diffèrent | low | false | Seule une insertion directe par l'API du propriétaire passerait ; sans effet sur ses propres données. |
| Pas de `updated_at`, d'index de recherche, de double-clic protégé, de `maxLength` | low | false | `updated_at` arrive avec la 2.2, l'index avec la 2.4 ; le bouton est désactivé pendant l'envoi. |

## Design Notes

Application de la migration : le CLI Supabase n'est pas installé ; je l'applique avec l'outil `apply_migration` du MCP Supabase, après approbation du SQL par le propriétaire, et je garde le même contenu dans `supabase/migrations/`. Le nom de version enregistré par Supabase peut différer de l'horodatage du fichier ; à réconcilier si le CLI est adopté plus tard.

SQL proposé (montré avant application) :

```sql
create type public.note_status as enum ('draft', 'active');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null default '',
  status public.note_status not null default 'active',
  created_at timestamptz not null default now()
);

create index notes_owner_created_idx on public.notes (owner_id, created_at desc);

alter table public.notes enable row level security;

create policy notes_select on public.notes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy notes_insert on public.notes for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy notes_update on public.notes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy notes_delete on public.notes for delete to authenticated
  using (owner_id = (select auth.uid()));
```

Texte de la page vide : « Tu n'as pas encore de note. Une note, c'est un compte rendu de rendez-vous, une procédure ou un modèle que tu voudras retrouver plus tard. »

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_tables` montre `notes` avec RLS activée ; `get_advisors` (sécurité) ne signale rien sur `notes`.
- Sur la preview : liste vide, création, titre vide refusé, ordre récent → ancien, déconnecté `/notes` renvoie à la connexion.
