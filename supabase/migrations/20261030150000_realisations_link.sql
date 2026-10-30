-- Story 6.1 : lien public d'une réalisation (la page en ligne). Adresse en https seulement, sans espace, 300 caractères au plus.
-- Le contrôle fin (pas d'identifiants dans l'adresse) est dans le domaine ; la base garantit le schéma, pour que la page publique de la 6.3 n'affiche jamais `javascript:`.
alter table public.realisations
  add column link_url text check (link_url is null or (link_url ~ '^https://[^[:space:]]+$' and char_length(link_url) <= 300));
