-- Audit de sécurité, lot D : le rôle `anon` (visiteur sans compte) n'a aucun usage des tables de `public` : l'application n'y accède qu'avec un compte connecté.
-- Les politiques ne lui donnaient déjà rien (toutes sont `to authenticated`) ; on retire aussi les droits, comme deuxième barrière : un oubli de politique
-- ne suffirait plus à ouvrir une table à un visiteur. Les droits des comptes connectés (`authenticated`) ne changent pas.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Les futures tables, séquences et fonctions créées par le rôle `postgres` (éditeur SQL, migrations) ne donnent plus de droit à `anon` par défaut.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
