-- Story 6.4 (AD-10) : la seule porte publique. Deux vues en lecture seule, exposées à `anon` (et au propriétaire connecté qui visite la page) ;
-- aucune table n'est ouverte. Les vues s'exécutent avec les droits de leur propriétaire (elles contournent la RLS, c'est voulu) : ce sont donc elles
-- qui filtrent : réalisation publiée ET accord du client, et seulement les colonnes publiables (ni `owner_id`, ni identifiant de client ou de mission).
create view public.public_realisations as
select
  r.id,
  r.title,
  r.description,
  r.origin,
  -- Nom du client si saisi (l'accord est acquis : on ne publie pas sans lui), sinon « Client, secteur X » ou « Client confidentiel ».
  coalesce(r.client_name, case when r.client_sector is not null then 'Client, ' || r.client_sector end, 'Client confidentiel') as client_label,
  r.result_figure,
  r.link_url,
  r.stack,
  r.published_at
from public.realisations r
where r.published and r.client_consent;

create view public.public_realisation_images as
select i.id, i.realisation_id, i.path, i.alt, i.created_at
from public.realisation_images i
join public.realisations r on r.id = i.realisation_id
where r.published and r.client_consent;

revoke all on public.public_realisations, public.public_realisation_images from public, anon, authenticated;
grant select on public.public_realisations, public.public_realisation_images to anon, authenticated;
