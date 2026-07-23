-- ============================================================================
-- Checkout & payments.
--
-- Stripe is the first provider, but provider identifiers are stored as text so
-- another gateway can be added without changing the order model.
-- All money columns are integer minor units. VND is zero-decimal, therefore
-- 799000 means exactly 799,000 VND.
-- ============================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending' check (
    status in (
      'pending',
      'processing',
      'paid',
      'payment_failed',
      'checkout_failed',
      'cancelled',
      'expired',
      'refunded'
    )
  ),
  currency text not null default 'vnd' check (currency ~ '^[a-z]{3}$'),
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  total_amount bigint not null check (total_amount > 0),
  payment_provider text not null check (
    payment_provider ~ '^[a-z][a-z0-9_-]{1,31}$'
  ),
  cart_fingerprint text not null check (cart_fingerprint ~ '^[a-f0-9]{32}$'),
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_amounts_consistent check (
    subtotal_amount - discount_amount = total_amount
  ),
  constraint orders_checkout_session_length check (
    provider_checkout_session_id is null
    or char_length(provider_checkout_session_id) between 8 and 255
  ),
  constraint orders_payment_intent_length check (
    provider_payment_intent_id is null
    or char_length(provider_payment_intent_id) between 8 and 255
  )
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  instructor_id uuid not null references public.profiles (id) on delete restrict,
  course_title text not null check (char_length(course_title) between 1 and 200),
  course_slug text not null check (char_length(course_slug) between 1 and 200),
  list_amount bigint not null check (list_amount > 0),
  unit_amount bigint not null check (unit_amount > 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  quantity integer not null default 1 check (quantity = 1),
  created_at timestamptz not null default now(),
  constraint order_items_order_course_unique unique (order_id, course_id),
  constraint order_items_amounts_consistent check (
    list_amount - discount_amount = unit_amount
  )
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  provider text not null check (provider ~ '^[a-z][a-z0-9_-]{1,31}$'),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'succeeded', 'failed', 'refunded')
  ),
  amount bigint not null check (amount > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  provider_checkout_session_id text not null,
  provider_payment_intent_id text,
  last_event_id text,
  failure_code text,
  failure_message text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_checkout_session_length check (
    char_length(provider_checkout_session_id) between 8 and 255
  ),
  constraint payments_payment_intent_length check (
    provider_payment_intent_id is null
    or char_length(provider_payment_intent_id) between 8 and 255
  ),
  constraint payments_event_id_length check (
    last_event_id is null or char_length(last_event_id) between 3 and 255
  )
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider ~ '^[a-z][a-z0-9_-]{1,31}$'),
  event_id text not null check (char_length(event_id) between 3 and 255),
  event_type text not null check (char_length(event_type) between 3 and 255),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'processing' check (
    status in ('processing', 'processed', 'failed')
  ),
  attempt_count integer not null default 1 check (attempt_count > 0),
  order_id uuid references public.orders (id) on delete set null,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_webhook_events_provider_event_unique unique (provider, event_id),
  constraint payment_webhook_events_error_length check (
    last_error is null or char_length(last_error) <= 1000
  )
);

create unique index if not exists orders_provider_checkout_session_key
  on public.orders (payment_provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;

create unique index if not exists orders_provider_payment_intent_key
  on public.orders (payment_provider, provider_payment_intent_id)
  where provider_payment_intent_id is not null;

create unique index if not exists orders_one_open_cart_key
  on public.orders (user_id, payment_provider, cart_fingerprint)
  where status in ('pending', 'processing');

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists order_items_course_id_idx
  on public.order_items (course_id);

create unique index if not exists payments_provider_checkout_session_key
  on public.payments (provider, provider_checkout_session_id);

create unique index if not exists payments_provider_payment_intent_key
  on public.payments (provider, provider_payment_intent_id)
  where provider_payment_intent_id is not null;

create index if not exists payment_webhook_events_created_at_idx
  on public.payment_webhook_events (created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists payment_webhook_events_set_updated_at
  on public.payment_webhook_events;
create trigger payment_webhook_events_set_updated_at
before update on public.payment_webhook_events
for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- RLS: authenticated users can only read their own commercial records.
-- Writes are reserved for the trusted server through the service_role role.
-- --------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;

grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.order_items to service_role;
grant select, insert, update, delete on public.payments to service_role;
grant select, insert, update, delete on public.payment_webhook_events to service_role;

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or (select public.is_admin())
      )
  )
);

drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin"
on public.payments for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and (
        o.user_id = (select auth.uid())
        or (select public.is_admin())
      )
  )
);

