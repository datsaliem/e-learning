-- ============================================================================
-- Course moderation: state machine, immutable status history and admin feedback.
-- ============================================================================

-- 1. Extend the course workflow without replacing the existing text column.
alter table public.courses
  add column if not exists latest_review_feedback text,
  add column if not exists latest_reviewed_at timestamptz,
  add column if not exists latest_reviewer_id uuid
    references public.profiles (id) on delete set null,
  add column if not exists published_at timestamptz;

alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses
  add constraint courses_status_check
    check (
      status in (
        'draft',
        'pending_review',
        'changes_requested',
        'published',
        'rejected',
        'archived'
      )
    ),
  add constraint courses_review_feedback_length
    check (
      latest_review_feedback is null
      or char_length(btrim(latest_review_feedback)) between 1 and 2000
    );

update public.courses
set published_at = coalesce(updated_at, created_at)
where status = 'published'
  and published_at is null;

create index if not exists courses_status_submitted_idx
  on public.courses (status, submitted_at desc);

create index if not exists courses_latest_reviewer_idx
  on public.courses (latest_reviewer_id)
  where latest_reviewer_id is not null;

-- 2. Append-only audit log. Clients can read authorized rows, but only the
-- private trigger below can insert a status event.
create table if not exists public.course_status_history (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  reason text,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_by_role text not null,
  created_at timestamptz not null default now(),
  constraint course_status_history_from_status_check
    check (
      from_status is null
      or from_status in (
        'draft',
        'pending_review',
        'changes_requested',
        'published',
        'rejected',
        'archived'
      )
    ),
  constraint course_status_history_to_status_check
    check (
      to_status in (
        'draft',
        'pending_review',
        'changes_requested',
        'published',
        'rejected',
        'archived'
      )
    ),
  constraint course_status_history_action_check
    check (
      action in (
        'created',
        'submitted',
        'resubmitted',
        'approved',
        'changes_requested',
        'rejected',
        'archived',
        'restored',
        'status_changed'
      )
    ),
  constraint course_status_history_actor_role_check
    check (changed_by_role in ('instructor', 'admin', 'system')),
  constraint course_status_history_reason_length
    check (reason is null or char_length(btrim(reason)) between 1 and 2000)
);

create index if not exists course_status_history_course_created_idx
  on public.course_status_history (course_id, created_at desc);

alter table public.course_status_history enable row level security;

revoke all on table public.course_status_history from public, anon, authenticated;
grant select on table public.course_status_history to authenticated;
grant select, insert, update, delete on table public.course_status_history to service_role;

create policy "course_status_history_select_admin"
on public.course_status_history for select
to authenticated
using (public.is_admin());

create policy "course_status_history_select_owner"
on public.course_status_history for select
to authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
  )
);

-- Preserve an initial event for courses that existed before this migration.
insert into public.course_status_history (
  course_id,
  from_status,
  to_status,
  action,
  reason,
  changed_by,
  changed_by_role,
  created_at
)
select
  course.id,
  null,
  course.status,
  'created',
  null,
  null,
  'system',
  course.created_at
from public.courses course
where not exists (
  select 1
  from public.course_status_history history
  where history.course_id = course.id
);

-- 3. Validate every status transition at the database boundary. The function
-- lives in a non-exposed schema and derives the actor from auth.uid().
create or replace function private.guard_course_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  editable_statuses constant text[] := array[
    'draft',
    'changes_requested',
    'rejected'
  ];
