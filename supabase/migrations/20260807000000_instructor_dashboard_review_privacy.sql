-- Raw review rows include a student id. Keep them out of the anonymous Data
-- API; public rating summaries can be exposed separately without leaking ids.

revoke select on public.course_reviews from anon;

drop policy if exists "course_reviews_select_authorized"
on public.course_reviews;

create policy "course_reviews_select_authorized"
on public.course_reviews for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_course(course_id)
  or public.is_admin()
);
