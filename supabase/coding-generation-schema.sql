create table if not exists public.coding_generation_tasks (
  id text primary key,
  status text not null check (status in ('queued', 'processing', 'succeeded', 'failed')),
  mode text null,
  request_id text null,
  request_prompt text null,
  charged_user_id text null,
  credit_cost integer null,
  prompt_preview text not null default '',
  progress_message text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  started_at timestamptz null,
  completed_at timestamptz null,
  partial_code text null,
  code text null,
  error text null,
  degraded boolean not null default false,
  degraded_reason text null,
  model_attempts jsonb null,
  remaining_credits integer null,
  http_status integer null
);

alter table if exists public.coding_generation_tasks
  add column if not exists partial_code text null;

alter table if exists public.coding_generation_tasks
  add column if not exists progress_message text null;

alter table if exists public.coding_generation_tasks
  add column if not exists model_attempts jsonb null;

alter table if exists public.coding_generation_tasks
  add column if not exists mode text null;

alter table if exists public.coding_generation_tasks
  add column if not exists request_id text null;

alter table if exists public.coding_generation_tasks
  add column if not exists request_prompt text null;

alter table if exists public.coding_generation_tasks
  add column if not exists charged_user_id text null;

alter table if exists public.coding_generation_tasks
  add column if not exists credit_cost integer null;

create index if not exists idx_coding_generation_tasks_status
  on public.coding_generation_tasks(status);

create index if not exists idx_coding_generation_tasks_created_at
  on public.coding_generation_tasks(created_at desc);
