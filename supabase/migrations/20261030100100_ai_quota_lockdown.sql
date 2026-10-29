-- Audit de sécurité, lot B, relecture : avec les politiques « insert » et « delete », un compte pouvait supprimer ses propres lignes de `ai_calls`
-- par l'API et contourner le plafond. La table n'est plus écrite que par `consume_ai_quota()`, qui s'exécute désormais avec les droits de son
-- propriétaire (SECURITY DEFINER, `search_path` vide, toujours limitée à `auth.uid()`) ; le client ne peut plus que lire ses lignes.
drop policy ai_calls_insert on public.ai_calls;
drop policy ai_calls_delete on public.ai_calls;
revoke insert, update, delete on public.ai_calls from authenticated;

create or replace function public.consume_ai_quota() returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  per_minute integer;
  per_day integer;
begin
  if uid is null then return 'error'; end if;
  -- Deux appels simultanés du même compte se suivent : le second voit l'enregistrement du premier.
  perform pg_advisory_xact_lock(hashtext(uid::text));
  delete from public.ai_calls where owner_id = uid and at < now() - interval '2 days';
  select count(*) filter (where at > now() - interval '1 minute'),
         count(*) filter (where at > now() - interval '1 day')
    into per_minute, per_day
    from public.ai_calls where owner_id = uid;
  if per_minute >= 20 then return 'minute'; end if;
  if per_day >= 300 then return 'day'; end if;
  insert into public.ai_calls (owner_id) values (uid);
  return 'ok';
end;
$$;

-- `create or replace` garde les droits ; on les réaffirme : jamais `anon`, seulement les comptes connectés.
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
