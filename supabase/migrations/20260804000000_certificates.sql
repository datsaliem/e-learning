-- ============================================================================
-- Certificates: progress snapshots, required quizzes, idempotent issuance,
-- and least-privilege access for the Data API.
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.enrollments
  add column progress_percent smallint not null default 0,
  add column completed_at timestamptz;

alter table public.enrollments
  add constraint enrollments_progress_percent_range
  check (progress_percent between 0 and 100);

create table public.course_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  is_required boolean not null default true,
  is_published boolean not null default false,
  passing_score smallint not null default 70 check (passing_score between 1 and 100),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.course_quizzes is
  'Course-level quiz requirements used by trusted grading and certificate eligibility.';

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.course_quizzes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.quiz_attempts is
  'Server-graded quiz attempts. Passing is derived from score and the current quiz threshold.';

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  instructor_id uuid not null references public.profiles (id) on delete restrict,
  certificate_code text not null,
  student_name text not null check (char_length(btrim(student_name)) between 1 and 200),
  course_title text not null check (char_length(btrim(course_title)) between 1 and 200),
  instructor_name text not null check (char_length(btrim(instructor_name)) between 1 and 200),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  constraint certificates_enrollment_unique unique (enrollment_id),
  constraint certificates_student_course_unique unique (student_id, course_id),
  constraint certificates_code_unique unique (certificate_code),
  constraint certificates_code_format check (
    certificate_code ~ '^EL-([A-F0-9]{4}-){5}[A-F0-9]{4}$'
  ),
  constraint certificates_revocation_consistent check (
    (revoked_at is null and revocation_reason is null)
    or (
      revoked_at is not null
      and char_length(btrim(revocation_reason)) between 1 and 500
    )
  )
);

comment on table public.certificates is
  'Immutable certificate identity and display snapshots. Revocation is explicit and auditable.';

create index course_quizzes_course_sort_idx
  on public.course_quizzes (course_id, sort_order);

create index quiz_attempts_quiz_student_idx
  on public.quiz_attempts (quiz_id, student_id, score desc);

create index quiz_attempts_student_idx
  on public.quiz_attempts (student_id);

create index certificates_student_issued_idx
  on public.certificates (student_id, issued_at desc);

create index certificates_course_idx
  on public.certificates (course_id);

-- ---------------------------------------------------------------------------
-- RLS and explicit grants.
-- ---------------------------------------------------------------------------

alter table public.course_quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;

revoke all on public.course_quizzes from public, anon, authenticated;
revoke all on public.quiz_attempts from public, anon, authenticated;
revoke all on public.certificates from public, anon, authenticated;

grant select, insert, update, delete on public.course_quizzes to authenticated;
grant select on public.quiz_attempts to authenticated;
grant select on public.certificates to authenticated;

grant all on public.course_quizzes to service_role;
grant all on public.quiz_attempts to service_role;
grant all on public.certificates to service_role;

-- Progress must only be changed by the validated save_lesson_watch_progress
-- RPC (or a trusted service role), never by writing completed from the client.
revoke insert, update, delete on public.lesson_progress from anon, authenticated;
grant select on public.lesson_progress to authenticated;

-- Enrollment completion fields are trigger-owned.
revoke update on public.enrollments from anon, authenticated;

create policy "course_quizzes_select_enrolled_student"
on public.course_quizzes for select
to authenticated
using (is_published and public.is_enrolled(course_id));

create policy "course_quizzes_select_own_instructor"
on public.course_quizzes for select
to authenticated
using (public.owns_course(course_id));

create policy "course_quizzes_select_admin"
on public.course_quizzes for select
to authenticated
using (public.is_admin());

create policy "course_quizzes_insert_own_instructor"
on public.course_quizzes for insert
to authenticated
with check (public.owns_course(course_id));

create policy "course_quizzes_update_own_instructor"
on public.course_quizzes for update
to authenticated
using (public.owns_course(course_id))
with check (public.owns_course(course_id));

create policy "course_quizzes_delete_own_instructor"
on public.course_quizzes for delete
to authenticated
using (public.owns_course(course_id));

create policy "course_quizzes_manage_admin"
on public.course_quizzes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "quiz_attempts_select_own_student"
on public.quiz_attempts for select
to authenticated
using (student_id = (select auth.uid()));

create policy "quiz_attempts_select_own_instructor"
on public.quiz_attempts for select
to authenticated
using (
  exists (
    select 1
    from public.course_quizzes quiz
    where quiz.id = quiz_id
      and public.owns_course(quiz.course_id)
  )
);

create policy "quiz_attempts_select_admin"
on public.quiz_attempts for select
to authenticated
using (public.is_admin());

create policy "certificates_select_own_student"
on public.certificates for select
to authenticated
using (student_id = (select auth.uid()));

