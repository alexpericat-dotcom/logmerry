-- « Choix de conception » et « Validation » sur une réalisation (demande d'Alex, 6 novembre 2026).
-- Deux champs texte facultatifs, 600 caractères au plus (comme le problème et les tests). « Validation » est distinct de « Résultat » (`result_figure`) : on ne
-- les fusionne jamais. Aucune valeur par défaut. Les colonnes sont ajoutées à la fin de la vue publique (obligatoire pour `create or replace view`).

alter table public.realisations
  add column design_choice text,
  add column validation text;

alter table public.realisations
  add constraint realisations_design_choice_length check (design_choice is null or char_length(design_choice) between 1 and 600),
  add constraint realisations_validation_length check (validation is null or char_length(validation) between 1 and 600);

create or replace view public.public_realisations as
select
  r.id,
  r.title,
  r.description,
  r.origin,
  case
    when r.status = 'client_reel' then coalesce(r.client_name, case when r.client_sector is not null then 'Client, ' || r.client_sector end, 'Client confidentiel')
    else coalesce(r.client_name, case when r.client_sector is not null then 'Secteur : ' || r.client_sector end, 'Sans client')
  end as client_label,
  r.result_figure,
  r.link_url,
  r.stack,
  r.published_at,
  r.status,
  r.problem,
  r.tests,
  r.stack_is_recommended,
  r.design_choice,
  r.validation
from public.realisations r
where r.published and r.client_consent and r.status is not null;

alter view public.public_realisations set (security_barrier = true);

-- Les droits (select pour anon et authenticated, rien d'autre) sont conservés par `create or replace view`.
