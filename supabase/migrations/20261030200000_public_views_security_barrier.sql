-- Relecture de la story 6.4 : les deux vues publiques passent en `security_barrier`, pour que le filtre « publiée avec accord » soit évalué AVANT toute condition
-- de l'appelant (aucune fonction non « leakproof » ne voit une ligne non publiée).
alter view public.public_realisations set (security_barrier = true);
alter view public.public_realisation_images set (security_barrier = true);
