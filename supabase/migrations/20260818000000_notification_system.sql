-- ============================================================================
-- In-app notifications.
--
-- Notifications are produced by trusted database triggers so payment webhook
-- retries and enrollment/certificate transactions cannot drift from the UI.
-- Authenticated clients may only read their own rows and update `is_read`.
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles (id)
    on delete cascade,
  type text not null
    check (
      type in (
        'payment_success',
        'enrollment',
        'course_completed',
        'certificate_issued'
      )
    ),
  title text not null
    check (char_length(btrim(title)) between 1 and 160),
  content text not null
    check (char_length(btrim(content)) between 1 and 1000),
  link text
    check (
      link is null
      or (
        char_length(link) between 1 and 500
        and left(link, 1) = '/'
        and left(link, 2) <> '//'
      )
    ),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc, id);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;

alter table public.notifications enable row level security;

revoke all on table public.notifications
  from public, anon, authenticated, service_role;

grant select on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notifications to service_role;

create policy "notifications_select_own"
on public.notifications for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notifications_update_read_state_own"
on public.notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Payment notifications are emitted only on the first transition to succeeded.
create or replace function private.notify_payment_succeeded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if new.status <> 'succeeded' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from 'succeeded' then
    return new;
  end if;

  select customer_order.user_id
  into target_user_id
  from public.orders customer_order
  where customer_order.id = new.order_id;

  if target_user_id is null then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    content,
    link
  )
  values (
    target_user_id,
    'payment_success',
    'Thanh toán thành công',
    'Thanh toán của bạn đã được xác nhận. Các khóa học đã mua hiện có trong tài khoản.',
    '/my-courses'
  );

  return new;
end;
$$;

-- Every unique enrollment creates one welcome notification. The enrollment
-- uniqueness constraint already makes payment webhook retries idempotent.
create or replace function private.notify_course_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_title text;
  course_slug text;
begin
  select
    btrim(course.title),
    coalesce(nullif(btrim(course.slug), ''), course.id::text)
  into course_title, course_slug
  from public.courses course
  where course.id = new.course_id;

  if course_title is null then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    content,
    link
  )
  values (
    new.student_id,
    'enrollment',
    'Đã ghi danh khóa học',
    left(
      'Bạn đã ghi danh vào “' || course_title || '”. Bắt đầu học ngay hôm nay.',
      1000
    ),
    '/courses/' || course_slug
  );

  return new;
end;
$$;

-- Completion fires once when completed_at changes from null to a timestamp.
create or replace function private.notify_course_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_title text;
begin
  if old.completed_at is not null or new.completed_at is null then
    return new;
  end if;

  select btrim(course.title)
  into course_title
  from public.courses course
  where course.id = new.course_id;

  if course_title is null then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    content,
    link
  )
  values (
    new.student_id,
    'course_completed',
    'Chúc mừng bạn đã hoàn thành khóa học',
    left(
      'Bạn đã hoàn thành “' || course_title || '”. Thành tích mới đã được lưu.',
      1000
    ),
    '/my-courses'
  );

  return new;
end;
$$;

create or replace function private.notify_certificate_issued()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    content,
    link
  )
  values (
    new.student_id,
    'certificate_issued',
    'Chứng chỉ mới đã sẵn sàng',
    left(
      'Bạn đã được cấp chứng chỉ hoàn thành “' || btrim(new.course_title) || '”.',
      1000
    ),
    '/certificates/' || new.certificate_code
  );

  return new;
end;
$$;

revoke all on function private.notify_payment_succeeded()
  from public, anon, authenticated;
revoke all on function private.notify_course_enrollment()
  from public, anon, authenticated;
revoke all on function private.notify_course_completed()
  from public, anon, authenticated;
revoke all on function private.notify_certificate_issued()
  from public, anon, authenticated;

drop trigger if exists notification_after_payment_success on public.payments;
create trigger notification_after_payment_success
after insert or update of status on public.payments
for each row execute function private.notify_payment_succeeded();

drop trigger if exists notification_after_enrollment on public.enrollments;
create trigger notification_after_enrollment
after insert on public.enrollments
for each row execute function private.notify_course_enrollment();

drop trigger if exists notification_after_course_completion on public.enrollments;
create trigger notification_after_course_completion
after update of completed_at on public.enrollments
for each row execute function private.notify_course_completed();

drop trigger if exists notification_after_certificate_issued on public.certificates;
create trigger notification_after_certificate_issued
after insert on public.certificates
for each row execute function private.notify_certificate_issued();

-- Postgres Changes is sufficient for the current notification volume. The
-- user_id filter plus RLS ensures each browser receives only its own rows.
do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_publication publication
    where publication.pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables published_table
    where published_table.pubname = 'supabase_realtime'
      and published_table.schemaname = 'public'
      and published_table.tablename = 'notifications'
  ) then
    alter publication supabase_realtime
      add table public.notifications;
  end if;
end;
$$;

comment on table public.notifications is
  'User-owned in-app notifications emitted transactionally from learning and commerce events.';