begin
  if actor_id is null then
    return new;
  end if;

  select profile.role
  into actor_role
  from public.profiles profile
  where profile.id = actor_id;

  if tg_op = 'INSERT' then
    if actor_role = 'instructor' then
      if new.instructor_id <> actor_id or new.status <> 'draft' then
        raise exception 'instructors can only create their own draft courses'
          using errcode = '42501';
      end if;

      new.submitted_at := null;
      new.latest_review_feedback := null;
      new.latest_reviewed_at := null;
      new.latest_reviewer_id := null;
      new.published_at := null;
    elsif actor_role <> 'admin' then
      raise exception 'course creation requires instructor or admin role'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if actor_role = 'instructor' then
    if old.instructor_id <> actor_id or new.instructor_id is distinct from old.instructor_id then
      raise exception 'course ownership cannot be changed by instructor'
        using errcode = '42501';
    end if;

    if new.latest_review_feedback is distinct from old.latest_review_feedback
      or new.latest_reviewed_at is distinct from old.latest_reviewed_at
      or new.latest_reviewer_id is distinct from old.latest_reviewer_id
      or new.published_at is distinct from old.published_at
    then
      raise exception 'moderation metadata is managed by administrators'
        using errcode = '42501';
    end if;

    if new.status = old.status then
      if not (old.status = any(editable_statuses)) then
        raise exception 'course is read-only in its current status'
          using errcode = '42501';
      end if;

      if new.submitted_at is distinct from old.submitted_at then
        raise exception 'submitted_at is managed by the moderation workflow'
          using errcode = '42501';
      end if;

      return new;
    end if;

    if old.status = any(editable_statuses) and new.status = 'pending_review' then
      new.submitted_at := statement_timestamp();
      return new;
    end if;

    raise exception 'invalid instructor course status transition: % -> %', old.status, new.status
      using errcode = '42501';
  end if;

  if actor_role = 'admin' then
    if new.status = old.status then
      if new.latest_review_feedback is distinct from old.latest_review_feedback
        or new.latest_reviewed_at is distinct from old.latest_reviewed_at
        or new.latest_reviewer_id is distinct from old.latest_reviewer_id
        or new.published_at is distinct from old.published_at
      then
        raise exception 'moderation metadata requires a status transition'
          using errcode = '22023';
      end if;

      return new;
    end if;

    if old.status = 'pending_review'
      and new.status in ('published', 'changes_requested', 'rejected')
    then
      if new.status in ('changes_requested', 'rejected')
        and (
          new.latest_review_feedback is null
          or char_length(btrim(new.latest_review_feedback)) < 10
        )
      then
        raise exception 'a moderation reason of at least 10 characters is required'
          using errcode = '22023';
      end if;

      new.latest_review_feedback := case
        when new.status = 'published' then null
        else btrim(new.latest_review_feedback)
      end;
      new.latest_reviewed_at := statement_timestamp();
      new.latest_reviewer_id := actor_id;

      if new.status = 'published' then
        new.published_at := statement_timestamp();
      end if;

      return new;
    end if;

    if old.status = 'published' and new.status = 'archived' then
      return new;
    end if;

    if old.status = 'archived' and new.status = 'published' then
      new.published_at := statement_timestamp();
      return new;
    end if;

    raise exception 'invalid admin course status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  raise exception 'course update requires instructor or admin role'
    using errcode = '42501';
end;
$$;

create or replace function private.audit_course_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  event_action text;
  previous_status text;
begin
  select profile.role
  into actor_role
  from public.profiles profile
  where profile.id = actor_id;

  if tg_op = 'INSERT' then
    previous_status := null;
    event_action := 'created';
  else
    previous_status := old.status;
    event_action := case
      when new.status = 'pending_review' and old.status = 'draft' then 'submitted'
      when new.status = 'pending_review' then 'resubmitted'
      when new.status = 'published' and old.status = 'archived' then 'restored'
      when new.status = 'published' then 'approved'
      when new.status = 'changes_requested' then 'changes_requested'
      when new.status = 'rejected' then 'rejected'
      when new.status = 'archived' then 'archived'
      else 'status_changed'
    end;
  end if;

  insert into public.course_status_history (
    course_id,
    from_status,
    to_status,
    action,
    reason,
    changed_by,
    changed_by_role,
    created_at
  )
  values (
    new.id,
    previous_status,
    new.status,
    event_action,
    case
      when new.status in ('changes_requested', 'rejected')
        then new.latest_review_feedback
      else null
    end,
    actor_id,
    coalesce(actor_role, 'system'),
    statement_timestamp()
  );

  return new;
end;
$$;

revoke all on function private.guard_course_moderation() from public, anon, authenticated;
revoke all on function private.audit_course_status() from public, anon, authenticated;

drop trigger if exists courses_moderation_guard_insert on public.courses;
create trigger courses_moderation_guard_insert
before insert on public.courses
for each row execute function private.guard_course_moderation();

drop trigger if exists courses_moderation_guard_update on public.courses;
create trigger courses_moderation_guard_update
before update on public.courses
for each row execute function private.guard_course_moderation();

drop trigger if exists courses_status_audit_insert on public.courses;
create trigger courses_status_audit_insert
after insert on public.courses
for each row execute function private.audit_course_status();

drop trigger if exists courses_status_audit_update on public.courses;
create trigger courses_status_audit_update
after update of status on public.courses
for each row
when (old.status is distinct from new.status)
execute function private.audit_course_status();

-- 4. Instructors can edit only actionable courses. Admin policies remain
-- unchanged and continue to manage every course.
drop policy if exists "courses_insert_instructor" on public.courses;
create policy "courses_insert_instructor"
on public.courses for insert
to authenticated
with check (
  public.is_instructor()
  and instructor_id = (select auth.uid())
  and status = 'draft'
);

