-- Story 3.6 (rattrapage) : sans drapeau `app.accepting_quote`, current_setting(..., true) renvoie NULL ;
-- la condition devenait NULL (et non false) et le déclencheur laissait passer « envoyé -> accepté » hors accept_quote.
-- Trouvé par tests/sql/quotes-lifecycle.sql. coalesce rend la comparaison toujours vraie ou fausse.
create or replace function public.quotes_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('accepted', 'refused') then
    raise exception 'quote frozen' using errcode = '23514';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status = 'sent')
    or (old.status = 'sent' and new.status = 'refused')
    or (old.status = 'sent' and new.status = 'accepted' and coalesce(current_setting('app.accepting_quote', true), '') = 'on')
  ) then
    raise exception 'quote status transition not allowed' using errcode = '23514';
  end if;
  return new;
end;
$$;
