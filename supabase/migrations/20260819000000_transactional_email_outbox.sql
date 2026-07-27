-- ============================================================================
-- Durable transactional email outbox.
--
-- Business transactions only enqueue a local database row. A scheduled Edge
-- Function claims and sends jobs through Resend after the transaction commits,
-- so provider failures never block signup, enrollment, payment, completion, or
-- certificate issuance.
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table private.transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id)
    on delete cascade,
  template text not null
    check (
      template in (
        'welcome',
        'enrollment_confirmation',
        'payment_receipt',
        'course_completion',
        'certificate_issued'
      )
    ),
  recipient_email text not null
    check (
      char_length(recipient_email) between 3 and 320
      and recipient_email = lower(btrim(recipient_email))
      and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    ),
  recipient_name text not null
    check (char_length(btrim(recipient_name)) between 1 and 200),
  subject text not null
    check (char_length(btrim(subject)) between 1 and 200),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  dedupe_key text not null unique
    check (char_length(dedupe_key) between 1 and 256),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'retry', 'sent', 'dead_letter')),
  attempt_count smallint not null default 0
    check (attempt_count between 0 and 20),
  max_attempts smallint not null default 5
    check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  provider_message_id text
    check (
      provider_message_id is null
      or char_length(provider_message_id) between 1 and 255
    ),
  last_error text
    check (last_error is null or char_length(last_error) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint transactional_email_attempts_consistent
    check (attempt_count <= max_attempts),
  constraint transactional_email_lock_consistent
    check (
      (status = 'processing' and locked_at is not null)
      or (status <> 'processing' and locked_at is null)
    ),
  constraint transactional_email_sent_consistent
    check (
      (
        status = 'sent'
        and sent_at is not null
        and provider_message_id is not null
      )
      or (
        status <> 'sent'
        and sent_at is null
      )
    )
);

comment on table private.transactional_email_outbox is
  'Durable server-only queue for transactional emails sent by the Resend worker.';

create index transactional_email_outbox_due_idx
  on private.transactional_email_outbox (next_attempt_at, created_at, id)
  where status in ('pending', 'retry');

create index transactional_email_outbox_stale_processing_idx
  on private.transactional_email_outbox (locked_at)
  where status = 'processing';

create table private.transactional_email_logs (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null
    references private.transactional_email_outbox (id)
    on delete cascade,
  attempt_number smallint not null
    check (attempt_number between 1 and 20),
  status text not null
    check (status in ('sent', 'retry', 'dead_letter')),
  provider_message_id text
    check (
      provider_message_id is null
      or char_length(provider_message_id) between 1 and 255
    ),
  response_status smallint
    check (
      response_status is null
      or response_status between 100 and 599
    ),
  error_message text
    check (error_message is null or char_length(error_message) <= 2000),
  created_at timestamptz not null default now()
);

comment on table private.transactional_email_logs is
  'Immutable audit log containing one row per Resend delivery attempt.';

create index transactional_email_logs_outbox_created_idx
  on private.transactional_email_logs (outbox_id, created_at desc);

alter table private.transactional_email_outbox enable row level security;
alter table private.transactional_email_logs enable row level security;

revoke all on table private.transactional_email_outbox
  from public, anon, authenticated, service_role;
revoke all on table private.transactional_email_logs
  from public, anon, authenticated, service_role;

