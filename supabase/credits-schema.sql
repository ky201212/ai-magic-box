create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.phone_otps (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  send_count integer not null default 1,
  first_sent_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_credits (
  user_id uuid primary key references public.users(id) on delete cascade,
  credits integer not null default 50 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_credits(
  p_user_id uuid,
  p_cost integer
)
returns table(success boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, credits)
  values (p_user_id, 50)
  on conflict (user_id) do nothing;

  update public.user_credits
  set
    credits = credits - p_cost,
    updated_at = now()
  where user_id = p_user_id
    and credits >= p_cost;

  if found then
    return query
    select true, credits
    from public.user_credits
    where user_id = p_user_id;
  else
    return query
    select false, credits
    from public.user_credits
    where user_id = p_user_id;
  end if;
end;
$$;
