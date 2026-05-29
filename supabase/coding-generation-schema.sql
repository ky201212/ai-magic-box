create table if not exists public.coding_generation_tasks (
  id text primary key,
  status text not null check (status in ('queued', 'processing', 'succeeded', 'failed')),
  prompt_preview text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  started_at timestamptz null,
  completed_at timestamptz null,
  code text null,
  error text null,
  degraded boolean not null default false,
  degraded_reason text null,
  remaining_credits integer null,
  http_status integer null
);

create index if not exists idx_coding_generation_tasks_status
  on public.coding_generation_tasks(status);

create index if not exists idx_coding_generation_tasks_created_at
  on public.coding_generation_tasks(created_at desc);