-- Resolve the destination from Auth on the trusted database side. Browser
-- clients never supply an arbitrary recipient or gain access to this queue.
create or replace function private.enqueue_transactional_email(
  p_user_id uuid,
  p_template text,
  p_subject text,
  p_payload jsonb,
  p_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_name text;
  v_job_id uuid;
begin
  select
    lower(btrim(auth_user.email)),
    coalesce(
      nullif(btrim(profile.full_name), ''),
      nullif(split_part(auth_user.email, '@', 1), ''),
      'Học viên'
    )
  into v_email, v_name
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where auth_user.id = p_user_id;

  if v_email is null or v_email = '' then
    raise warning
      'Transactional email skipped because user % has no email address',
      p_user_id;
    return null;
  end if;

  insert into private.transactional_email_outbox (
    user_id,
    template,
    recipient_email,
    recipient_name,
    subject,
    payload,
    dedupe_key
  )
  values (
    p_user_id,
    p_template,
    v_email,
    v_name,
    left(btrim(p_subject), 200),
    coalesce(p_payload, '{}'::jsonb),
    p_dedupe_key
  )
  on conflict (dedupe_key) do nothing
  returning id into v_job_id;

  if v_job_id is null then
    select email_job.id
    into v_job_id
    from private.transactional_email_outbox email_job
    where email_job.dedupe_key = p_dedupe_key;
  end if;

  return v_job_id;
end;
$$;

create or replace function private.queue_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_transactional_email(
    new.id,
    'welcome',
    'Chào mừng bạn đến với E-Learning',
    jsonb_build_object(
      'fullName',
      coalesce(nullif(btrim(new.full_name), ''), 'Học viên'),
      'role',
      new.role
    ),
    'welcome/' || new.id::text
  );

  return new;
end;
$$;

create or replace function private.queue_enrollment_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_title text;
  v_course_slug text;
begin
  select
    btrim(course.title),
    coalesce(nullif(btrim(course.slug), ''), course.id::text)
  into v_course_title, v_course_slug
  from public.courses course
  where course.id = new.course_id;

  if v_course_title is null then
    return new;
  end if;

  perform private.enqueue_transactional_email(
    new.student_id,
    'enrollment_confirmation',
    'Xác nhận ghi danh: ' || v_course_title,
    jsonb_build_object(
      'enrollmentId',
      new.id,
      'courseId',
      new.course_id,
      'courseTitle',
      v_course_title,
      'courseSlug',
      v_course_slug,
      'enrolledAt',
      new.enrolled_at,
      'expiresAt',
      new.expires_at
    ),
    'enrollment/' || new.id::text
  );

  return new;
end;
$$;

create or replace function private.queue_payment_receipt_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_order_items jsonb;
begin
  if new.status <> 'succeeded' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from 'succeeded' then
    return new;
  end if;

  select
    customer_order.user_id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'title',
          order_item.course_title,
          'slug',
          order_item.course_slug,
          'amount',
          order_item.unit_amount,
          'quantity',
          order_item.quantity
        )
        order by order_item.created_at, order_item.id
      ) filter (where order_item.id is not null),
      '[]'::jsonb
    )
  into v_user_id, v_order_items
  from public.orders customer_order
  left join public.order_items order_item
    on order_item.order_id = customer_order.id
  where customer_order.id = new.order_id
  group by customer_order.user_id;

  if v_user_id is null then
    return new;
  end if;

  perform private.enqueue_transactional_email(
    v_user_id,
    'payment_receipt',
    'Biên nhận thanh toán #' || left(new.order_id::text, 8),
    jsonb_build_object(
      'paymentId',
      new.id,
      'orderId',
      new.order_id,
      'provider',
      new.provider,
      'amount',
      new.amount,
      'currency',
      new.currency,
      'paidAt',
      coalesce(new.paid_at, now()),
      'items',
      v_order_items
    ),
    'payment/' || new.id::text
  );

  return new;
end;
$$;

create or replace function private.queue_course_completion_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_title text;
  v_course_slug text;
begin
  if old.completed_at is not null or new.completed_at is null then
    return new;
  end if;

  select
    btrim(course.title),
    coalesce(nullif(btrim(course.slug), ''), course.id::text)
  into v_course_title, v_course_slug
  from public.courses course
  where course.id = new.course_id;

  if v_course_title is null then
    return new;
  end if;

  perform private.enqueue_transactional_email(
    new.student_id,
    'course_completion',
    'Bạn đã hoàn thành: ' || v_course_title,
    jsonb_build_object(
      'enrollmentId',
      new.id,
      'courseId',
      new.course_id,
      'courseTitle',
      v_course_title,
      'courseSlug',
      v_course_slug,
      'completedAt',
      new.completed_at,
      'progressPercent',
      new.progress_percent
    ),
    'course-completion/' || new.id::text
  );

  return new;
end;
$$;

create or replace function private.queue_certificate_issued_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_transactional_email(
    new.student_id,
    'certificate_issued',
    'Chứng chỉ của bạn đã sẵn sàng',
    jsonb_build_object(
      'certificateId',
      new.id,
      'certificateCode',
      new.certificate_code,
      'studentName',
      new.student_name,
      'courseTitle',
      new.course_title,
      'instructorName',
      new.instructor_name,
      'issuedAt',
      new.issued_at
    ),
    'certificate/' || new.id::text
  );

  return new;
end;
$$;

revoke all on function private.enqueue_transactional_email(uuid, text, text, jsonb, text)
  from public, anon, authenticated, service_role;
revoke all on function private.queue_welcome_email()
  from public, anon, authenticated, service_role;
revoke all on function private.queue_enrollment_confirmation_email()
  from public, anon, authenticated, service_role;
revoke all on function private.queue_payment_receipt_email()
  from public, anon, authenticated, service_role;
revoke all on function private.queue_course_completion_email()
  from public, anon, authenticated, service_role;
revoke all on function private.queue_certificate_issued_email()
  from public, anon, authenticated, service_role;

