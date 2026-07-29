-- Cover the nullable reviewer foreign key used by audit investigations.
create index if not exists course_status_history_changed_by_idx
  on public.course_status_history (changed_by)
  where changed_by is not null;

-- A single permissive SELECT policy avoids evaluating two policies for every
-- history row while preserving admin-wide and instructor-owner access.
drop policy if exists "course_status_history_select_admin"
  on public.course_status_history;
drop policy if exists "course_status_history_select_owner"
  on public.course_status_history;

create policy "course_status_history_select_authorized"
on public.course_status_history for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
  )
);
