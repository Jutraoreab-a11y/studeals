-- =====================================================================
-- Studeals — schéma initial
-- Principes :
--   * public.users est un miroir 1-1 de auth.users (créé par trigger).
--   * Les colonnes sensibles (is_premium, is_verified, stripe_*) ne sont
--     JAMAIS modifiables par le client : privilèges colonne + service role.
--   * Les codes de séquestre vivent dans une table dédiée, lisible
--     uniquement par l'acheteur (le vendeur ne doit jamais pouvoir le lire).
--   * Les check-ins nightlife sont privés ; l'affluence est exposée via
--     une fonction agrégée (anonymat).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type listing_category   as enum ('goods', 'room_match');
create type listing_status     as enum ('active', 'reserved', 'sold');
create type gig_status         as enum ('open', 'in_progress', 'completed', 'cancelled');
create type transaction_type   as enum ('listing', 'gig', 'subscription');
create type transaction_status as enum ('pending', 'held', 'released', 'refunded', 'failed');

-- ---------- cities ----------
create table public.cities (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

insert into public.cities (name, slug) values
  ('Lille', 'lille'), ('Reims', 'reims'), ('Paris / IDF', 'paris');

-- ---------- users ----------
create table public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  city_id             uuid references public.cities (id),
  birth_date          date,
  is_verified         boolean not null default false,
  avatar_url          text,
  is_premium          boolean not null default false,
  stripe_customer_id  text unique,
  stripe_account_id   text unique,        -- compte Stripe Connect (vendeur / worker)
  payouts_enabled     boolean not null default false,
  created_at          timestamptz not null default now(),
  constraint age_18_25 check (
    birth_date is null
    or (birth_date <= (current_date - interval '18 years')
        and birth_date >  (current_date - interval '26 years'))
  )
);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper : l'utilisateur courant a-t-il le Badge de Confiance ?
create or replace function public.is_verified_user()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_verified from public.users where id = auth.uid()), false)
$$;

-- ---------- listings ----------
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.users (id) on delete cascade,
  city_id     uuid not null references public.cities (id),
  title       text not null check (char_length(title) between 3 and 80),
  description text,
  price       numeric(10,2) not null check (price >= 0),
  category    listing_category not null,
  subcategory text,                       -- 'furniture_office' | 'items' …
  is_urgent   boolean not null default false,   -- tag « À liquider d'urgence »
  images      text[] not null default '{}',
  lat         double precision,
  lng         double precision,
  status      listing_status not null default 'active',
  created_at  timestamptz not null default now()
);
create index listings_feed_idx on public.listings (city_id, status, created_at desc);

-- ---------- gigs ----------
create table public.gigs (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.users (id) on delete cascade,
  worker_id     uuid references public.users (id),
  city_id       uuid not null references public.cities (id),
  title         text not null check (char_length(title) between 3 and 80),
  description   text,
  reward_amount numeric(10,2) not null check (reward_amount > 0),
  is_sos        boolean not null default false,
  lat           double precision,
  lng           double precision,
  status        gig_status not null default 'open',
  created_at    timestamptz not null default now()
);
create index gigs_feed_idx on public.gigs (city_id, status, is_sos desc, created_at desc);
-- NB : le champ validation_code de la spec est déplacé dans escrow_codes
-- (sinon le worker pourrait le lire via RLS, RLS ne filtrant pas les colonnes).

-- ---------- alerts ----------
create table public.alerts (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users (id) on delete cascade,
  keyword   text not null,
  max_price numeric(10,2),
  city_id   uuid not null references public.cities (id)
);

-- ---------- transactions ----------
create table public.transactions (
  id                        uuid primary key default gen_random_uuid(),
  reference_id              uuid,          -- listing.id ou gig.id
  type                      transaction_type not null,
  buyer_id                  uuid not null references public.users (id),
  seller_id                 uuid references public.users (id),
  amount                    numeric(10,2) not null,
  platform_fee              numeric(10,2) not null default 0,
  stripe_payment_intent_id  text unique,
  stripe_transfer_id        text,
  status                    transaction_status not null default 'pending',
  created_at                timestamptz not null default now(),
  released_at               timestamptz
);
create index transactions_ref_idx on public.transactions (reference_id);