create policy "certificates_select_own_instructor"
on public.certificates for select
to authenticated
using (public.owns_course(course_id));

create policy "certificates_select_admin"
on public.certificates for select
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Trusted issuance functions live outside exposed schemas and are never RPCs.
-- ---------------------------------------------------------------------------

create or replace function private.generate_certificate_code()
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  raw_code text := upper(replace(gen_random_uuid()::text, '-', ''));
begin
  return 'EL-'
    || substr(raw_code, 1, 4) || '-'
    || substr(raw_code, 5, 4) || '-'
    || substr(raw_code, 9, 4) || '-'
    || substr(raw_code, 13, 4) || '-'
    || substr(raw_code, 17, 4) || '-'
    || substr(raw_code, 21, 4);
end;
$$;

create or replace function private.issue_certificate_if_eligible(
  target_enrollment_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  enrollment_record record;
  generated_code text;
  code_attempt integer;
begin
  select
    enrollment.id,
    enrollment.student_id,
    enrollment.course_id,
    enrollment.progress_percent,
    enrollment.expires_at,
    course.instructor_id,
    btrim(course.title) as course_title,
    coalesce(nullif(btrim(student.full_name), ''), 'Học viên') as student_name,
    coalesce(nullif(btrim(instructor.full_name), ''), 'Giảng viên') as instructor_name
  into enrollment_record
  from public.enrollments enrollment
  join public.courses course on course.id = enrollment.course_id
  join public.profiles student on student.id = enrollment.student_id
  join public.profiles instructor on instructor.id = course.instructor_id
  where enrollment.id = target_enrollment_id
  for update of enrollment;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.certificates certificate
    where certificate.enrollment_id = target_enrollment_id
  ) then
    return;
  end if;

  if enrollment_record.progress_percent <> 100
    or (
      enrollment_record.expires_at is not null
      and enrollment_record.expires_at <= now()
    )
  then
    return;
  end if;

  if not exists (
    select 1
    from public.lessons lesson
    where lesson.course_id = enrollment_record.course_id
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.course_quizzes quiz
    where quiz.course_id = enrollment_record.course_id
      and quiz.is_required
      and quiz.is_published
      and not exists (
        select 1
        from public.quiz_attempts attempt
        where attempt.quiz_id = quiz.id
          and attempt.student_id = enrollment_record.student_id
          and attempt.completed_at is not null
          and attempt.score >= quiz.passing_score
      )
  ) then
    return;
  end if;

  for code_attempt in 1..5 loop
    generated_code := private.generate_certificate_code();

    begin
      insert into public.certificates (
        enrollment_id,
        student_id,
        course_id,
        instructor_id,
        certificate_code,
        student_name,
        course_title,
        instructor_name,
        issued_at
      )
      values (
        enrollment_record.id,
        enrollment_record.student_id,
        enrollment_record.course_id,
        enrollment_record.instructor_id,
        generated_code,
        enrollment_record.student_name,
        enrollment_record.course_title,
        enrollment_record.instructor_name,
        now()
      );

      return;
    exception
      when unique_violation then
        if exists (
          select 1
          from public.certificates certificate
          where certificate.enrollment_id = target_enrollment_id
        ) then
          return;
        end if;
    end;
  end loop;

  raise exception 'could not allocate a unique certificate code';
end;
$$;

