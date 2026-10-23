-- =====================================================================
-- Studeals — confiance & conformité :
-- litiges, expiration du séquestre, modération, admin, push/email,
-- bars partenaires réels, données fiscales DAC7, acceptation des CGU.
-- =====================================================================

create extension if not exists pg_net;

-- ---------- Nouveaux statuts ----------
alter type transaction_status add value if not exists 'disputed';
alter type listing_status     add value if not exists 'removed';

-- ---------- Utilisateurs : rôles, bannissement, préférences ----------
alter table public.users
  add column is_admin          boolean not null default false,
  add column is_banned         boolean not null default false,
  add column notify_email      boolean not null default true,
  add column notify_push       boolean not null default true,
  add column legal_accepted_at timestamptz,
  add column legal_version     text;

grant update (notify_email, notify_push) on public.users to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false)
$$;

-- Un compte banni perd le Badge de Confiance dans toutes les politiques RLS
create or replace function public.is_verified_user()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_verified and not is_banned from public.users where id = auth.uid()), false)
$$;

-- ---------- Séquestre : horodatage pour l'expiration ----------
alter table public.transactions add column held_at timestamptz;
alter table public.transactions add column reminder_sent_at timestamptz;

-- ---------- Litiges ----------
create table public.disputes (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null unique references public.transactions (id) on delete cascade,
  opened_by       uuid not null references public.users (id),
  reason          text not null check (reason in
                    ('no_show', 'not_as_described', 'damaged', 'code_not_given', 'mission_not_done', 'other')),
  details         text check (char_length(details) <= 2000),
  status          text not null default 'open' check (status in ('open', 'refunded', 'released', 'rejected')),
  resolution_note text,
  resolved_by     uuid references public.users (id),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
alter table public.disputes enable row level security;
create policy "disputes parties read" on public.disputes for select
  using (public.is_admin() or exists (
    select 1 from public.transactions t
    where t.id = transaction_id and auth.uid() in (t.buyer_id, t.seller_id)));
-- Création / résolution : uniquement via les routes API (service role).

-- ---------- Signalements (DSA : mécanisme de notification) ----------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'gig', 'user', 'message')),
  target_id   uuid not null,
  reason      text not null check (reason in
                ('scam', 'professional', 'illegal', 'sublet', 'harassment', 'inappropriate', 'other')),
  details     text check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  decision    text,             -- exposé des motifs envoyé à l'auteur (DSA art. 17)
  handled_by  uuid references public.users (id),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  unique (reporter_id, target_type, target_id)
);
create index reports_open_idx on public.reports (status, created_at);
alter table public.reports enable row level security;
create policy "reports insert" on public.reports for insert
  with check (reporter_id = auth.uid() and auth.uid() is not null);
create policy "reports own or admin read" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

-- Masquage automatique : 3 signalements distincts → annonce retirée en attente de revue
create or replace function public.auto_hide_reported()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(distinct reporter_id) into n from reports
  where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if n >= 3 then
    if new.target_type = 'listing' then
      update listings set status = 'removed' where id = new.target_id and status = 'active';
    elsif new.target_type = 'gig' then
      update gigs set status = 'cancelled' where id = new.target_id and status = 'open';
    end if;
  end if;
  return new;
end $$;
create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.auto_hide_reported();

-- ---------- Abonnements push ----------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push own" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Livraison des notifications (push + email) ----------
-- Chaque ligne insérée dans notifications déclenche un appel à l'API de l'app,
-- qui envoie le push et, pour les événements importants, l'email.
create table public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security; -- aucune policy : illisible côté client
-- À renseigner après déploiement :
--   insert into app_config values ('notify_url', 'https://ton-domaine/api/notifications/deliver');
--   insert into app_config values ('notify_secret', '<NOTIFY_WEBHOOK_SECRET>');

create or replace function public.deliver_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select value into url    from app_config where key = 'notify_url';
  select value into secret from app_config where key = 'notify_secret';
  if url is null then return new; end if;
  perform net.http_post(
    url     := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
    body    := jsonb_build_object('id', new.id)
  );
  return new;
end $$;
create trigger notifications_deliver after insert on public.notifications
  for each row execute function public.deliver_notification();

-- Mode SOS : notification à toute la ville (hors demandeur), plafonnée à 500
create or replace function public.broadcast_sos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_sos then
    insert into notifications (user_id, kind, title, href)
    select u.id, 'sos',
           'SOS près de toi : ' || new.title || ' (' || new.reward_amount || ' €)',
           '/gigs/' || new.id
    from users u
    where u.city_id = new.city_id and u.id <> new.requester_id
      and u.notify_push and u.is_verified and not u.is_banned
    limit 500;
  end if;
  return new;
end $$;
create trigger gigs_broadcast_sos after insert on public.gigs
  for each row execute function public.broadcast_sos();

