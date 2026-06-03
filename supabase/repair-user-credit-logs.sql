create table if not exists public.user_credit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  change_amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason_code text not null,
  reason_label text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists user_credit_logs_user_created_idx
  on public.user_credit_logs (user_id, created_at desc);
