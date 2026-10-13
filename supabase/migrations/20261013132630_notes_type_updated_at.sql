-- Story 2.2 : type de note, date de modification, longueur maximale du texte.
create type public.note_type as enum ('note', 'procedure', 'template', 'faq');

alter table public.notes
  add column type public.note_type not null default 'note',
  add column updated_at timestamptz not null default now(),
  add constraint notes_body_length check (char_length(body) <= 50000);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