drop trigger if exists transactional_email_after_profile_created
  on public.profiles;
create trigger transactional_email_after_profile_created
after insert on public.profiles
for each row execute function private.queue_welcome_email();

drop trigger if exists transactional_email_after_enrollment
  on public.enrollments;
create trigger transactional_email_after_enrollment
after insert on public.enrollments
for each row execute function private.queue_enrollment_confirmation_email();

drop trigger if exists transactional_email_after_payment_success
  on public.payments;
create trigger transactional_email_after_payment_success
after insert or update of status on public.payments
for each row execute function private.queue_payment_receipt_email();

drop trigger if exists transactional_email_after_course_completion
  on public.enrollments;
create trigger transactional_email_after_course_completion
after update of completed_at on public.enrollments
for each row execute function private.queue_course_completion_email();

drop trigger if exists transactional_email_after_certificate_issued
  on public.certificates;
create trigger transactional_email_after_certificate_issued
after insert on public.certificates
for each row execute function private.queue_certificate_issued_email();

-- The worker endpoint has custom token authentication because pg_cron is not a
-- user session. The token is generated inside Vault and never committed.
create or replace function public.verify_transactional_email_worker(
  p_token text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_token is not null
    and char_length(p_token) between 32 and 256
    and exists (
      select 1
      from vault.decrypted_secrets secret
      where secret.name = 'transactional_email_worker_token'
        and secret.decrypted_secret = p_token
    );
$$;

-- Recover expired leases, then atomically claim due jobs. SKIP LOCKED makes
-- overlapping cron invocations safe.
create or replace function public.claim_transactional_email_jobs(
  p_limit integer default 10
)
returns table (
  job_id uuid,
  template text,
  recipient_email text,
  recipient_name text,
  subject text,
  payload jsonb,
  dedupe_key text,
  attempt_count smallint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  with recovered_jobs as (
    update private.transactional_email_outbox email_job
    set
      status = case
        when email_job.attempt_count >= email_job.max_attempts
          then 'dead_letter'
        else 'retry'
      end,
      next_attempt_at = now(),
      locked_at = null,
      last_error = 'Worker lease expired before delivery was acknowledged.',
      updated_at = now()
    where email_job.status = 'processing'
      and email_job.locked_at < now() - interval '15 minutes'
    returning
      email_job.id,
      email_job.attempt_count,
      email_job.status,
      email_job.last_error
  )
  insert into private.transactional_email_logs (
    outbox_id,
    attempt_number,
    status,
    error_message
  )
  select
    recovered_job.id,
    recovered_job.attempt_count,
    recovered_job.status,
    recovered_job.last_error
  from recovered_jobs recovered_job;

  return query
  with due_jobs as (
    select email_job.id
    from private.transactional_email_outbox email_job
    where email_job.status in ('pending', 'retry')
      and email_job.next_attempt_at <= now()
      and email_job.attempt_count < email_job.max_attempts
    order by email_job.next_attempt_at, email_job.created_at, email_job.id
    for update skip locked
    limit least(greatest(coalesce(p_limit, 10), 1), 25)
  ),
  claimed_jobs as (
    update private.transactional_email_outbox email_job
    set
      status = 'processing',
      attempt_count = email_job.attempt_count + 1,
      locked_at = now(),
      updated_at = now()
    from due_jobs
    where email_job.id = due_jobs.id
    returning email_job.*
  )
  select
    claimed_job.id,
    claimed_job.template,
    claimed_job.recipient_email,
    claimed_job.recipient_name,
    claimed_job.subject,
    claimed_job.payload,
    claimed_job.dedupe_key,
    claimed_job.attempt_count
  from claimed_jobs claimed_job
  order by claimed_job.next_attempt_at, claimed_job.created_at, claimed_job.id;
end;
$$;

create or replace function public.mark_transactional_email_sent(
  p_job_id uuid,
  p_provider_message_id text,
  p_response_status integer default 200
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_number smallint;
begin
  update private.transactional_email_outbox email_job
  set
    status = 'sent',
    locked_at = null,
    provider_message_id = left(btrim(p_provider_message_id), 255),
    last_error = null,
    sent_at = now(),
    updated_at = now()
  where email_job.id = p_job_id
    and email_job.status = 'processing'
    and nullif(btrim(p_provider_message_id), '') is not null
  returning email_job.attempt_count into v_attempt_number;

  if v_attempt_number is null then
    return false;
  end if;

  insert into private.transactional_email_logs (
    outbox_id,
    attempt_number,
    status,
    provider_message_id,
    response_status
  )
  values (
    p_job_id,
    v_attempt_number,
    'sent',
    left(btrim(p_provider_message_id), 255),
    p_response_status
  );

  return true;
end;
$$;

create or replace function public.mark_transactional_email_failed(
  p_job_id uuid,
  p_error_message text,
  p_response_status integer default null,
  p_retryable boolean default true,
  p_retry_after_seconds integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_number smallint;
  v_max_attempts smallint;
  v_status text;
  v_backoff_seconds integer;
begin
  select email_job.attempt_count, email_job.max_attempts
  into v_attempt_number, v_max_attempts
  from private.transactional_email_outbox email_job
  where email_job.id = p_job_id
    and email_job.status = 'processing'
  for update;

  if v_attempt_number is null then
    return 'ignored';
  end if;

  if not coalesce(p_retryable, true)
    or v_attempt_number >= v_max_attempts
  then
    v_status := 'dead_letter';
    v_backoff_seconds := 0;
  else
    v_status := 'retry';
    v_backoff_seconds := least(
      greatest(
        coalesce(
          p_retry_after_seconds,
          case v_attempt_number
            when 1 then 60
            when 2 then 300
            when 3 then 900
            when 4 then 3600
            else 21600
          end
        ),
        1
      ),
      86400
    );
  end if;

  update private.transactional_email_outbox email_job
  set
    status = v_status,
    next_attempt_at = case
      when v_status = 'retry'
        then now() + make_interval(secs => v_backoff_seconds)
      else email_job.next_attempt_at
    end,
    locked_at = null,
    last_error = left(
      coalesce(nullif(btrim(p_error_message), ''), 'Unknown Resend delivery error.'),
      2000
    ),
    updated_at = now()
  where email_job.id = p_job_id;

  insert into private.transactional_email_logs (
    outbox_id,
    attempt_number,
    status,
    response_status,
    error_message
  )
  values (
    p_job_id,
    v_attempt_number,
    v_status,
    p_response_status,
    left(
      coalesce(nullif(btrim(p_error_message), ''), 'Unknown Resend delivery error.'),
      2000
    )
  );

  return v_status;
end;
$$;

-- Environment-specific setup calls this once after deploying the Edge
-- Function. It rotates no existing token, making repeated deploys idempotent.
create or replace function private.configure_transactional_email_cron(
  p_worker_url text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id bigint;
  v_job_command text;
begin
  if p_worker_url is null
    or char_length(p_worker_url) > 500
    or p_worker_url !~ '^https://[^[:space:]]+/functions/v1/transactional-email-worker$'
  then
    raise exception using
      errcode = '22023',
      message = 'transactional email worker URL is invalid';
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets secret
    where secret.name = 'transactional_email_worker_token'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'transactional_email_worker_token',
      'Custom authentication token for the transactional email cron worker'
    );
  end if;

  perform cron.unschedule(existing_job.jobid)
  from cron.job existing_job
  where existing_job.jobname = 'transactional-email-worker-every-minute';

  v_job_command := format(
    $cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type',
          'application/json',
          'X-Worker-Token',
          (
            select secret.decrypted_secret
            from vault.decrypted_secrets secret
            where secret.name = 'transactional_email_worker_token'
          )
        ),
        body := jsonb_build_object('scheduledAt', now()),
        timeout_milliseconds := 10000
      ) as request_id;
    $cron$,
    p_worker_url
  );

  select cron.schedule(
    'transactional-email-worker-every-minute',
    '* * * * *',
    v_job_command
  )
  into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.verify_transactional_email_worker(text)
  from public, anon, authenticated;
revoke all on function public.claim_transactional_email_jobs(integer)
  from public, anon, authenticated;
revoke all on function public.mark_transactional_email_sent(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.mark_transactional_email_failed(uuid, text, integer, boolean, integer)
  from public, anon, authenticated;

grant execute on function public.verify_transactional_email_worker(text)
  to service_role;
grant execute on function public.claim_transactional_email_jobs(integer)
  to service_role;
grant execute on function public.mark_transactional_email_sent(uuid, text, integer)
  to service_role;
grant execute on function public.mark_transactional_email_failed(uuid, text, integer, boolean, integer)
  to service_role;

revoke all on function private.configure_transactional_email_cron(text)
  from public, anon, authenticated, service_role;

comment on function public.claim_transactional_email_jobs(integer) is
  'Service-role-only worker lease for due transactional email jobs.';
comment on function public.mark_transactional_email_sent(uuid, text, integer) is
  'Service-role-only delivery acknowledgement and audit logging.';
comment on function public.mark_transactional_email_failed(uuid, text, integer, boolean, integer) is
  'Service-role-only retry/dead-letter transition and audit logging.';
