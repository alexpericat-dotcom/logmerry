---
title: 'Story 8.10 : Retrouver mon historique'
type: 'feature'
created: '2026-10-13'
status: 'in-review'
baseline_commit: '2a1433253eef734333e990a0da71e17b0f49dcec'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la conversation avec l'assistant disparaît au rechargement ou à la déconnexion ; je ne peux pas relire mes échanges ni retrouver les sources d'une ancienne réponse.

**Approach:** une migration crée les tables `messages` et `message_citations` (RLS sur `owner_id`) ; après chaque réponse vérifiée, la route enregistre ma question, la réponse et les citations (références vers la note et l'extrait, jamais une copie du texte) ; au chargement de la zone privée, l'historique (les 100 derniers messages) est relu en base et remis dans le panneau, dans l'ordre, avec les sources cliquables. Une source dont la note a été supprimée affiche « Source supprimée. » ; une source dont l'extrait a été régénéré par une modification de la note garde son titre et son lien « Ouvrir » et affiche « Extrait modifié depuis ». Un autre compte ne voit jamais mon historique. Décision : **un seul fil d'historique par propriétaire**, sans table `conversations` pour l'instant (l'architecture prévoyait une conversation par fil ; elle s'ajoutera avec « nouvelle conversation », hors périmètre).

## Boundaries & Constraints

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; `owner_id uuid not null default auth.uid() references auth.users on delete cascade` et RLS activée sur chaque table, policies select, insert et delete seulement (aucune modification possible) ; une policy d'insertion qui vérifie que le message cité m'appartient, et que la note et l'extrait cités m'appartiennent (leçon de la story 8.1 : une clé étrangère ignore la RLS) ; `note_id` et `chunk_id` des citations en `on delete set null` ; rôle en enum Postgres ; l'enregistrement n'empêche jamais la réponse : s'il échoue, la réponse est rendue et l'échec journalisé sans contenu ; seuls les échanges réussis et vérifiés sont enregistrés ; le texte et le titre d'une source sont relus en base à l'affichage ; test d'isolation étendu (`messages`, `message_citations`) ; aucun contenu de message dans les journaux ; messages en français, tutoiement.

**Never:** copie du texte d'une note ou d'un extrait dans une table d'historique (supprimer une note ne doit pas laisser son texte dans l'historique) ; table `conversations` ; bouton d'effacement de l'historique, pagination, recherche dans l'historique (hors périmètre) ; modification d'un message ; `service_role` ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Réponse vérifiée | question et réponse avec 2 sources | question, réponse et 2 citations enregistrées | N/A |
| Reconnexion | échanges existants | le panneau les montre dans l'ordre, chacun avec ses sources cliquables | N/A |
| Note supprimée | une source cite une note supprimée depuis | « Source supprimée. », pas de lien ni de texte | N/A |
| Note modifiée | l'extrait cité a été régénéré | titre et « Ouvrir » conservés, « Extrait modifié depuis », pas de texte copiable | N/A |
| Réponse sans source | « mes notes ne répondent pas » ou message fixe | question et réponse enregistrées, aucune citation | N/A |
| Enregistrement en échec | base indisponible | la réponse est rendue quand même | journal sans contenu |
| Réponse rejetée ou panne IA | citation inventée, panne | rien n'est enregistré | message d'erreur habituel |
| Autre compte | B ouvre son panneau | aucun message ni citation de A | RLS |
| Insertion hostile | A crée une citation vers la note de B | refusée | RLS (vérification de propriété) |
| Beaucoup d'échanges | plus de 100 messages | les 100 derniers, dans l'ordre | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- une migration `<version>_assistant_history.sql` (voir Design Notes) ; modèle de style : `20261013150121_note_chunks.sql` et `..._note_chunks_owned_note_policies.sql`
- `lib/domain/history.ts` + test -- nouveau, pur : `toHistory(rows)` (ordre, sources, aucune réponse sans sa question en tête) et `sourceState(source)` (note absente → supprimée ; extrait absent → modifié)
- `lib/db/history.ts` -- nouveau, `server-only` : `listHistory(supabase)` (100 derniers messages avec citations, titres et textes joints sous RLS) et `saveExchange(supabase, question, answer, sources)`
- `app/api/chat/route.ts` -- après `answerQuestion`, `saveExchange` dans un `try` isolé (échec journalisé, jamais bloquant)
- `app/(app)/layout.tsx` -- charger `listHistory` et le passer à `AssistantProvider` ; `components/assistant-provider.tsx` -- état initial depuis l'historique, identifiants de messages en chaîne
- `components/assistant-sources.tsx` -- états « Source supprimée. » et « Extrait modifié depuis » ; type `StoredSource` (identifiants et champs pouvant être nuls)
- `tests/isolation.test.ts` -- cas `messages` et `message_citations` ; `docs/journal.md`

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<version>_assistant_history.sql` -- enum, deux tables, index, RLS et policies -- migration
- [x] `lib/domain/history.ts` + test -- états des sources, mise en forme -- règles pures testées
- [x] `lib/db/history.ts` + `route.ts` -- lecture et enregistrement -- historique
- [x] `layout.tsx`, `assistant-provider.tsx`, `assistant-sources.tsx` -- panneau alimenté par l'historique -- interface
- [x] `tests/isolation.test.ts` -- isolation de l'historique -- cas à deux comptes
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given des échanges, when je me déconnecte puis me reconnecte, then l'historique réapparaît dans l'ordre, avec les sources cliquables.
- Given une note citée supprimée, then la source affiche « Source supprimée. ».
- Given deux comptes, then B ne voit jamais l'historique de A et ne peut pas créer une citation vers une note de A (`npm run test:isolation`).
- Given la migration appliquée, then les deux tables ont la RLS active et le conseiller de sécurité ne signale rien de nouveau.

## Implementation Notes

Migration `20261013182934_assistant_history.sql` appliquée par l'outil MCP (aucun incident), conseiller de sécurité sans nouvel avertissement. Fichiers : `lib/db/history.ts` (`listHistory`, `saveExchange`), `lib/domain/history.ts`, route `app/api/chat/route.ts` (enregistrement après la réponse vérifiée, jamais bloquant), `app/(app)/layout.tsx` (relecture au chargement), `assistant-provider.tsx`, `assistant-panel.tsx`, `assistant-sources.tsx`. Vérifié avec le vrai Mistral et Claude (script jetable) : échange enregistré et relu avec sa source ; note modifiée : « Extrait modifié depuis » (titre gardé) ; note supprimée : « Source supprimée. » sans titre ni texte ; B ne voit rien de A. Test d'isolation `historique` (20/20) : lecture jointe réelle (même requête que l'application), citation vers la note ou l'extrait d'un autre refusée, messages et citations non modifiables. Pas de bouton « effacer l'historique » (hors périmètre, voir `deferred-work.md`).

## Spec Change Log

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Une réponse peut être enregistrée sans ses sources si l'insertion des citations échoue | high | patch | l'échange est retiré (nettoyage) et l'échec journalisé |
| Le chemin de lecture jointe de l'historique n'est testé sur la base nulle part | high | patch | test d'isolation avec la même requête que l'application, `toHistory` appliqué au résultat réel |
| Citation vers l'extrait d'un autre compte non testée | medium | patch | cas ajouté (refusée, 42501) |
| Une limite de 100 messages peut laisser une réponse sans sa question en tête | medium | patch | réponse orpheline écartée ; tests |
| Tri des dates par comparaison de texte, ordre instable à date égale | medium | patch | tri par date (`Date.parse`), ordre d'insertion gardé à date égale ; tests |
| Échec de lecture de l'historique : le panneau a l'air vide | medium | patch | message « Ton historique n'a pas pu être chargé. Recharge la page pour réessayer. » |
| Réponse de plus de 20 000 caractères : tout l'échange refusé par la base | low | patch | texte tronqué à la limite avant l'enregistrement |
| Titre nul avec note présente | low | patch | « Note sans titre » |
| Nettoyage du test non protégé par `finally`, messages de test oubliés | low | patch | nettoyage des messages ajouté à la fin du fichier de test (`after`) |
| Noms de fonctions de la spec (`toStoredSource`) différents du code | low | patch | liste des fichiers de la spec mise à jour |
| Pas d'index sur `note_id`, `chunk_id` des citations (parcours à chaque suppression) | low | defer | volume négligeable au MVP ; migration d'index à prévoir si l'historique grossit |
| Historique relu dans la mise en page (bloque le rendu, pas de synchronisation entre onglets, plafond silencieux) | low | defer | acceptable au MVP ; chargement à l'ouverture du panneau si besoin |
| Pas de bouton d'effacement ni de durée de conservation | medium | defer | hors périmètre déclaré ; sujet de confidentialité à traiter avec la mention RGPD |
| Horodatage fourni par le serveur plutôt que par la base | low | rejeté | seul mon propre historique est concerné ; ordre stable en pratique |
| Enregistrement attendu avant la réponse (latence) | low | rejeté | deux allers-retours ; garde l'historique cohérent au rechargement |
| Les échanges en échec ne sont pas enregistrés | low | rejeté | voulu : seuls les échanges vérifiés |
| Fournisseur d'historique à clé par compte | low | rejeté | la déconnexion quitte la zone privée, le fournisseur est recréé |
| Tests de composant et de `saveExchange` | low | rejeté | pas de banc de test de composants ; `saveExchange` vérifié de bout en bout avec les vrais services |

## Design Notes

Pourquoi des références et pas des copies : supprimer une note doit retirer son texte de partout (RGPD, et la purge prévue au passage à l'outil pro). L'historique ne garde donc que des identifiants ; le titre et le texte sont relus en base à l'affichage. Conséquence acceptée : après une modification de la note, l'extrait cité n'existe plus (les extraits sont régénérés), la source garde son titre et son lien mais plus de texte à copier.

SQL proposé (montré avant application) :

```sql
create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index messages_owner_created_idx on public.messages (owner_id, created_at);

