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
    select w from unnest(string_to_array(
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
