-- Recherche dans les notes sans tenir compte des accents (« ecole » trouve « école »).
create extension if not exists unaccent with schema extensions;

-- unaccent() n'est pas « immutable » : une colonne générée et un index exigent une enveloppe immutable
-- qui fixe le dictionnaire (schéma explicite, search_path vide).
create function public.immutable_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- La colonne de recherche est recalculée avec les accents retirés (les notes existantes sont réindexées par la réécriture).
drop index public.notes_search_idx;
alter table public.notes drop column search;
alter table public.notes add column search tsvector generated always as (
  setweight(to_tsvector('french'::regconfig, public.immutable_unaccent(title)), 'A') ||
  setweight(to_tsvector('french'::regconfig, public.immutable_unaccent(body)), 'B')
) stored;
create index notes_search_idx on public.notes using gin (search);

-- Même traitement côté requête ; droits et signature inchangés.
create or replace function public.search_notes(query text)
returns table (id uuid, title text, body text, type public.note_type, created_at timestamptz)
language sql stable security invoker set search_path = ''
as $$
  with words as (
    select w from unnest(string_to_array(
      lower(regexp_replace(public.immutable_unaccent(left(query, 100)), '[^[:alnum:]]+', ' ', 'g')), ' ')) as w
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