-- ---------- escrow_codes (privé acheteur) ----------
create table public.escrow_codes (
  transaction_id uuid primary key references public.transactions (id) on delete cascade,
  buyer_id       uuid not null references public.users (id),
  code_hash      text not null,     -- sha256(code + transaction_id)
  code_plain     text not null,     -- affiché à l'acheteur uniquement
  attempts       int  not null default 0,
  locked         boolean not null default false
);

-- ---------- venues / nightlife ----------
create table public.venues (
  id      uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  name    text not null,
  type    text not null,          -- 'bar', 'club', 'rooftop'…
  address text
);

create table public.nightlife_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  venue_id   uuid not null references public.venues (id) on delete cascade,
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, venue_id, date)
);

-- Météo des soirées : agrégat anonyme. Détail par lieu réservé au VIP.
create or replace function public.nightlife_weather(p_city uuid)
returns table (venue_id uuid, venue_name text, checkins bigint)
language sql stable security definer set search_path = public as $$
  select v.id,
         v.name,
         count(c.id) as checkins
  from venues v
  left join nightlife_checkins c on c.venue_id = v.id and c.date = current_date
  where v.city_id = p_city
    and coalesce((select is_premium from users where id = auth.uid()), false)
  group by v.id, v.name
  order by checkins desc
$$;

create or replace function public.nightlife_city_total(p_city uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from nightlife_checkins c
  join venues v on v.id = c.venue_id
  where v.city_id = p_city and c.date = current_date
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.cities             enable row level security;
alter table public.users              enable row level security;
alter table public.listings           enable row level security;
alter table public.gigs               enable row level security;
alter table public.alerts             enable row level security;
alter table public.transactions       enable row level security;
alter table public.escrow_codes       enable row level security;
alter table public.venues             enable row level security;
alter table public.nightlife_checkins enable row level security;

-- cities / venues : lecture publique
create policy "cities read"  on public.cities for select using (true);
create policy "venues read"  on public.venues for select using (true);

-- users : chacun lit/édite son profil ; colonnes sensibles verrouillées
create policy "users self read"   on public.users for select using (auth.uid() = id);
create policy "users self update" on public.users for update using (auth.uid() = id);
revoke update on public.users from authenticated, anon;
grant  update (city_id, avatar_url, birth_date) on public.users to authenticated;

-- Profil public minimal (badge visible sur les annonces)
create view public.public_profiles with (security_invoker = false) as
  select id, avatar_url, is_verified, city_id from public.users;
grant select on public.public_profiles to anon, authenticated;

-- listings
create policy "listings read" on public.listings for select
  using (status <> 'sold' or seller_id = auth.uid());
create policy "listings insert verified" on public.listings for insert
  with check (seller_id = auth.uid() and public.is_verified_user());
create policy "listings owner update" on public.listings for update
  using (seller_id = auth.uid());
create policy "listings owner delete" on public.listings for delete
  using (seller_id = auth.uid() and status = 'active');

-- gigs
create policy "gigs read" on public.gigs for select using (true);
create policy "gigs insert verified" on public.gigs for insert
  with check (requester_id = auth.uid() and public.is_verified_user());
create policy "gigs requester update" on public.gigs for update
  using (requester_id = auth.uid());

-- alerts
create policy "alerts own" on public.alerts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- transactions : lecture par les parties ; écriture serveur uniquement
create policy "transactions parties read" on public.transactions for select
  using (auth.uid() in (buyer_id, seller_id));

-- escrow_codes : acheteur uniquement, lecture seule
create policy "escrow buyer read" on public.escrow_codes for select
  using (buyer_id = auth.uid());
revoke select on public.escrow_codes from authenticated;
grant  select (transaction_id, code_plain, locked) on public.escrow_codes to authenticated;

-- check-ins : privés, insertion par soi-même
create policy "checkins own read"   on public.nightlife_checkins for select using (user_id = auth.uid());
create policy "checkins own insert" on public.nightlife_checkins for insert with check (user_id = auth.uid());
create policy "checkins own delete" on public.nightlife_checkins for delete using (user_id = auth.uid());

-- Storage : bucket public pour les photos d'annonces
insert into storage.buckets (id, name, public) values ('listings', 'listings', true)
  on conflict do nothing;
create policy "listing images upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);
