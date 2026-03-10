-- Enable RLS
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.shares enable row level security;

-- profiles policies
create policy if not exists "profiles_self_read"
on public.profiles for select
using ( is_public = true or auth.uid() = id );

create policy if not exists "profiles_self_write"
on public.profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );

create policy if not exists "profiles_insert_self"
on public.profiles for insert
with check ( auth.uid() = id );

-- videos policies
create policy if not exists "videos_owner_read"
on public.videos for select
using ( auth.uid() = owner );

create policy if not exists "videos_owner_write"
on public.videos for insert
with check ( auth.uid() = owner );

create policy if not exists "videos_owner_update"
on public.videos for update
using ( auth.uid() = owner )
with check ( auth.uid() = owner );

-- shares policies
create policy if not exists "shares_public_read"
on public.shares for select
using ( true ); -- anyone can read shares to resolve tokens

create policy if not exists "shares_owner_insert"
on public.shares for insert
with check (
  exists (select 1 from public.videos v where v.id = shares.video_id and v.owner = auth.uid())
);

create policy if not exists "shares_owner_delete"
on public.shares for delete
using (
  exists (select 1 from public.videos v where v.id = shares.video_id and v.owner = auth.uid())
);
