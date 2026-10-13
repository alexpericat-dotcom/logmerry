-- Story 8.5 : recherche des extraits proches d'une question (sous RLS, filtrée par propriétaire).
-- Le select charge pgvector avant la création : sans cela, le réglage hnsw.iterative_scan de la
-- fonction est refusé (« permission denied to set parameter »), car la base ne le connaît pas encore.
select '[1]'::extensions.vector;

create function public.match_chunks(
  query_embedding extensions.vector(1024),
  match_threshold double precision,
  match_count integer
)
returns table (id uuid, note_id uuid, chunk_index integer, content text, similarity double precision)
language sql stable security invoker
set search_path = ''
set hnsw.iterative_scan = 'relaxed_order'
as $$
  select m.id, m.note_id, m.chunk_index, m.content, m.similarity
  from (
    select c.id, c.note_id, c.chunk_index, c.content,
           1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
    from public.note_chunks c
    where c.owner_id = (select auth.uid()) and c.embedding is not null
    order by c.embedding operator(extensions.<=>) query_embedding
    limit least(greatest(match_count, 0), 20)
  ) m
  where m.similarity >= match_threshold
  order by m.similarity desc;
$$;

revoke execute on function public.match_chunks(extensions.vector, double precision, integer) from public, anon;
grant execute on function public.match_chunks(extensions.vector, double precision, integer) to authenticated;
