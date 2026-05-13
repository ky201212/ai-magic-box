create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mode text not null check (mode in ('coding')),
  title text not null,
  prompt text not null,
  preview_image_url text not null,
  preview_code text not null,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  moderation_reason text,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text,
  avatar_color text not null default '#8b5cf6',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_status_created_idx
  on public.community_posts (moderation_status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_community_posts_updated_at on public.community_posts;
create trigger trg_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.touch_updated_at();
