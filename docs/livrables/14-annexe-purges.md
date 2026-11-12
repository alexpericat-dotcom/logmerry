# Annexe : purges automatiques (proposition, non activée)

> **En deux phrases.** Ce chapitre documente quatre purges automatiques (historique de l'assistant, prospects, messages du formulaire de contact, empreintes anti-abus) **sans les activer** : le SQL n'est ni appliqué ni exécuté, et aucune extension ni migration n'est installée. La mise en service prévue est un **essai à blanc pendant deux semaines**, puis la suppression réelle sur accord du responsable de traitement, après **export des données** (le plan gratuit de Supabase n'a pas de sauvegarde : toute suppression est irréversible).

Rédigé le 9 novembre 2026 d'après la base réelle (lecture seule) et le code. **Limite du SQL : il n'a pas été exécuté, même sur une base de test** ; il sera essayé sur des données de test (droits, sécurité par ligne) avant toute activation.

## Règles retenues (décisions du responsable de traitement, 9 novembre 2026)

| Traitement | Règle | Remarque |
|---|---|---|
| T3, historique de l'assistant | Messages de plus de 12 mois supprimés chaque jour (citations en cascade). La question contenue dans le titre des brouillons « À documenter : … » est remplacée par « À documenter » | Il n'existe pas de table de conversations : seules `messages` et `message_citations` |
| T1, prospects | Supprimés 3 ans après la date de référence : la plus récente entre la fiche, ses notes (date de **création**), ses devis (date du devis). Notes et index supprimés avec la fiche. Devis sans suite supprimés 3 ans après leur date | Les clients ne sont **pas** purgés (5 ans, à la main). Un prospect « perdu » reste un prospect |
| T4, messages du formulaire | Supprimés 3 ans après leur réception (`created_at`), s'ils ne sont pas liés à une fiche | Repère : colonne `notes.source` (migration 0) |
| `contact_submissions` | Empreintes supprimées après 30 jours | Usage uniquement anti-abus : plafonds par heure et par jour, doublons sur 24 h |

## Clés étrangères vers `clients`, `quotes` et `notes`

Relevé dans la base réelle le 9 novembre 2026 (lecture seule).

| Table source | Cible | À la suppression de la cible |
|---|---|---|
| `contacts` | `clients` | suppression en cascade |
| `missions` | `clients` | **refusée** (`RESTRICT`) |
| `quotes` | `clients` | **refusée** (`NO ACTION`) |
| `notes` | `clients` | détachement (`SET NULL`) |
| `invoices` | `quotes` | **refusée** (`NO ACTION`) |
| `note_chunks` | `notes` | suppression en cascade |
| `message_citations` | `notes` | détachement (`SET NULL`) |
| `user_stories` | `notes` | détachement (`SET NULL`) |

**Aucune de ces clés ne peut supprimer ni détacher une facture.** Les factures référencent `missions` et `quotes` sans suppression ni détachement en cascade, et les encaissements (`payments`) référencent `invoices` de la même façon. Les fonctions ci-dessous excluent en plus, **explicitement**, tout prospect lié à une facture.

