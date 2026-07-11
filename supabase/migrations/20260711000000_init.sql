-- Trainestro schema: live training aggregator (country-aware for future expansion)

create extension if not exists "pgcrypto";

create type public.delivery_mode as enum ('online', 'onsite', 'hybrid');
create type public.training_status as enum ('upcoming', 'completed', 'archived');
create type public.scrape_run_status as enum ('success', 'partial', 'failed', 'running');

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website text not null,
  listing_url text not null,
  country_code text not null default 'PK',
  city text,
  province text,
  description text,
  logo_url text,
  scraper_key text not null unique,
  scraper_enabled boolean not null default true,
  contact_email text,
  contact_phone text,
  reputation_score integer not null default 50 check (reputation_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  instructor text,
  category text,
  skill_tags text[] not null default '{}',
  city text,
  province text,
  venue text,
  latitude double precision,
  longitude double precision,
  delivery_mode public.delivery_mode not null,
  start_date date not null,
  end_date date,
  duration text,
  registration_deadline date,
  price numeric(12, 2),
  currency text not null default 'PKR',
  is_free boolean not null default false,
  certificate_available boolean not null default false,
  registration_url text not null,
  image_url text,
  contact_info text,
  status public.training_status not null default 'upcoming',
  source_hash text not null,
  country_code text not null default 'PK',
  last_scraped_at timestamptz,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider_id, source_hash)
);

create table public.scrape_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.providers(id) on delete set null,
  scraper_key text not null,
  status public.scrape_run_status not null,
  message text,
  trainings_found integer not null default 0,
  trainings_created integer not null default 0,
  trainings_updated integer not null default 0,
  trainings_archived integer not null default 0,
  error_details text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index trainings_status_start_idx on public.trainings (status, start_date);
create index trainings_provider_idx on public.trainings (provider_id);
create index trainings_city_idx on public.trainings (city);
create index trainings_category_idx on public.trainings (category);
create index trainings_country_idx on public.trainings (country_code);
create index trainings_tags_gin on public.trainings using gin (skill_tags);
create index scrape_logs_started_idx on public.scrape_logs (started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger providers_set_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

alter table public.providers enable row level security;
alter table public.trainings enable row level security;
alter table public.scrape_logs enable row level security;

create policy "Public read providers"
  on public.providers for select
  to anon, authenticated
  using (true);

create policy "Public read upcoming trainings"
  on public.trainings for select
  to anon, authenticated
  using (status = 'upcoming');

create policy "Authenticated read scrape logs"
  on public.scrape_logs for select
  to authenticated
  using (true);

-- Service role bypasses RLS for scrapers/admin writes
