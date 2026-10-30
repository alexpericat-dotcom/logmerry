-- Relecture de la story 6.3.
-- 1. Plus de politique de mise à jour : l'application ne modifie jamais une capture, et elle laissait rattacher une capture à la réalisation d'un autre compte.
drop policy realisation_images_update on public.realisation_images;

-- 2. Le plafond de six captures tient aussi quand deux insertions arrivent en même temps (verrou par réalisation).
create or replace function public.realisation_images_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.realisation_id::text));
  if (select count(*) from public.realisation_images where realisation_id = new.realisation_id) >= 6 then
    raise exception 'Six captures au plus par réalisation' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- 3. Le stockage n'accepte plus qu'un fichier au chemin exact `{ton id}/{une de tes réalisations}/{uuid}.{png|jpg|webp}`.
drop policy portfolio_insert_own on storage.objects;
create policy portfolio_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$')
    and exists (select 1 from public.realisations r where r.id::text = (storage.foldername(name))[2] and r.owner_id = (select auth.uid()))
  );