create or replace function private.recalculate_enrollment_progress(
  target_enrollment_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_student_id uuid;
  target_course_id uuid;
  total_lessons integer;
  completed_lessons integer;
  calculated_percent smallint;
begin
  select enrollment.student_id, enrollment.course_id
  into target_student_id, target_course_id
  from public.enrollments enrollment
  where enrollment.id = target_enrollment_id;

  if not found then
    return;
  end if;

  select count(*)::integer
  into total_lessons
  from public.lessons lesson
  where lesson.course_id = target_course_id;

  select count(*)::integer
  into completed_lessons
  from public.lessons lesson
  where lesson.course_id = target_course_id
    and exists (
      select 1
      from public.lesson_progress progress
      where progress.lesson_id = lesson.id
        and progress.course_id = target_course_id
        and progress.student_id = target_student_id
        and progress.completed
    );

  calculated_percent := case
    when total_lessons = 0 then 0
    when completed_lessons >= total_lessons then 100
    else floor((completed_lessons::numeric * 100) / total_lessons)::smallint
  end;

  update public.enrollments enrollment
  set progress_percent = calculated_percent,
      completed_at = case
        when calculated_percent = 100 then coalesce(enrollment.completed_at, now())
        else null
      end
  where enrollment.id = target_enrollment_id;

  perform private.issue_certificate_if_eligible(target_enrollment_id);
end;
$$;

create or replace function private.recalculate_course_enrollments(
  target_course_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  enrollment_record record;
begin
  if target_course_id is null then
    return;
  end if;

  for enrollment_record in
    select enrollment.id
    from public.enrollments enrollment
    where enrollment.course_id = target_course_id
  loop
    perform private.recalculate_enrollment_progress(enrollment_record.id);
  end loop;
end;
$$;

create or replace function private.try_issue_course_certificates(
  target_course_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  enrollment_record record;
begin
  if target_course_id is null then
    return;
  end if;

  for enrollment_record in
    select enrollment.id
    from public.enrollments enrollment
    where enrollment.course_id = target_course_id
  loop
    perform private.issue_certificate_if_eligible(enrollment_record.id);
  end loop;
end;
$$;

create or replace function private.sync_enrollment_after_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_enrollment_id uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select enrollment.id
    into target_enrollment_id
    from public.enrollments enrollment
    where enrollment.student_id = old.student_id
      and enrollment.course_id = old.course_id;

    if target_enrollment_id is not null then
      perform private.recalculate_enrollment_progress(target_enrollment_id);
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and (
      tg_op = 'INSERT'
      or new.student_id is distinct from old.student_id
      or new.course_id is distinct from old.course_id
      or new.completed is distinct from old.completed
    )
  then
    select enrollment.id
    into target_enrollment_id
    from public.enrollments enrollment
    where enrollment.student_id = new.student_id
      and enrollment.course_id = new.course_id;

    if target_enrollment_id is not null then
      perform private.recalculate_enrollment_progress(target_enrollment_id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function private.sync_enrollments_after_lesson_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.recalculate_course_enrollments(old.course_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and (tg_op = 'INSERT' or new.course_id is distinct from old.course_id)
  then
    perform private.recalculate_course_enrollments(new.course_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function private.sync_certificate_after_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_quiz_id uuid;
  target_student_id uuid;
  target_course_id uuid;
  target_enrollment_id uuid;
begin
  target_quiz_id := coalesce(new.quiz_id, old.quiz_id);
  target_student_id := coalesce(new.student_id, old.student_id);

  select quiz.course_id
  into target_course_id
  from public.course_quizzes quiz
  where quiz.id = target_quiz_id;

  if target_course_id is null then
    return coalesce(new, old);
  end if;

  select enrollment.id
  into target_enrollment_id
  from public.enrollments enrollment
  where enrollment.course_id = target_course_id
    and enrollment.student_id = target_student_id;

  if target_enrollment_id is not null then
    perform private.issue_certificate_if_eligible(target_enrollment_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function private.sync_certificates_after_quiz_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.try_issue_course_certificates(old.course_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and (tg_op = 'INSERT' or new.course_id is distinct from old.course_id)
  then
    perform private.try_issue_course_certificates(new.course_id);
  elsif tg_op = 'UPDATE' then
    perform private.try_issue_course_certificates(new.course_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function private.sync_new_enrollment_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.recalculate_enrollment_progress(new.id);
  return new;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;

drop trigger if exists course_quizzes_set_updated_at on public.course_quizzes;
create trigger course_quizzes_set_updated_at
before update on public.course_quizzes
for each row execute function public.set_updated_at();

drop trigger if exists enrollment_progress_after_insert on public.enrollments;
create trigger enrollment_progress_after_insert
after insert on public.enrollments
for each row execute function private.sync_new_enrollment_progress();

drop trigger if exists enrollment_progress_after_lesson_progress on public.lesson_progress;
create trigger enrollment_progress_after_lesson_progress
after insert or update of student_id, course_id, completed or delete
on public.lesson_progress
for each row execute function private.sync_enrollment_after_progress();

drop trigger if exists enrollment_progress_after_lesson_change on public.lessons;
create trigger enrollment_progress_after_lesson_change
after insert or update of course_id or delete
on public.lessons
for each row execute function private.sync_enrollments_after_lesson_change();

drop trigger if exists certificate_after_quiz_attempt on public.quiz_attempts;
create trigger certificate_after_quiz_attempt
after insert or update of quiz_id, student_id, score, completed_at or delete
on public.quiz_attempts
for each row execute function private.sync_certificate_after_quiz_attempt();

drop trigger if exists certificate_after_quiz_change on public.course_quizzes;
create trigger certificate_after_quiz_change
after insert or update of course_id, is_required, is_published, passing_score or delete
on public.course_quizzes
for each row execute function private.sync_certificates_after_quiz_change();

-- Backfill progress and issue any already-eligible certificates.
do $$
declare
  enrollment_record record;
begin
  for enrollment_record in
    select enrollment.id from public.enrollments enrollment
  loop
    perform private.recalculate_enrollment_progress(enrollment_record.id);
  end loop;
end;
$$;
