-- Formulaire de contact public (/portfolio) : les messages arrivent dans les notes d'Alex, en brouillon.
-- Aucune table n'est ouverte à `anon` : une seule fonction, qui valide, plafonne le débit et écrit dans `notes`.

-- Le destinataire : une seule ligne activée. Alex l'insère lui-même avec son compte (voir la fin du fichier).
create table public.contact_form_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true
);
alter table public.contact_form_settings enable row level security;
create policy contact_form_settings_owner on public.contact_form_settings
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
-- Au plus un destinataire activé : un visiteur ne choisit jamais à qui il écrit.
create unique index contact_form_one_recipient on public.contact_form_settings ((enabled)) where enabled;

create function public.submit_contact_message(p_name text, p_email text, p_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '[\r\n\t]+', ' ', 'g');
  v_email text := btrim(coalesce(p_email, ''));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if char_length(v_name) not between 1 and 200
     or char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+$'
     or char_length(v_message) not between 10 and 4000 then
    raise exception 'invalid' using errcode = '22023';
  end if;

  select owner_id into v_owner from public.contact_form_settings where enabled;
  if v_owner is null then
    return false; -- formulaire non activé : rien n'est écrit
  end if;

  -- ponytail : plafond de 10 messages par heure, repéré par le préfixe du titre ; une table de journal si le volume l'exige.
  if (select count(*) from public.notes
        where owner_id = v_owner and title like 'Message reçu · %' and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate' using errcode = '54000';
  end if;

  insert into public.notes (owner_id, title, body, status, type)
  values (
    v_owner,
    left('Message reçu · ' || v_name, 200),
    'Texte reçu d''un visiteur via le formulaire du portfolio, non vérifié.' || E'\n\n'
      || 'De : ' || v_name || E'\n'
      || 'E-mail : ' || v_email || E'\n'
      || 'Reçu le : ' || to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI') || E'\n\n'
      || v_message,
    'draft',
    'note'
  );
  return true;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text) to anon, authenticated;

-- Étape suivante, à part (ne fait pas partie de la migration) : activer le formulaire pour le compte d'Alex.
-- Remplacer <UUID> par l'identifiant de son compte (Authentication > Users) :
-- insert into public.contact_form_settings (owner_id) values ('<UUID>');
