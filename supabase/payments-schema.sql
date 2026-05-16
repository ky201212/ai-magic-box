create extension if not exists pgcrypto;

create table if not exists public.magic_coin_rate (
  id boolean primary key default true,
  coin_per_yuan integer not null default 10 check (coin_per_yuan > 0),
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint magic_coin_rate_singleton check (id = true)
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_coins integer not null check (daily_coins > 0),
  duration_days integer not null check (duration_days > 0),
  refresh_time time not null default '06:00:00',
  price integer not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  order_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_type text not null check (order_type in ('coin_purchase', 'subscription')),
  amount integer not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  payment_method text not null default 'mock' check (payment_method in ('mock', 'wechat_pc', 'alipay_pc')),
  trade_no text,
  detail jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('recharge', 'subscription_daily', 'exchange_code', 'consume', 'admin_adjust', 'refund', 'signup_bonus')),
  reference_id text not null,
  balance_after integer not null check (balance_after >= 0),
  signature text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  start_date date not null default current_date,
  end_date date not null,
  last_grant_date date,
  source text not null default 'payment' check (source in ('payment', 'activation_code')),
  reference_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_grants (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  grant_date date not null,
  amount integer not null check (amount > 0),
  transaction_id uuid references public.coin_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(subscription_id, grant_date)
);

create table if not exists public.activation_code_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_type text not null check (code_type in ('coin', 'subscription')),
  value text not null,
  quantity integer not null check (quantity > 0),
  expire_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  plain_code text,
  code_preview text not null,
  type text not null check (type in ('coin', 'subscription')),
  value text not null,
  status text not null default 'unused' check (status in ('unused', 'used', 'disabled')),
  used_by_user_id uuid references public.users(id) on delete set null,
  used_at timestamptz,
  batch_id uuid references public.activation_code_batches(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  expire_at timestamptz,
  signature text not null,
  created_at timestamptz not null default now()
);

alter table public.activation_codes
  add column if not exists plain_code text;

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);

create index if not exists payment_orders_status_created_idx
  on public.payment_orders (status, created_at desc);

create index if not exists coin_transactions_user_created_idx
  on public.coin_transactions (user_id, created_at desc);

create index if not exists user_subscriptions_user_status_idx
  on public.user_subscriptions (user_id, status, end_date desc);

create index if not exists activation_codes_batch_status_idx
  on public.activation_codes (batch_id, status);

insert into public.magic_coin_rate (id, coin_per_yuan)
values (true, 10)
on conflict (id) do nothing;

insert into public.subscription_plans (
  name,
  daily_coins,
  duration_days,
  refresh_time,
  price,
  is_active
)
values
  ('基础月卡', 300, 30, '06:00:00', 1900, true),
  ('进阶季卡', 500, 90, '06:00:00', 4900, true)
on conflict do nothing;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_magic_coin_rate_updated_at on public.magic_coin_rate;
create trigger trg_magic_coin_rate_updated_at
before update on public.magic_coin_rate
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_subscription_plans_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_updated_at
before update on public.subscription_plans
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_payment_orders_updated_at on public.payment_orders;
create trigger trg_payment_orders_updated_at
before update on public.payment_orders
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.touch_updated_at();
