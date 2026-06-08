create extension if not exists pgcrypto;

create table if not exists public.rate_limit_buckets (
  key text primary key,
  count integer not null default 0 check (count >= 0),
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_buckets_reset_idx
  on public.rate_limit_buckets (reset_at);

create or replace function public.consume_rate_limit_bucket(
  bucket_key text,
  bucket_limit integer,
  bucket_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  remaining integer
)
language plpgsql
as $$
declare
  current_bucket public.rate_limit_buckets%rowtype;
  next_reset_at timestamptz := now() + make_interval(secs => bucket_window_seconds);
begin
  delete from public.rate_limit_buckets
  where reset_at <= now() - interval '5 minutes';

  select *
  into current_bucket
  from public.rate_limit_buckets
  where key = bucket_key
  for update;

  if not found or current_bucket.reset_at <= now() then
    insert into public.rate_limit_buckets (key, count, reset_at, updated_at)
    values (bucket_key, 1, next_reset_at, now())
    on conflict (key) do update
      set count = 1,
          reset_at = excluded.reset_at,
          updated_at = now();

    allowed := true;
    retry_after_seconds := 0;
    remaining := greatest(0, bucket_limit - 1);
    return next;
    return;
  end if;

  if current_bucket.count >= bucket_limit then
    allowed := false;
    retry_after_seconds := greatest(
      1,
      ceiling(extract(epoch from (current_bucket.reset_at - now())))::integer
    );
    remaining := 0;
    return next;
    return;
  end if;

  update public.rate_limit_buckets
  set count = count + 1,
      updated_at = now()
  where key = bucket_key;

  allowed := true;
  retry_after_seconds := 0;
  remaining := greatest(0, bucket_limit - current_bucket.count - 1);
  return next;
end;
$$;

create table if not exists public.sms_captcha_challenges (
  id uuid primary key default gen_random_uuid(),
  source_ip text not null,
  answer_hash text not null,
  expires_at timestamptz not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_captcha_challenges_expires_idx
  on public.sms_captcha_challenges (expires_at);

create index if not exists sms_captcha_challenges_ip_created_idx
  on public.sms_captcha_challenges (source_ip, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_buckets_updated_at on public.rate_limit_buckets;
create trigger trg_rate_limit_buckets_updated_at
before update on public.rate_limit_buckets
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_sms_captcha_challenges_updated_at on public.sms_captcha_challenges;
create trigger trg_sms_captcha_challenges_updated_at
before update on public.sms_captcha_challenges
for each row
execute function public.touch_updated_at();
