-- Statut des réalisations (demande d'Alex, 5 novembre 2026) : « client réel », « exercice de formation » ou « projet personnel », visible sur la carte publique
-- et filtrable. AUCUNE valeur par défaut : une réalisation sans statut ne se publie pas et n'apparaît pas sur la page publique. La ligne existante (Atelier Nova)
-- reste donc sans statut, et hors de la page publique, jusqu'à ce qu'Alex la classe (voir l'ordre de passage à la fin).
--
-- Trois champs de relevé en plus : le problème, les tests (texte libre, 600 caractères au plus, comme la description) et un drapeau « la stack est recommandée,
-- pas utilisée » (faux par défaut : une stack est « utilisée » tant qu'on ne dit pas le contraire). `status` est un texte contraint, pas un type énuméré :
-- ajouter une valeur plus tard ne demande qu'une contrainte à remplacer.

alter table public.realisations
  add column status text,
  add column problem text,
  add column tests text,
  add column stack_is_recommended boolean not null default false;

alter table public.realisations
  add constraint realisations_status_check check (status is null or status in ('client_reel', 'exercice_formation', 'projet_perso')),
  add constraint realisations_problem_length check (problem is null or char_length(problem) between 1 and 600),
  add constraint realisations_tests_length check (tests is null or char_length(tests) between 1 and 600),
  -- « Pas de publication sans statut », garanti par la base. NOT VALID : la ligne existante (publiée, sans statut) n'est pas vérifiée tant qu'on ne l'a pas
  -- classée ; toute nouvelle écriture, elle, l'est déjà.
  add constraint realisations_published_needs_status check (not published or status is not null) not valid;

-- Vue publique : on ajoute les colonnes à la fin (obligatoire pour `create or replace view`), la phrase de situation tient compte du statut (« Client, secteur X »
-- n'a de sens que pour un client réel : un exercice affiche « Secteur : X »), et le filtre exige un statut.
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
  r.stack_is_recommended
from public.realisations r
where r.published and r.client_consent and r.status is not null;

alter view public.public_realisations set (security_barrier = true);

create or replace view public.public_realisation_images as
select i.id, i.realisation_id, i.path, i.alt, i.created_at
from public.realisation_images i
join public.realisations r on r.id = i.realisation_id
where r.published and r.client_consent and r.status is not null;

alter view public.public_realisation_images set (security_barrier = true);

-- Les droits (select pour anon et authenticated, rien d'autre) sont conservés par `create or replace view` : on ne les repose pas.

-- ORDRE DE PASSAGE (à faire par Alex, après la migration) :
--   1. classer la réalisation existante :  update public.realisations set status = '<client_reel | exercice_formation | projet_perso>' where id = 'ca201ea8-3c1d-4c3f-9a7c-dbada6185d10';
--   2. valider la contrainte :             alter table public.realisations validate constraint realisations_published_needs_status;
