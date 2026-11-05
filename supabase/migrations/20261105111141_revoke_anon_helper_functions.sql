-- Audit de sécurité (livrable 11) : quatre fonctions d'aide restaient exécutables par `anon` (droit `PUBLIC` par défaut de Postgres, antérieur au lot D, qui n'a corrigé que les futures fonctions).
-- Aucune ne lit de table ; on retire quand même le droit : `anon` n'a aucun usage de ces fonctions. Les comptes connectés (`authenticated`) et `service_role` gardent leur droit explicite.
-- Il faut retirer `PUBLIC` ET `anon` : `anon` hérite de `PUBLIC`, retirer `anon` seul ne changerait rien.
revoke execute on function public.immutable_unaccent(text) from public, anon;
revoke execute on function public.pp_thresholds_ok(smallint[]) from public, anon;
revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.user_stories_guard_closed_sprint() from public, anon;