drop policy if exists "courses_update_own_instructor" on public.courses;
create policy "courses_update_own_instructor"
on public.courses for update
to authenticated
using (
  public.is_instructor()
  and instructor_id = (select auth.uid())
  and status in ('draft', 'changes_requested', 'rejected')
)
with check (
  public.is_instructor()
  and instructor_id = (select auth.uid())
  and status in ('draft', 'pending_review', 'changes_requested', 'rejected')
);

drop policy if exists "courses_delete_own_instructor" on public.courses;
create policy "courses_delete_own_instructor"
on public.courses for delete
to authenticated
using (
  public.is_instructor()
  and instructor_id = (select auth.uid())
  and status in ('draft', 'changes_requested', 'rejected')
);

-- Course sections.
drop policy if exists "sections_insert_own_instructor" on public.course_sections;
create policy "sections_insert_own_instructor"
on public.course_sections for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "sections_update_own_instructor" on public.course_sections;
create policy "sections_update_own_instructor"
on public.course_sections for update
to authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
)
with check (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "sections_delete_own_instructor" on public.course_sections;
create policy "sections_delete_own_instructor"
on public.course_sections for delete
to authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

-- Lessons.
drop policy if exists "lessons_insert_own_instructor" on public.lessons;
create policy "lessons_insert_own_instructor"
on public.lessons for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "lessons_update_own_instructor" on public.lessons;
create policy "lessons_update_own_instructor"
on public.lessons for update
to authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
)
with check (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "lessons_delete_own_instructor" on public.lessons;
create policy "lessons_delete_own_instructor"
on public.lessons for delete
to authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

-- Lesson resources.
drop policy if exists "resources_insert_own_instructor" on public.lesson_resources;
create policy "resources_insert_own_instructor"
on public.lesson_resources for insert
to authenticated
with check (
  exists (
    select 1
    from public.lessons lesson
    join public.courses course on course.id = lesson.course_id
    where lesson.id = lesson_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "resources_update_own_instructor" on public.lesson_resources;
create policy "resources_update_own_instructor"
on public.lesson_resources for update
to authenticated
using (
  exists (
    select 1
    from public.lessons lesson
    join public.courses course on course.id = lesson.course_id
    where lesson.id = lesson_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
)
with check (
  exists (
    select 1
    from public.lessons lesson
    join public.courses course on course.id = lesson.course_id
    where lesson.id = lesson_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "resources_delete_own_instructor" on public.lesson_resources;
create policy "resources_delete_own_instructor"
on public.lesson_resources for delete
to authenticated
using (
  exists (
    select 1
    from public.lessons lesson
    join public.courses course on course.id = lesson.course_id
    where lesson.id = lesson_id
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

-- Public thumbnail/trailer bucket writes.
drop policy if exists "course_media_insert_by_owner" on storage.objects;
create policy "course_media_insert_by_owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-media'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "course_media_update_by_owner" on storage.objects;
create policy "course_media_update_by_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'course-media'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
)
with check (
  bucket_id = 'course-media'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

drop policy if exists "course_media_delete_by_owner" on storage.objects;
create policy "course_media_delete_by_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-media'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and course.instructor_id = (select auth.uid())
      and course.status in ('draft', 'changes_requested', 'rejected')
  )
);

-- Private lesson-content bucket writes. Admin keeps maintenance access.
drop policy if exists "course_content_insert_by_owner" on storage.objects;
create policy "course_content_insert_by_owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and (
        (
          course.instructor_id = (select auth.uid())
          and course.status in ('draft', 'changes_requested', 'rejected')
        )
        or public.is_admin()
      )
  )
);

drop policy if exists "course_content_update_by_owner" on storage.objects;
create policy "course_content_update_by_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and (
        (
          course.instructor_id = (select auth.uid())
          and course.status in ('draft', 'changes_requested', 'rejected')
        )
        or public.is_admin()
      )
  )
)
with check (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and (
        (
          course.instructor_id = (select auth.uid())
          and course.status in ('draft', 'changes_requested', 'rejected')
        )
        or public.is_admin()
      )
  )
);

drop policy if exists "course_content_delete_by_owner" on storage.objects;
create policy "course_content_delete_by_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and (
        (
          course.instructor_id = (select auth.uid())
          and course.status in ('draft', 'changes_requested', 'rejected')
        )
        or public.is_admin()
      )
  )
);

comment on table public.course_status_history is
  'Immutable audit trail for course moderation status changes.';

comment on column public.courses.published_at is
  'Timestamp of the most recent transition into published status.';

comment on column public.courses.latest_review_feedback is
  'Most recent administrator feedback for rejected or changes-requested courses.';
