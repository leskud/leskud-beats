-- LeSkud Beats — Schéma initial MVP
-- Exécuter dans Supabase SQL Editor ou via Supabase CLI

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.beat_status as enum ('draft', 'published', 'sold_exclusive');
create type public.license_type as enum ('mp3', 'wav', 'stems', 'exclusive');
create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded');

-- Profiles (extension de auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Beats
create table public.beats (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  bpm integer not null check (bpm > 0 and bpm <= 300),
  musical_key text not null,
  genre text not null,
  mood text not null,
  tags text[] not null default '{}',
  duration_seconds integer not null check (duration_seconds > 0),
  cover_path text,
  preview_path text,
  status public.beat_status not null default 'draft',
  is_featured boolean not null default false,
  producer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beats_status_idx on public.beats (status);
create index beats_genre_idx on public.beats (genre);
create index beats_bpm_idx on public.beats (bpm);
create index beats_mood_idx on public.beats (mood);
create index beats_created_at_idx on public.beats (created_at desc);
create index beats_is_featured_idx on public.beats (is_featured) where is_featured = true;

-- Licences par beat (prix + fichier privé)
create table public.beat_licenses (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats (id) on delete cascade,
  license_type public.license_type not null,
  price_cents integer not null check (price_cents >= 0),
  storage_path text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (beat_id, license_type)
);

create index beat_licenses_beat_id_idx on public.beat_licenses (beat_id);

-- Commandes
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status public.order_status not null default 'pending',
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'eur',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_email_idx on public.orders (email);
create index orders_status_idx on public.orders (status);

-- Lignes de commande
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  beat_id uuid not null references public.beats (id) on delete restrict,
  beat_license_id uuid not null references public.beat_licenses (id) on delete restrict,
  license_type public.license_type not null,
  price_cents integer not null check (price_cents >= 0),
  beat_title text not null,
  download_count integer not null default 0 check (download_count >= 0),
  max_downloads integer not null default 5 check (max_downloads > 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_beat_id_idx on public.order_items (beat_id);

-- Panier (session utilisateur connecté — v2 invité via localStorage côté client)
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  beat_license_id uuid not null references public.beat_licenses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, beat_license_id)
);

-- Trigger : créer profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger : updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger beats_updated_at
  before update on public.beats
  for each row execute function public.set_updated_at();

create trigger beat_licenses_updated_at
  before update on public.beat_licenses
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Fonction : marquer beat exclusive vendu
create or replace function public.mark_beat_exclusive_sold(p_beat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.beats
  set status = 'sold_exclusive', is_featured = false, updated_at = now()
  where id = p_beat_id;

  update public.beat_licenses
  set is_available = false, updated_at = now()
  where beat_id = p_beat_id;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.beats enable row level security;
alter table public.beat_licenses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;

-- Helper admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Beats : lecture publique des beats publiés
create policy "Public can read published beats"
  on public.beats for select
  using (status = 'published' or public.is_admin());

create policy "Admins can insert beats"
  on public.beats for insert
  with check (public.is_admin());

create policy "Admins can update beats"
  on public.beats for update
  using (public.is_admin());

create policy "Admins can delete beats"
  on public.beats for delete
  using (public.is_admin());

-- Beat licenses : lecture publique si beat publié et licence disponible
create policy "Public can read available licenses"
  on public.beat_licenses for select
  using (
    public.is_admin()
    or (
      is_available = true
      and exists (
        select 1 from public.beats b
        where b.id = beat_id and b.status = 'published'
      )
    )
  );

create policy "Admins can manage licenses"
  on public.beat_licenses for all
  using (public.is_admin())
  with check (public.is_admin());

-- Orders
create policy "Users can read own orders"
  on public.orders for select
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = email
    or public.is_admin()
  );

create policy "Admins can manage orders"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Order items (via order ownership)
create policy "Users can read own order items"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or (auth.jwt() ->> 'email') = o.email)
    )
  );

create policy "Admins can manage order items"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- Cart
create policy "Users can manage own cart"
  on public.cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage buckets (à créer dans Supabase Dashboard ou via API)
-- preview  : public
-- covers   : public
-- beats    : private (WAV, stems ZIP, MP3 full)
