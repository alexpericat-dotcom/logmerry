-- Réalisation « Automatisation des inscriptions à des ateliers de formation » (6 novembre 2026).
-- À exécuter par Alex dans l'éditeur SQL APRÈS la migration 20261106100000_realisation_design_choice.sql. Créée NON publiée, sans accord coché, sans statut :
-- le statut n'est pas fourni, donc il reste à choisir dans l'application (« Choisis un statut avant de publier »).
-- Description et raisons du choix : saisies par Alex dans l'application le 6 novembre 2026, reprises ici pour que ce fichier reste la source. Tout ce qu'Alex n'a pas fourni est un emplacement « [À COMPLÉTER PAR MOI : ...] », visible dans l'application. Le test `lib/portfolio-placeholders.test.ts`
-- échoue tant qu'il en reste dans ce fichier : on ne fusionne pas avec un emplacement non rempli.
-- Ne jamais écrire « PostgreSQL » seul : toujours « Baserow (base relationnelle reposant sur PostgreSQL) ». Rien sur des contraintes d'unicité garanties par la base.
insert into public.realisations (
  id, owner_id, title, description, origin, design_choice, validation, stack, stack_is_recommended, client_consent, published
)
select
  '7b3d9e52-1a4c-4f68-8c0e-5d2a9b6f1e37',
  r.owner_id,
  'Automatisation des inscriptions à des ateliers de formation',
  'Neuf workflows n8n gèrent le cycle complet des inscriptions à des ateliers : anti-doublon, liste d''attente avec repêchage, relances J-1 et H-2, appel par bot Telegram, erreurs journalisées. Fonctionnel sur mon instance auto-hébergée ; pas d''utilisateurs réels, donc non mesuré.',
  'training',
  'Le sujet proposait Google Sheets comme base. J''ai choisi une base relationnelle (Baserow, reposant sur PostgreSQL) : elle permet de relier ateliers, inscriptions et journal d''exécution, et de calculer automatiquement les places restantes et le taux de remplissage.',
  '[À COMPLÉTER PAR MOI : texte exact, formation, date, projet concerné]',
  array['n8n', 'Baserow', 'Telegram Bot API', 'Gmail API', 'SMS OVH'],
  false,
  false,
  false
from (select owner_id from public.realisations order by created_at limit 1) r;