create table public.message_citations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  position integer not null check (position >= 0),
  note_id uuid references public.notes (id) on delete set null,
  chunk_id uuid references public.note_chunks (id) on delete set null,
  unique (message_id, position)
);
create index message_citations_message_idx on public.message_citations (message_id);

alter table public.messages enable row level security;
alter table public.message_citations enable row level security;

create policy messages_select on public.messages for select to authenticated using (owner_id = (select auth.uid()));
create policy messages_insert on public.messages for insert to authenticated with check (owner_id = (select auth.uid()));
create policy messages_delete on public.messages for delete to authenticated using (owner_id = (select auth.uid()));

create policy message_citations_select on public.message_citations for select to authenticated using (owner_id = (select auth.uid()));
create policy message_citations_insert on public.message_citations for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.messages m where m.id = message_id and m.owner_id = (select auth.uid()))
    and (note_id is null or exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid())))
    and (chunk_id is null or exists (select 1 from public.note_chunks c where c.id = chunk_id and c.owner_id = (select auth.uid())))
  );
create policy message_citations_delete on public.message_citations for delete to authenticated using (owner_id = (select auth.uid()));
```

Pas de policy de modification : un message ou une citation ne change jamais. L'architecture prévoyait une table `conversations` ; elle est repoussée (un seul fil), à ajouter avec « nouvelle conversation ».

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation && npm run test:leak` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_tables` (RLS active sur `messages` et `message_citations`), `get_advisors` (sécurité) sans nouvel avertissement.
- Sur la preview : poser des questions, recharger la page puis se déconnecter et se reconnecter : l'historique revient avec ses sources ; supprimer une note citée : « Source supprimée. » ; modifier une note citée : « Extrait modifié depuis ».
