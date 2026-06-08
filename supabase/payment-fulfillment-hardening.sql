create extension if not exists pgcrypto;

alter table public.payment_orders
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'fulfilled', 'failed')),
  add column if not exists fulfilled_at timestamptz,
  add column if not exists fulfillment_error text;

update public.payment_orders
set
  fulfillment_status = 'fulfilled',
  fulfilled_at = coalesce(fulfilled_at, paid_at, updated_at)
where status in ('paid', 'refunded')
  and fulfillment_status = 'pending';

create index if not exists payment_orders_fulfillment_idx
  on public.payment_orders (status, fulfillment_status, created_at desc);

do $$
begin
  if exists (
    select 1
    from public.coin_transactions
    where reference_id is not null
    group by type, reference_id
    having count(*) > 1
  ) then
    raise exception 'coin_transactions has duplicate (type, reference_id); please reconcile duplicates before adding the idempotency index.';
  end if;
end;
$$;

create unique index if not exists coin_transactions_type_reference_unique
  on public.coin_transactions (type, reference_id);

create unique index if not exists user_subscriptions_source_reference_unique
  on public.user_subscriptions (source, reference_id)
  where reference_id is not null;

create or replace function public.adjust_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason_code text,
  p_reason_label text,
  p_note text,
  p_reference_id text,
  p_transaction_type text
)
returns table(
  balance_after integer,
  applied boolean,
  transaction_id uuid,
  change_amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_next integer;
  v_delta integer;
  v_transaction_id uuid;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_reference_id is null or length(trim(p_reference_id)) = 0 then
    raise exception 'p_reference_id is required';
  end if;

  if p_transaction_type is null or length(trim(p_transaction_type)) = 0 then
    raise exception 'p_transaction_type is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(concat_ws('|', p_transaction_type, p_reference_id), 0)
  );

  select id
  into v_transaction_id
  from public.coin_transactions
  where type = p_transaction_type
    and reference_id = p_reference_id
  limit 1;

  if v_transaction_id is not null then
    select credits
    into v_current
    from public.user_credits
    where user_id = p_user_id;

    balance_after := coalesce(v_current, 0);
    applied := false;
    transaction_id := v_transaction_id;
    change_amount := 0;
    return next;
    return;
  end if;

  insert into public.user_credits (user_id, credits)
  values (p_user_id, 50)
  on conflict (user_id) do nothing;

  select credits
  into v_current
  from public.user_credits
  where user_id = p_user_id
  for update;

  if p_amount >= 0 then
    v_delta := p_amount;
  else
    v_delta := -least(v_current, abs(p_amount));
  end if;

  v_next := greatest(0, v_current + v_delta);

  update public.user_credits
  set
    credits = v_next,
    updated_at = now()
  where user_id = p_user_id;

  insert into public.user_credit_logs (
    user_id,
    change_amount,
    balance_after,
    reason_code,
    reason_label,
    note
  )
  values (
    p_user_id,
    v_delta,
    v_next,
    coalesce(nullif(trim(p_reason_code), ''), p_transaction_type),
    coalesce(nullif(trim(p_reason_label), ''), p_transaction_type),
    p_note
  );

  insert into public.coin_transactions (
    user_id,
    amount,
    type,
    reference_id,
    balance_after,
    signature
  )
  values (
    p_user_id,
    v_delta,
    p_transaction_type,
    p_reference_id,
    v_next,
    encode(
      digest(
        concat_ws('|', p_user_id::text, v_delta::text, p_transaction_type, p_reference_id, v_next::text),
        'sha256'
      ),
      'hex'
    )
  )
  returning id into v_transaction_id;

  balance_after := v_next;
  applied := true;
  transaction_id := v_transaction_id;
  change_amount := v_delta;
  return next;
end;
$$;
