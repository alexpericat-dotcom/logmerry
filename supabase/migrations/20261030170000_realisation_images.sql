-- Story 6.3 (captures d'écran des réalisations). Bucket public `portfolio` (AD-2) : on n'y dépose que des images destinées à être publiques ;
-- écriture limitée au dossier `{owner_id}/` de l'utilisateur connecté ; images PNG, JPEG ou WebP de 3 Mo au plus (contrôlé par le stockage lui-même).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 3145728, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy portfolio_select_own on storage.objects for select to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Une ligne par capture : chemin dans le bucket et texte alternatif OBLIGATOIRE (PRD FR-16).
create table public.realisation_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  realisation_id uuid not null references public.realisations (id) on delete cascade,
  -- `{owner_id}/{realisation_id}/{uuid}.{png|jpg|webp}` : le nom est fabriqué par le code, jamais saisi.
  path text not null unique check (path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'),
  alt text not null check (char_length(btrim(alt)) between 1 and 200),
  created_at timestamptz not null default now()
);

create index realisation_images_realisation_idx on public.realisation_images (realisation_id, created_at);

alter table public.realisation_images enable row level security;

create policy realisation_images_select on public.realisation_images for select to authenticated
  using (owner_id = (select auth.uid()));
-- Le chemin doit être dans le dossier du propriétaire ET de cette réalisation, et la réalisation doit être la sienne (une clé étrangère ne regarde pas la RLS).
create policy realisation_images_insert on public.realisation_images for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and path like (select auth.uid())::text || '/' || realisation_id::text || '/%'
    and exists (select 1 from public.realisations r where r.id = realisation_id and r.owner_id = (select auth.uid()))
  );
create policy realisation_images_update on public.realisation_images for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and path like (select auth.uid())::text || '/' || realisation_id::text || '/%');
create policy realisation_images_delete on public.realisation_images for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.realisation_images from anon;

-- Six captures au plus par réalisation.
create function public.realisation_images_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.realisation_images where realisation_id = new.realisation_id) >= 6 then
    raise exception 'Six captures au plus par réalisation' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger realisation_images_limit before insert on public.realisation_images
  for each row execute function public.realisation_images_limit();

revoke all on function public.realisation_images_limit() from public, anon, authenticated;