-- --------------------------------------------------------------------------
-- Create or reuse one open order for an exact cart snapshot. The function is
-- called only by the trusted server. It derives every amount from courses,
-- rejects unavailable/owned courses and inserts order + items atomically.
-- --------------------------------------------------------------------------

create or replace function public.create_checkout_order(
  p_user_id uuid,
  p_course_ids uuid[],
  p_payment_provider text default 'stripe'
)
returns table (
  order_id uuid,
  reused boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_course_ids uuid[];
  v_course_count integer;
  v_subtotal bigint;
  v_total bigint;
  v_discount bigint;
  v_fingerprint text;
  v_order_id uuid;
  v_reused boolean := false;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'checkout user is invalid';
  end if;

  if p_payment_provider is null
    or p_payment_provider !~ '^[a-z][a-z0-9_-]{1,31}$'
  then
    raise exception using
      errcode = '22023',
      message = 'payment provider is invalid';
  end if;

  select coalesce(array_agg(value order by value), array[]::uuid[])
  into v_course_ids
  from (
    select distinct unnest(p_course_ids) as value
  ) requested;

  if cardinality(v_course_ids) < 1 or cardinality(v_course_ids) > 50 then
    raise exception using
      errcode = '22023',
      message = 'checkout requires between 1 and 50 unique courses';
  end if;

  if exists (
    select 1
    from public.enrollments e
    where e.student_id = p_user_id
      and e.course_id = any(v_course_ids)
  ) then
    raise exception using
      errcode = '23505',
      message = 'checkout contains an already-owned course';
  end if;

  if exists (
    select 1
    from public.courses c
    where c.instructor_id = p_user_id
      and c.id = any(v_course_ids)
  ) then
    raise exception using
      errcode = '23505',
      message = 'checkout contains a course owned by the instructor';
  end if;

  select
    count(*)::integer,
    sum(c.price)::bigint,
    sum(coalesce(c.sale_price, c.price))::bigint,
    md5(
      string_agg(
        format('%s:%s:%s', c.id, c.price, coalesce(c.sale_price, c.price)),
        ','
        order by c.id
      )
    )
  into v_course_count, v_subtotal, v_total, v_fingerprint
  from public.courses c
  where c.id = any(v_course_ids)
    and c.status = 'published'
    and coalesce(c.sale_price, c.price) > 0;

  if v_course_count <> cardinality(v_course_ids) then
    raise exception using
      errcode = '22023',
      message = 'checkout contains an unavailable or free course';
  end if;

  v_discount := v_subtotal - v_total;

  -- Release an old partial-unique slot before creating a fresh session.
  update public.orders
  set status = 'expired'
  where user_id = p_user_id
    and payment_provider = p_payment_provider
    and cart_fingerprint = v_fingerprint
    and status in ('pending', 'processing')
    and expires_at <= now();

  insert into public.orders (
    user_id,
    status,
    currency,
    subtotal_amount,
    discount_amount,
    total_amount,
    payment_provider,
    cart_fingerprint,
    expires_at
  )
  values (
    p_user_id,
    'pending',
    'vnd',
    v_subtotal,
    v_discount,
    v_total,
    p_payment_provider,
    v_fingerprint,
    date_trunc('second', now()) + interval '30 minutes'
  )
  on conflict (user_id, payment_provider, cart_fingerprint)
    where status in ('pending', 'processing')
  do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select o.id
    into v_order_id
    from public.orders o
    where o.user_id = p_user_id
      and o.payment_provider = p_payment_provider
      and o.cart_fingerprint = v_fingerprint
      and o.status in ('pending', 'processing')
    order by o.created_at desc
    limit 1;

    if v_order_id is null then
      raise exception 'could not resolve concurrent checkout order';
    end if;

    v_reused := true;
  else
    insert into public.order_items (
      order_id,
      course_id,
      instructor_id,
      course_title,
      course_slug,
      list_amount,
      unit_amount,
      discount_amount
    )
    select
      v_order_id,
      c.id,
      c.instructor_id,
      c.title,
      coalesce(c.slug, c.id::text),
      c.price,
      coalesce(c.sale_price, c.price),
      c.price - coalesce(c.sale_price, c.price)
    from public.courses c
    where c.id = any(v_course_ids)
    order by c.id;
  end if;

  return query select v_order_id, v_reused;
end;
$$;

-- Link the provider session and create the pending payment record atomically.
create or replace function public.link_checkout_session(
  p_order_id uuid,
  p_user_id uuid,
  p_payment_provider text,
  p_checkout_session_id text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_checkout_session_id is null
    or char_length(p_checkout_session_id) not between 8 and 255
  then
    return false;
  end if;

  update public.orders
  set
    provider_checkout_session_id = p_checkout_session_id,
    expires_at = coalesce(p_expires_at, expires_at)
  where id = p_order_id
    and user_id = p_user_id
    and payment_provider = p_payment_provider
    and status in ('pending', 'processing')
    and (
      provider_checkout_session_id is null
      or provider_checkout_session_id = p_checkout_session_id
    )
  returning * into v_order;

  if not found then
    return false;
  end if;

  insert into public.payments (
    order_id,
    provider,
    status,
    amount,
    currency,
    provider_checkout_session_id
  )
  values (
    v_order.id,
    v_order.payment_provider,
    'pending',
    v_order.total_amount,
    v_order.currency,
    p_checkout_session_id
  )
  on conflict (order_id) do update
  set
    provider_checkout_session_id = excluded.provider_checkout_session_id,
    amount = excluded.amount,
    currency = excluded.currency
  where public.payments.status = 'pending';

  return true;
end;
$$;

-- --------------------------------------------------------------------------
-- Process one verified provider event in a single database transaction.
-- The unique provider/event id plus enrollment's existing unique constraint
-- makes webhook retries and concurrent deliveries harmless.
-- --------------------------------------------------------------------------

create or replace function public.process_checkout_payment_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_order_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_payment_status text,
  p_amount_total bigint,
  p_currency text
)
returns table (
  result text,
  processed_order_id uuid,
  enrollment_count integer
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event_row_id uuid;
  v_existing_status text;
  v_existing_hash text;
  v_order public.orders%rowtype;
  v_order_status text;
  v_payment_status text;
  v_enrollment_count integer := 0;
  v_error_message text;
begin
  if p_provider is null or p_provider !~ '^[a-z][a-z0-9_-]{1,31}$'
    or p_event_id is null or char_length(p_event_id) not between 3 and 255
    or p_event_type is null or char_length(p_event_type) not between 3 and 255
    or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
    or p_order_id is null
    or p_checkout_session_id is null
    or char_length(p_checkout_session_id) not between 8 and 255
    or p_amount_total is null or p_amount_total <= 0
    or p_currency is null or p_currency !~ '^[a-z]{3}$'
  then
    raise exception using
      errcode = '22023',
      message = 'payment event payload is invalid';
  end if;

  insert into public.payment_webhook_events (
    provider,
    event_id,
    event_type,
    payload_hash,
    status
  )
  values (
    p_provider,
    p_event_id,
    p_event_type,
    p_payload_hash,
    'processing'
  )
  on conflict (provider, event_id) do nothing
  returning id into v_event_row_id;

  if v_event_row_id is null then
    select e.id, e.status, e.payload_hash
    into v_event_row_id, v_existing_status, v_existing_hash
    from public.payment_webhook_events e
    where e.provider = p_provider
      and e.event_id = p_event_id;

    if v_existing_hash <> p_payload_hash then
      return query select 'payload_mismatch', p_order_id, 0;
      return;
    end if;

    if v_existing_status = 'processed' then
      return query select 'duplicate', p_order_id, 0;
      return;
    end if;

    if v_existing_status = 'processing' then
      return query select 'processing', p_order_id, 0;
      return;
    end if;

    update public.payment_webhook_events
    set
      status = 'processing',
      attempt_count = attempt_count + 1,
      last_error = null,
      processed_at = null
    where id = v_event_row_id;
  end if;

  begin
    select *
    into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
      raise exception 'payment event references an unknown order';
    end if;

    if v_order.payment_provider <> p_provider then
      raise exception 'payment provider does not match order';
    end if;

    if v_order.provider_checkout_session_id is not null
      and v_order.provider_checkout_session_id <> p_checkout_session_id
    then
      raise exception 'checkout session does not match order';
    end if;

    if v_order.total_amount <> p_amount_total
      or v_order.currency <> lower(p_currency)
    then
      raise exception 'payment amount or currency does not match order';
    end if;

    if p_event_type in (
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded'
    ) and p_payment_status = 'paid' then
      v_order_status := 'paid';
      v_payment_status := 'succeeded';
    elsif p_event_type = 'checkout.session.completed' then
      v_order_status := 'processing';
      v_payment_status := 'processing';
    elsif p_event_type = 'checkout.session.async_payment_failed' then
      v_order_status := 'payment_failed';
      v_payment_status := 'failed';
    elsif p_event_type = 'checkout.session.expired' then
      v_order_status := 'expired';
      v_payment_status := 'failed';
    else
      update public.payment_webhook_events
      set
        status = 'processed',
        order_id = p_order_id,
        processed_at = now(),
        last_error = null
      where id = v_event_row_id;

      return query select 'ignored', p_order_id, 0;
      return;
    end if;

    update public.orders
    set
      status = case
        when status in ('paid', 'refunded') then status
        else v_order_status
      end,
      provider_checkout_session_id = coalesce(
        provider_checkout_session_id,
        p_checkout_session_id
      ),
      provider_payment_intent_id = coalesce(
        p_payment_intent_id,
        provider_payment_intent_id
      ),
      paid_at = case
        when v_order_status = 'paid' then coalesce(paid_at, now())
        else paid_at
      end
    where id = p_order_id;

    insert into public.payments (
      order_id,
      provider,
      status,
      amount,
      currency,
      provider_checkout_session_id,
      provider_payment_intent_id,
      last_event_id,
      failure_code,
      failure_message,
      paid_at
    )
    values (
      p_order_id,
      p_provider,
      v_payment_status,
      p_amount_total,
      lower(p_currency),
      p_checkout_session_id,
      p_payment_intent_id,
      p_event_id,
      case
        when p_event_type = 'checkout.session.expired' then 'checkout_expired'
        when p_event_type = 'checkout.session.async_payment_failed' then 'async_payment_failed'
        else null
      end,
      null,
      case when v_payment_status = 'succeeded' then now() else null end
    )
    on conflict (order_id) do update
    set
      status = case
        when public.payments.status in ('succeeded', 'refunded')
          then public.payments.status
        else excluded.status
      end,
      amount = excluded.amount,
      currency = excluded.currency,
      provider_checkout_session_id = excluded.provider_checkout_session_id,
      provider_payment_intent_id = coalesce(
        excluded.provider_payment_intent_id,
        public.payments.provider_payment_intent_id
      ),
      last_event_id = excluded.last_event_id,
      failure_code = case
        when public.payments.status in ('succeeded', 'refunded') then null
        else excluded.failure_code
      end,
      failure_message = case
        when public.payments.status in ('succeeded', 'refunded') then null
        else excluded.failure_message
      end,
      paid_at = case
        when excluded.status = 'succeeded'
          then coalesce(public.payments.paid_at, excluded.paid_at)
        else public.payments.paid_at
      end;

    if v_order_status = 'paid' then
      insert into public.enrollments (student_id, course_id)
      select v_order.user_id, oi.course_id
      from public.order_items oi
      where oi.order_id = p_order_id
      on conflict (student_id, course_id) do nothing;

      get diagnostics v_enrollment_count = row_count;

      delete from public.cart_items ci
      using public.order_items oi
      where oi.order_id = p_order_id
        and ci.user_id = v_order.user_id
        and ci.course_id = oi.course_id::text;
    end if;

    update public.payment_webhook_events
    set
      status = 'processed',
      order_id = p_order_id,
      processed_at = now(),
      last_error = null
    where id = v_event_row_id;

    return query select 'processed', p_order_id, v_enrollment_count;
    return;
  exception
    when others then
      get stacked diagnostics v_error_message = message_text;

      update public.payment_webhook_events
      set
        status = 'failed',
        order_id = p_order_id,
        last_error = left(v_error_message, 1000),
        processed_at = null
      where id = v_event_row_id;

      return query select 'failed', p_order_id, 0;
      return;
  end;
end;
$$;

revoke all on function public.create_checkout_order(uuid, uuid[], text)
  from public, anon, authenticated;
revoke all on function public.link_checkout_session(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.process_checkout_payment_event(
  text, text, text, text, uuid, text, text, text, bigint, text
) from public, anon, authenticated;

grant execute on function public.create_checkout_order(uuid, uuid[], text)
  to service_role;
grant execute on function public.link_checkout_session(uuid, uuid, text, text, timestamptz)
  to service_role;
grant execute on function public.process_checkout_payment_event(
  text, text, text, text, uuid, text, text, text, bigint, text
) to service_role;

comment on table public.orders is
  'Immutable checkout totals plus provider lifecycle for one purchase attempt.';
comment on table public.order_items is
  'Course title and price snapshots captured before redirecting to payment.';
comment on table public.payment_webhook_events is
  'Idempotency ledger for verified provider webhook events; raw payload is not stored.';
comment on function public.process_checkout_payment_event(
  text, text, text, text, uuid, text, text, text, bigint, text
) is
  'Atomically records a verified event, updates payment/order and creates unique enrollments.';