**Mises à jour automatiques de `clients.updated_at`.** Un déclencheur la remet à jour à chaque `UPDATE` de la fiche. Les seules mises à jour du code sont la modification de la fiche et le passage au statut « client » (action de l'application et fonction SQL d'acceptation d'un devis). Ni l'indexation, ni les notes, ni les devis ne la modifient. À l'inverse, `notes.updated_at` est remise à jour par **tout** `UPDATE` d'une note, dont chaque changement d'état d'indexation : c'est pourquoi les règles utilisent `created_at`.

## Migration 0 : repère des messages de contact

À appliquer avant les fonctions. L'ordre compte : colonne, rattrapage, puis déclencheurs.

```sql
alter table public.notes
  add column source text not null default 'app' check (source in ('app', 'contact_form'));

-- Rattrapage sur le titre, quel que soit le statut. Contrôler d'abord : select count(*) from public.notes where title like 'Message reçu · %';
update public.notes set source = 'contact_form' where title like 'Message reçu · %';

-- Déclencheurs créés APRÈS le rattrapage.
create function public.notes_source_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.source is distinct from old.source then
    raise exception 'notes.source est immuable' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger notes_source_immutable before update of source on public.notes
  for each row execute function public.notes_source_immutable();

-- Dernier rempart : aucun extrait (donc aucun envoi à Mistral) pour un message de contact.
create function public.note_chunks_no_contact() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.notes n where n.id = new.note_id and n.source = 'contact_form') then
    raise exception 'un message de contact ne s''indexe pas' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger note_chunks_no_contact before insert on public.note_chunks
  for each row execute function public.note_chunks_no_contact();

-- La fonction ouverte aux visiteurs (celle de `supabase/migrations/20261107110000_contact_form_limits.sql:21-81`, mise en forme resserrée ; la base déployée n'a pas été interrogée) : un seul champ ajouté, `source`.
create or replace function public.submit_contact_message(p_name text, p_email text, p_message text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '[\r\n\t]+', ' ', 'g');
  v_email text := btrim(coalesce(p_email, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_email_hash text;
  v_message_hash text;
begin
  if char_length(v_name) not between 1 and 200
     or char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+$'
     or char_length(v_message) not between 10 and 4000 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select owner_id into v_owner from public.contact_form_settings where enabled;
  if v_owner is null then return false; end if;
  v_email_hash := md5(lower(v_email));
  v_message_hash := md5(v_message);
  delete from public.contact_submissions where created_at < now() - interval '30 days';
  if exists (select 1 from public.contact_submissions
               where owner_id = v_owner and email_hash = v_email_hash and message_hash = v_message_hash
                 and created_at > now() - interval '24 hours') then
    return true;
  end if;
  if (select count(*) from public.contact_submissions where owner_id = v_owner and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.contact_submissions where owner_id = v_owner and created_at > now() - interval '1 day') >= 30
     or (select count(*) from public.contact_submissions where owner_id = v_owner and email_hash = v_email_hash and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate' using errcode = '54000';
  end if;
  insert into public.contact_submissions (owner_id, email_hash, message_hash) values (v_owner, v_email_hash, v_message_hash);
  insert into public.notes (owner_id, title, body, status, type, source)
  values (
    v_owner,
    left('Message reçu · ' || v_name, 200),
    'Texte reçu d''un visiteur via le formulaire du portfolio, non vérifié.' || E'\n\n'
      || 'De : ' || v_name || E'\n'
      || 'E-mail : ' || v_email || E'\n'
      || 'Reçu le : ' || to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI') || E'\n\n'
      || v_message,
    'draft', 'note', 'contact_form');
  return true;
end $$;
```

Côté code (à faire avec la migration) : `isContactMessage` lit `source` au lieu du titre, les lectures de notes ajoutent la colonne, et les types sont régénérés.

## Journal des purges

Date, fonction, compteurs : **jamais de contenu** (ni titre, ni nom, ni texte).

```sql
create table public.purge_log (
  id              uuid primary key default gen_random_uuid(),
  ran_at          timestamptz not null default now(),
  fn              text    not null,
  dry_run         boolean not null,
  rows_candidates integer not null default 0,
  rows_deleted    integer not null default 0,
  rows_failed     integer not null default 0,
  error_state     text                              -- code SQLSTATE seulement
);
alter table public.purge_log enable row level security;   -- aucune politique
revoke all on public.purge_log from anon, authenticated;
-- Exception à la règle owner_id = auth.uid() : table système sans propriétaire (acceptée par le responsable de traitement le 9 novembre 2026).
```

## T3 : historique de l'assistant et titres des brouillons

```sql
create or replace function public.purge_old_messages(p_dry_run boolean default true) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_ids uuid[]; v_titles integer; v_deleted integer := 0; v_renamed integer := 0;
  v_failed integer := 0; v_state text;
begin
  select coalesce(array_agg(id), '{}') into v_ids from public.messages where created_at < now() - interval '12 months';
  select count(*)::integer into v_titles from public.notes
    where status = 'draft' and title like 'À documenter : %' and created_at < now() - interval '12 months';
  if not p_dry_run then
    begin
      delete from public.messages where id = any(v_ids);           -- citations en cascade
      get diagnostics v_deleted = row_count;
    exception when others then v_failed := v_failed + 1; v_state := sqlstate; end;
    begin
      update public.notes set title = 'À documenter'              -- la question n'est plus dans le titre
        where status = 'draft' and title like 'À documenter : %' and created_at < now() - interval '12 months';
      get diagnostics v_renamed = row_count;
    exception when others then v_failed := v_failed + 1; v_state := sqlstate; end;
  end if;
  insert into public.purge_log (fn, dry_run, rows_candidates, rows_deleted, rows_failed, error_state)
    values ('purge_old_messages', p_dry_run, cardinality(v_ids) + v_titles, v_deleted + v_renamed, v_failed, v_state);
  if v_failed > 0 then raise warning 'purge_old_messages : % échec(s), voir purge_log', v_failed; end if;
  return jsonb_build_object('dry_run', p_dry_run, 'messages', cardinality(v_ids), 'titles', v_titles,
                            'deleted', v_deleted, 'renamed', v_renamed, 'failed', v_failed,
                            'ids', to_jsonb(v_ids[1:200]), 'ids_truncated', cardinality(v_ids) > 200);
end $$;
```

## T1 : prospects et devis sans suite

Valeurs de `clients.status` : `prospect` et `client`. Un prospect jamais purgé : une mission, un devis accepté, un devis lié à une facture (exclusion explicite, y compris par une mission).

```sql
create or replace function public.purge_stale_prospects(p_dry_run boolean default true) returns jsonb
language plpgsql set search_path = '' as $$
declare
  r record;
  v_cutoff    timestamptz := now() - interval '3 years';
  v_prospects uuid[] := '{}';  v_quotes uuid[] := '{}';  v_notes integer := 0;
  v_del_p integer := 0; v_del_q integer := 0; v_failed integer := 0; v_state text;
begin
  -- A. prospects éligibles : une transaction interne par fiche (un échec n'est ni silencieux ni bloquant)
  for r in
    with cand as (
      select c.id,
             greatest(
               c.updated_at,
               coalesce((select max(nt.created_at) from public.notes nt where nt.client_id = c.id), c.updated_at),
               coalesce((select max(coalesce(q.sent_on::timestamptz, q.created_at))
                         from public.quotes q where q.client_id = c.id), c.updated_at)
             ) as ref
      from public.clients c
      where c.status = 'prospect'
        and not exists (select 1 from public.missions m where m.client_id = c.id)
        and not exists (select 1 from public.quotes q where q.client_id = c.id and q.status = 'accepted')
        -- exclusion explicite de tout prospect lié à une facture, par un devis ou par une mission
        and not exists (select 1 from public.invoices i join public.quotes q on q.id = i.quote_id where q.client_id = c.id)
        and not exists (select 1 from public.invoices i join public.missions m on m.id = i.mission_id where m.client_id = c.id)
    )
    select id from cand where ref < v_cutoff
  loop
    v_prospects := v_prospects || r.id;
    v_quotes    := v_quotes || array(select q.id from public.quotes q where q.client_id = r.id);
    v_notes     := v_notes + (select count(*)::integer from public.notes nt where nt.client_id = r.id);
    if not p_dry_run then
      begin
        delete from public.notes   where client_id = r.id;   -- leurs extraits (note_chunks) partent en cascade
        delete from public.quotes  where client_id = r.id;   -- aucun n'est accepté ni facturé (filtres ci-dessus)
        delete from public.clients where id = r.id;          -- ses contacts partent en cascade
        v_del_p := v_del_p + 1;
      exception when others then
        v_failed := v_failed + 1; v_state := sqlstate;       -- journalisé ; la boucle continue
      end;
    end if;
  end loop;

  -- B. devis sans suite des prospects restants : ni acceptés, ni facturés, ni liés à une mission, datés de plus de 3 ans
  for r in
    select q.id from public.quotes q join public.clients c on c.id = q.client_id
    where c.status = 'prospect' and q.status <> 'accepted' and q.mission_id is null
      and coalesce(q.sent_on::timestamptz, q.created_at) < v_cutoff
      and not exists (select 1 from public.invoices i where i.quote_id = q.id)
      and q.id <> all (v_quotes)
  loop
    v_quotes := v_quotes || r.id;
    if not p_dry_run then
      begin
        delete from public.quotes where id = r.id;
        v_del_q := v_del_q + 1;
      exception when others then
        v_failed := v_failed + 1; v_state := sqlstate;
      end;
    end if;
  end loop;

  insert into public.purge_log (fn, dry_run, rows_candidates, rows_deleted, rows_failed, error_state)
    values ('purge_stale_prospects', p_dry_run, cardinality(v_prospects) + cardinality(v_quotes), v_del_p + v_del_q, v_failed, v_state);
  if v_failed > 0 then raise warning 'purge_stale_prospects : % échec(s), voir purge_log', v_failed; end if;
  return jsonb_build_object('dry_run', p_dry_run,
    'prospects', jsonb_build_object('count', cardinality(v_prospects), 'deleted', v_del_p, 'ids', to_jsonb(v_prospects[1:200])),
    'quotes',    jsonb_build_object('count', cardinality(v_quotes),    'deleted', v_del_q, 'ids', to_jsonb(v_quotes[1:200])),
    'notes_linked', v_notes, 'failed', v_failed);
end $$;
```

## T4 : messages du formulaire de contact et empreintes anti-abus

Dernier échange = date de réception (`created_at`). Une note liée à une fiche suit la règle de T1.

```sql
create or replace function public.purge_old_contact_messages(p_dry_run boolean default true) returns jsonb
language plpgsql set search_path = '' as $$
declare v_ids uuid[]; v_deleted integer := 0; v_failed integer := 0; v_state text;
begin
  select coalesce(array_agg(id), '{}') into v_ids from public.notes
    where source = 'contact_form' and client_id is null and created_at < now() - interval '3 years';
  if not p_dry_run then
    begin
      delete from public.notes where id = any(v_ids);
      get diagnostics v_deleted = row_count;
    exception when others then v_failed := 1; v_state := sqlstate; end;
  end if;
  insert into public.purge_log (fn, dry_run, rows_candidates, rows_deleted, rows_failed, error_state)
    values ('purge_old_contact_messages', p_dry_run, cardinality(v_ids), v_deleted, v_failed, v_state);
  if v_failed > 0 then raise warning 'purge_old_contact_messages : échec, voir purge_log'; end if;
  return jsonb_build_object('dry_run', p_dry_run, 'count', cardinality(v_ids), 'deleted', v_deleted, 'failed', v_failed,
                            'ids', to_jsonb(v_ids[1:200]));
end $$;

-- Empreintes anti-abus : 30 jours. `submit_contact_message` les supprime déjà à chaque nouveau message ;
-- cette purge couvre le cas où aucun message n'arrive.
create or replace function public.purge_contact_submissions(p_dry_run boolean default true) returns jsonb
language plpgsql set search_path = '' as $$
declare v_candidates integer; v_deleted integer := 0; v_failed integer := 0; v_state text;
begin
  select count(*)::integer into v_candidates from public.contact_submissions where created_at < now() - interval '30 days';
  if not p_dry_run then
    begin
      delete from public.contact_submissions where created_at < now() - interval '30 days';
      get diagnostics v_deleted = row_count;
    exception when others then v_failed := 1; v_state := sqlstate; end;
  end if;
  insert into public.purge_log (fn, dry_run, rows_candidates, rows_deleted, rows_failed, error_state)
    values ('purge_contact_submissions', p_dry_run, v_candidates, v_deleted, v_failed, v_state);
  if v_failed > 0 then raise warning 'purge_contact_submissions : échec, voir purge_log'; end if;
  return jsonb_build_object('dry_run', p_dry_run, 'count', v_candidates, 'deleted', v_deleted, 'failed', v_failed);
end $$;

revoke all on function public.purge_old_messages(boolean), public.purge_stale_prospects(boolean),
  public.purge_old_contact_messages(boolean), public.purge_contact_submissions(boolean)
  from public, anon, authenticated;
```

## Planification prévue

Étapes, **dans cet ordre** : (1) export des données ; (2) essai sur des données de test (droits, sécurité par ligne) ; (3) installation de `pg_cron` (schéma et droits : **À confirmer** dans la documentation de Supabase) ; (4) **deux semaines en essai à blanc** : les tâches appellent les fonctions avec `true`, et le journal est relu chaque jour ; (5) passage à `false`, **sur accord du responsable de traitement seulement**.

```sql
-- Étape 4 : essai à blanc
select cron.schedule('purge-old-messages',         '17 3 * * *', 'select public.purge_old_messages(true)');
select cron.schedule('purge-stale-prospects',      '27 3 * * *', 'select public.purge_stale_prospects(true)');
select cron.schedule('purge-old-contact-messages', '37 3 * * *', 'select public.purge_old_contact_messages(true)');
select cron.schedule('purge-contact-submissions',  '47 3 * * *', 'select public.purge_contact_submissions(true)');
-- Étape 5 (accord du responsable de traitement) : cron.unschedule puis cron.schedule avec (false)

-- Contrôle quotidien du journal
select * from public.purge_log where rows_failed > 0 or dry_run order by ran_at desc limit 20;
```
