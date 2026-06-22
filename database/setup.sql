-- Run this once in Supabase: SQL Editor > New query > paste and Run.
-- In Authentication settings, disable public sign-ups; invite leaders yourself.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'leader', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_leader() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('leader', 'admin'));
$$;

create table if not exists public.site_content (
  content_key text primary key,
  content_value jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.factions (
  id bigint generated always as identity primary key,
  name text not null,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.factions enable row level security;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "public reads site content" on public.site_content for select using (true);
create policy "leaders update site content" on public.site_content for all using (public.is_leader()) with check (public.is_leader());
create policy "public reads factions" on public.factions for select using (true);
create policy "leaders manage factions" on public.factions for all using (public.is_leader()) with check (public.is_leader());

insert into storage.buckets (id, name, public) values ('scw-images', 'scw-images', true) on conflict (id) do nothing;
create policy "public reads SCW images" on storage.objects for select using (bucket_id = 'scw-images');
create policy "leaders manage SCW images" on storage.objects for all using (bucket_id = 'scw-images' and public.is_leader()) with check (bucket_id = 'scw-images' and public.is_leader());
