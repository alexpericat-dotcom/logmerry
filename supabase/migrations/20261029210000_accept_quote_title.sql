-- Titre de la mission créée à l'acceptation d'un devis : « {Client} — devis du JJ/MM/AAAA » (avant : « Devis du JJ/MM/AAAA — {Client} »).
-- Le nom du client vient en tête : les missions d'un même client se rangent ensemble, et le rappel « Facturer la mission … » du cockpit se lit sans doublon.
-- Seul le titre change (nom coupé à 170 caractères + 22 de suffixe = 192, sous la limite de 200). Les missions déjà créées gardent leur titre.
create or replace function public.accept_quote(p_quote_id uuid) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  q public.quotes;
  c public.clients;
  m uuid;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote not found' using errcode = 'P0002'; end if;
  if q.status = 'accepted' then return q.mission_id; end if;
  if q.status <> 'sent' then raise exception 'quote not sent' using errcode = '23514'; end if;

  perform set_config('app.accepting_quote', 'on', true);
  m := q.mission_id;
  if m is null then
    select * into c from public.clients where id = q.client_id for update;
    if c.status = 'prospect' then
      update public.clients set status = 'client' where id = c.id;
    end if;
    insert into public.missions (client_id, title, status)
      values (c.id, left(c.name, 170) || ' — devis du ' || to_char(q.sent_on, 'DD/MM/YYYY'), 'planned')
      returning id into m;
  end if;
  update public.quotes set status = 'accepted', mission_id = m where id = q.id;
  perform set_config('app.accepting_quote', 'off', true);
  return m;
end;
$$;
