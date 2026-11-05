-- Réalisation « Plateforme de gestion des demandes clients » (statut exercice_formation), textes d'Alex repris mot pour mot (5 novembre 2026).
-- À exécuter par Alex dans l'éditeur SQL APRÈS la migration 20261105100000_realisation_status.sql. Elle est créée NON publiée, sans accord coché :
-- il la relit dans l'application, ajoute la stack n8n ou Make quand il aura choisi, coche l'accord (c'est son propre exercice) et la publie.
-- L'identifiant est fixé : `lib/portfolio-dossiers.ts` y rattache le schéma, la bande de chiffres et les extraits du dossier.
insert into public.realisations (
  id, owner_id, title, description, origin, status, client_sector, problem, tests, result_figure, link_url, stack, stack_is_recommended, client_consent, published
)
select
  'e1c2f0a4-5b6d-4c3e-9a71-0d4b2f6a8c11',
  r.owner_id,
  'Plateforme de gestion des demandes clients, dossier de cadrage complet',
  'Un espace de pilotage Notion en huit volets (contexte, besoins et backlog, veille des plateformes, architecture, UX et tests, business case, planning, sécurité et conformité), avec tableau de bord et espace client.',
  'training',
  'exercice_formation',
  'Service client',
  'Les demandes arrivent dispersées (e-mails, formulaires, messages), ce qui cause perte d''information, manque de visibilité sur l''avancement et priorisation difficile.',
  '10 testeurs (5 clients, 5 agents) sur maquettes basse fidélité. Ergonomie moyenne 3,9/5, bénéfice perçu ≥ 4/5 pour 8 testeurs sur 10. Quatre ajustements décidés, dont une correction manuelle du score d''urgence calculé par l''IA.',
  'Dossier de cadrage complet, testé sur maquettes, prêt pour une phase de développement. Non développé.',
  'https://knotty-reaction-86f.notion.site/Projet-UMARIS-39167eb89ef68099b498ce56f5f958e9',
  array['Notion', 'Weweb', 'Supabase', 'Mistral AI', 'Brevo'],
  true,
  false,
  false
from (select owner_id from public.realisations order by created_at limit 1) r;
