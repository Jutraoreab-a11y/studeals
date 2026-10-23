-- =====================================================================
-- Studeals — compte & paramètres :
-- prénom affiché, photo de profil, comptes créés par téléphone,
-- synchronisation email/téléphone, mot de passe, suppression de compte.
-- =====================================================================

-- ---------- Profil ----------
alter table public.users
  alter column email drop not null,                 -- un compte créé par SMS n'a pas d'email
  add column phone            text,
  add column display_name     text check (display_name is null or char_length(display_name) between 2 and 20),
  add column password_set_at  timestamptz,           -- indique seulement si un mot de passe existe
  add column deleted_at       timestamptz;

grant update (display_name) on public.users to authenticated;

-- Le profil suit email et téléphone de auth.users (inscription + changements confirmés)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, phone) values (new.id, new.email, new.phone);
  return new;
end $$;

create or replace function public.handle_user_contact_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.users set email = new.email, phone = new.phone where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_contact_changed on auth.users;
create trigger on_auth_user_contact_changed
  after update of email, phone on auth.users
  for each row
  when (old.email is distinct from new.email or old.phone is distinct from new.phone)
  execute function public.handle_user_contact_change();

-- Profil public : on expose le prénom affiché (jamais l'email ni le téléphone)
create or replace view public.public_profiles with (security_invoker = false) as
  select id, display_name, avatar_url, is_verified, city_id
  from public.users
  where deleted_at is null;
grant select on public.public_profiles to anon, authenticated;

-- ---------- Photos de profil ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict do nothing;
create policy "avatar upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Compte supprimé = plus aucun droit ----------
create or replace function public.is_verified_user()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_verified and not is_banned and deleted_at is null from public.users where id = auth.uid()),
    false)
$$;
