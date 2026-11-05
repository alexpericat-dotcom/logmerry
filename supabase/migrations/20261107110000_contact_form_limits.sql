-- Formulaire de contact : plafonds plus stricts, qui résistent à la suppression des notes.
-- Un robot qui appelle la fonction directement saute le champ piège et le délai : seules ces règles, en base, le retiennent.
-- Avant : 10 messages par heure au total, comptés par le préfixe du titre des notes. Maintenant, un journal sans texte de message.

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Empreintes seulement : ni l'adresse ni le texte ne sont gardés en double (ils sont dans la note).
  email_hash text not null,
  message_hash text not null,
  created_at timestamptz not null default now()
);
create index contact_submissions_owner_created_idx on public.contact_submissions (owner_id, created_at desc);
alter table public.contact_submissions enable row level security;
-- Lecture par le destinataire ; aucune politique d'écriture : seule la fonction ci-dessous écrit.
create policy contact_submissions_owner on public.contact_submissions
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- Même signature : les droits existants (dont `anon`) sont conservés, pas de nouveau `grant`.
create or replace function public.submit_contact_message(p_name text, p_email text, p_message text)
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
  v_email_hash text;
  v_message_hash text;
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

  v_email_hash := md5(lower(v_email));
  v_message_hash := md5(v_message);

  delete from public.contact_submissions where created_at < now() - interval '30 days';

  -- Doublon (même adresse, même texte, moins de 24 h) : une double soumission ; même réponse qu'un envoi, rien n'est écrit.
  if exists (select 1 from public.contact_submissions
               where owner_id = v_owner and email_hash = v_email_hash and message_hash = v_message_hash
                 and created_at > now() - interval '24 hours') then
    return true;
  end if;

  -- Plafonds : 5 par heure et 30 par jour au total, 3 par jour pour une même adresse.
  if (select count(*) from public.contact_submissions where owner_id = v_owner and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.contact_submissions where owner_id = v_owner and created_at > now() - interval '1 day') >= 30
     or (select count(*) from public.contact_submissions where owner_id = v_owner and email_hash = v_email_hash and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate' using errcode = '54000';
  end if;

  insert into public.contact_submissions (owner_id, email_hash, message_hash) values (v_owner, v_email_hash, v_message_hash);

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