-- La ville du profil doit suivre le sélecteur pour recevoir les SOS
-- (mis à jour par l'app à chaque changement de ville).

-- ---------- Bars partenaires réels ----------
-- Suppression des lieux fictifs de la migration 0002
delete from public.venues where name in (
  'Le Comptoir de Wazemmes', 'La Péniche du Vieux-Lille', 'Le Clos Drouet',
  'Le Sous-Sol', 'Le Canal Rooftop', 'La Cave Oberkampf');

alter table public.venues
  add column is_active     boolean not null default true,
  add column contact_email text,
  add column partner_since date default current_date,
  add column contract_ends date;

-- Candidatures des bars (formulaire public /partenaires)
create table public.venue_applications (
  id           uuid primary key default gen_random_uuid(),
  city_id      uuid not null references public.cities (id),
  venue_name   text not null check (char_length(venue_name) between 2 and 100),
  venue_type   text not null check (venue_type in ('bar', 'club', 'rooftop', 'restaurant', 'other')),
  address      text not null,
  contact_name text not null,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone        text,
  siret        text check (siret is null or siret ~ '^\d{14}$'),
  offer        text not null check (char_length(offer) <= 500),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);
alter table public.venue_applications enable row level security;
create policy "venue apply public" on public.venue_applications for insert to anon, authenticated
  with check (status = 'pending');
create policy "venue applications admin" on public.venue_applications for select using (public.is_admin());

-- Les fonctions nightlife ne montrent que les lieux actifs
create or replace function public.nightlife_weather(p_city uuid)
returns table (venue_id uuid, venue_name text, checkins bigint)
language sql stable security definer set search_path = public as $$
  select v.id, v.name, count(c.id)
  from venues v
  left join nightlife_checkins c on c.venue_id = v.id and c.date = current_date
  where v.city_id = p_city and v.is_active
    and coalesce((select is_premium from users where id = auth.uid()), false)
  group by v.id, v.name order by 3 desc
$$;

create or replace function public.nightlife_city_total(p_city uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from nightlife_checkins c
  join venues v on v.id = c.venue_id
  where v.city_id = p_city and v.is_active and c.date = current_date
$$;

-- ---------- DAC7 : informations fiscales des vendeurs ----------
-- Biens : déclaration au-delà de 30 ventes OU 2 000 € sur l'année civile.
-- Services (missions) : déclaration sans seuil.
create table public.seller_tax_info (
  user_id     uuid primary key references public.users (id) on delete cascade,
  first_name  text not null,
  last_name   text not null,
  birth_date  date not null,
  address     text not null,
  postal_code text not null,
  city        text not null,
  country     text not null default 'FR',
  tax_id      text not null check (tax_id ~ '^\d{13}$'),   -- numéro fiscal français (13 chiffres)
  updated_at  timestamptz not null default now()
);
alter table public.seller_tax_info enable row level security;
create policy "tax own" on public.seller_tax_info for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tax admin read" on public.seller_tax_info for select using (public.is_admin());

-- Agrégat annuel par vendeur (admin).
-- Règle DAC7 : les VENTES DE BIENS sont exclues si < 30 ventes ET <= 2 000 € ;
-- les SERVICES PERSONNELS (missions) sont déclarables dès le premier euro.
create or replace function public.dac7_report(p_year int)
returns table (
  seller_id uuid, email text,
  goods_count bigint, goods_amount numeric, services_count bigint, services_amount numeric,
  fees numeric, q1 numeric, q2 numeric, q3 numeric, q4 numeric,
  reportable boolean, has_tax_info boolean,
  first_name text, last_name text, birth_date date, address text, postal_code text,
  city text, country text, tax_id text
)
language sql stable security definer set search_path = public as $$
  select t.seller_id, u.email,
         count(*) filter (where t.type = 'listing'),
         coalesce(sum(t.amount) filter (where t.type = 'listing'), 0),
         count(*) filter (where t.type = 'gig'),
         coalesce(sum(t.amount) filter (where t.type = 'gig'), 0),
         sum(t.platform_fee),
         coalesce(sum(t.amount) filter (where extract(quarter from t.released_at) = 1), 0),
         coalesce(sum(t.amount) filter (where extract(quarter from t.released_at) = 2), 0),
         coalesce(sum(t.amount) filter (where extract(quarter from t.released_at) = 3), 0),
         coalesce(sum(t.amount) filter (where extract(quarter from t.released_at) = 4), 0),
         (count(*) filter (where t.type = 'gig') > 0
          or count(*) filter (where t.type = 'listing') >= 30
          or coalesce(sum(t.amount) filter (where t.type = 'listing'), 0) > 2000),
         s.user_id is not null,
         s.first_name, s.last_name, s.birth_date, s.address, s.postal_code, s.city, s.country, s.tax_id
  from transactions t
  join users u on u.id = t.seller_id
  left join seller_tax_info s on s.user_id = t.seller_id
  where public.is_admin()
    and t.status = 'released' and t.type in ('listing', 'gig')
    and extract(year from t.released_at) = p_year
  group by t.seller_id, u.email, s.user_id, s.first_name, s.last_name, s.birth_date,
           s.address, s.postal_code, s.city, s.country, s.tax_id
  order by 4 desc
$$;

-- Ventes de l'année en cours pour le vendeur lui-même (alerte de seuil dans son profil)
create or replace function public.my_sales_year()
returns table (sales_count bigint, gross_amount numeric, services_count bigint)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where type = 'listing'),
         coalesce(sum(amount) filter (where type = 'listing'), 0),
         count(*) filter (where type = 'gig')
  from transactions
  where seller_id = auth.uid() and status = 'released'
    and extract(year from released_at) = extract(year from now())
$$;
