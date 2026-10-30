-- Relecture de la story 6.1 : les étiquettes de `stack` n'étaient limitées qu'en nombre. Chacune doit être non vide, non nulle, de 40 caractères au plus
-- (la page publique de la story 6.3 les affichera). La fonction de déclencheur n'est pas appelable par les clients.
create function public.realisation_tags_ok(tags text[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(t is not null and char_length(btrim(t)) between 1 and 40), true) from unnest(tags) as t;
$$;

alter table public.realisations
  add constraint realisations_stack_tags_check check (public.realisation_tags_ok(stack));

revoke all on function public.realisation_tags_ok(text[]) from public, anon;
grant execute on function public.realisation_tags_ok(text[]) to authenticated;
revoke all on function public.realisations_set_published_at() from public, anon, authenticated;
