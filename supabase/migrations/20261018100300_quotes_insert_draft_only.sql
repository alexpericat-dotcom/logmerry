-- Story 3.6 (relecture) : un devis ne pouvait être inséré qu'avec n'importe quel statut ; « accepté » ou « refusé » inséré
-- directement aurait été figé, indélébile et sans mission. Un devis naît brouillon ; « envoyé » se pose par mise à jour (avec sa date).
-- Règle d'insertion : définition en vigueur (20261018100100) + status = 'draft'.
drop policy quotes_insert on public.quotes;
create policy quotes_insert on public.quotes for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'draft'
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
    and (mission_id is null or exists (select 1 from public.missions m where m.id = mission_id and m.client_id = quotes.client_id and m.owner_id = (select auth.uid())))
  );

-- Durcissement : une fonction de déclencheur n'a pas à être exécutable par les rôles de l'API.
revoke execute on function public.quotes_guard() from public, anon, authenticated;
