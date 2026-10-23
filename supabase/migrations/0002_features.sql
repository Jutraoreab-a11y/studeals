-- =====================================================================
-- Studeals — fonctionnalités : messagerie, candidatures missions,
-- réductions VIP, alertes, anti-pros, temps réel.
-- =====================================================================

-- ---------- Catégorie de mission ----------
alter table public.gigs add column category text not null default 'other'
  check (category in ('groceries', 'laundry', 'digital', 'moving', 'other'));

-- ---------- Anti-pros : 20 annonces actives max par personne ----------
create or replace function public.limit_active_listings()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.listings
      where seller_id = new.seller_id and status = 'active') >= 20 then
    raise exception 'Limite de 20 annonces actives atteinte (Studeals est réservé aux particuliers).';
  end if;
  return new;
end $$;

create trigger listings_limit before insert on public.listings
  for each row execute function public.limit_active_listings();

-- ---------- Messagerie P2P ----------
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.users (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  listing_id   uuid references public.listings (id) on delete set null,
  gig_id       uuid references public.gigs (id) on delete set null,
  body         text not null check (char_length(body) between 1 and 2000),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index messages_pair_idx on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

alter table public.messages enable row level security;
create policy "messages parties read" on public.messages for select
  using (auth.uid() in (sender_id, recipient_id));
create policy "messages send verified" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_verified_user());
create policy "messages mark read" on public.messages for update
  using (recipient_id = auth.uid());
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Liste des conversations (dernier message par interlocuteur)
create or replace function public.my_conversations()
returns table (other_id uuid, last_body text, last_at timestamptz, unread bigint)
language sql stable security invoker set search_path = public as $$
  with mine as (
    select case when sender_id = auth.uid() then recipient_id else sender_id end as other_id,
           body, created_at, recipient_id, read_at
    from messages
    where auth.uid() in (sender_id, recipient_id)
  )
  select other_id,
         (array_agg(body order by created_at desc))[1],
         max(created_at),
         count(*) filter (where recipient_id = auth.uid() and read_at is null)
  from mine group by other_id order by max(created_at) desc
$$;

-- ---------- Candidatures aux missions ----------
create table public.gig_applications (
  gig_id     uuid not null references public.gigs (id) on delete cascade,
  worker_id  uuid not null references public.users (id) on delete cascade,
  note       text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  primary key (gig_id, worker_id)
);
alter table public.gig_applications enable row level security;
create policy "applications read" on public.gig_applications for select
  using (worker_id = auth.uid()
         or exists (select 1 from public.gigs g where g.id = gig_id and g.requester_id = auth.uid()));
create policy "applications insert" on public.gig_applications for insert
  with check (worker_id = auth.uid() and public.is_verified_user()
              and exists (select 1 from public.gigs g
                          where g.id = gig_id and g.status = 'open' and g.requester_id <> auth.uid()));
create policy "applications withdraw" on public.gig_applications for delete
  using (worker_id = auth.uid());

-- ---------- Réductions partenaires (VIP uniquement) ----------
create table public.venue_deals (
  id       uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  label    text not null,               -- « -50 % sur la 1re pinte avant 21 h »
  valid_on text                         -- « jeudi », « tous les soirs »…
);
alter table public.venue_deals enable row level security;
create policy "deals premium only" on public.venue_deals for select
  using (coalesce((select is_premium from public.users where id = auth.uid()), false));

-- Nombre de réductions par lieu (visible par tous → teaser du paywall)
create or replace function public.venue_deal_counts(p_city uuid)
returns table (venue_id uuid, deals bigint)
language sql stable security definer set search_path = public as $$
  select v.id, count(d.id) from venues v
  left join venue_deals d on d.venue_id = v.id
  where v.city_id = p_city group by v.id
$$;

-- ---------- Notifications + alertes mots-clés ----------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  kind       text not null,             -- 'alert_match' | 'sos' | …
  title      text not null,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete using (user_id = auth.uid());

create or replace function public.match_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, title, href)
  select a.user_id, 'alert_match',
         'Nouvelle trouvaille : ' || new.title || ' (' || new.price || ' €)',
         '/marketplace/' || new.id
  from alerts a
  where a.city_id = new.city_id
    and a.user_id <> new.seller_id
    and (new.title ilike '%' || a.keyword || '%' or new.description ilike '%' || a.keyword || '%')
    and (a.max_price is null or new.price <= a.max_price);
  return new;
end $$;

create trigger listings_match_alerts after insert on public.listings
  for each row execute function public.match_alerts();

-- ---------- Temps réel ----------
alter publication supabase_realtime add table public.gigs;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- ---------- Données de démo (lieux) ----------
insert into public.venues (city_id, name, type, address)
select c.id, v.name, v.type, v.address
from public.cities c
join (values
  ('lille', 'Le Comptoir de Wazemmes', 'bar', 'Place de la Nouvelle Aventure'),
  ('lille', 'La Péniche du Vieux-Lille', 'bar', 'Quai du Wault'),
  ('reims', 'Le Clos Drouet', 'bar', 'Rue de Vesle'),
  ('reims', 'Le Sous-Sol', 'club', 'Place d''Erlon'),
  ('paris', 'Le Canal Rooftop', 'rooftop', 'Quai de Valmy'),
  ('paris', 'La Cave Oberkampf', 'bar', 'Rue Oberkampf')
) as v(slug, name, type, address) on v.slug = c.slug;
-- NB : noms fictifs, à remplacer par les vrais partenaires.
