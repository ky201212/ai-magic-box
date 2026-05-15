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

alter table public.community_posts
  add column if not exists moderation_stage text not null default 'rule' check (moderation_stage in ('rule', 'ai', 'fallback', 'manual')),
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists is_featured boolean not null default false,
  add column if not exists moderation_detail jsonb not null default '{}'::jsonb;

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text,
  avatar_color text not null default '#8b5cf6',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_post_activity_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  activity_type text not null check (activity_type in ('view', 'like', 'unlike', 'share', 'admin_adjust')),
  delta_value integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_status_created_idx
  on public.community_posts (moderation_status, created_at desc);

create index if not exists community_posts_status_reviewed_idx
  on public.community_posts (moderation_status, reviewed_at desc);

create index if not exists community_post_activity_logs_post_created_idx
  on public.community_post_activity_logs (post_id, created_at desc);

create index if not exists community_post_activity_logs_user_created_idx
  on public.community_post_activity_logs (user_id, created_at desc);

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
