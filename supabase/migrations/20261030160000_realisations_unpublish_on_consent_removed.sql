-- Story 6.2 : retirer l'accord du client d'une réalisation publiée la dépublie d'office (au lieu d'être refusé par la contrainte).
-- Seul ce cas est traité : publier SANS accord reste refusé par `realisations_publish_needs_consent` (23514).
create or replace function public.realisations_set_published_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.client_consent and not new.client_consent then
    new.published := false;
  end if;
  if new.published then
    new.published_at := case when tg_op = 'UPDATE' and old.published then old.published_at else now() end;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;
