-- Tables for Modules 6–9

-- profiles: one row per user
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  display_name text,
  headline text,
  avatar_url text,
  is_public boolean default true,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- videos owned by a user
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text,
  description text,
  storage_path text not null,
  duration_seconds int,
  created_at timestamptz default now()
);

-- share tokens for videos
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- helpful indices
create index if not exists idx_videos_owner on public.videos(owner);
create index if not exists idx_shares_token on public.shares(token);
