-- Dette lot C (3) : RESTRICT est vérifié tout de suite ; la cascade d'un compte supprime les fiches avant les missions et échouait.
-- NO ACTION refuse de la même façon (23503) mais en fin d'instruction : supprimer une fiche qui a des missions reste refusé, supprimer un compte réussit.
alter table public.missions drop constraint missions_client_id_fkey;
alter table public.missions add constraint missions_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete no action;
