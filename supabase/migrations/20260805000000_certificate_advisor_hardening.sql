-- Address advisor findings introduced by the certificate migration.

create index certificates_instructor_idx
  on public.certificates (instructor_id);

-- Anonymous users verify through the exact-code server route, not by reading
-- progress or certificate tables directly through the Data API.
revoke select on public.lesson_progress from anon;

-- One permissive policy per action keeps the same authorization matrix while
-- avoiding repeated policy evaluation for every row.
drop policy if exists "course_quizzes_select_enrolled_student" on public.course_quizzes;
drop policy if exists "course_quizzes_select_own_instructor" on public.course_quizzes;
drop policy if exists "course_quizzes_select_admin" on public.course_quizzes;
drop policy if exists "course_quizzes_insert_own_instructor" on public.course_quizzes;
drop policy if exists "course_quizzes_update_own_instructor" on public.course_quizzes;
drop policy if exists "course_quizzes_delete_own_instructor" on public.course_quizzes;
drop policy if exists "course_quizzes_manage_admin" on public.course_quizzes;

create policy "course_quizzes_select_authorized"
on public.course_quizzes for select
to authenticated
using (
  (is_published and public.is_enrolled(course_id))
  or public.owns_course(course_id)
  or public.is_admin()
);

create policy "course_quizzes_insert_authorized"
on public.course_quizzes for insert
to authenticated
with check (public.owns_course(course_id) or public.is_admin());

create policy "course_quizzes_update_authorized"
on public.course_quizzes for update
to authenticated
using (public.owns_course(course_id) or public.is_admin())
with check (public.owns_course(course_id) or public.is_admin());

create policy "course_quizzes_delete_authorized"
on public.course_quizzes for delete
to authenticated
using (public.owns_course(course_id) or public.is_admin());

drop policy if exists "quiz_attempts_select_own_student" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_own_instructor" on public.quiz_attempts;
drop policy if exists "quiz_attempts_select_admin" on public.quiz_attempts;

create policy "quiz_attempts_select_authorized"
on public.quiz_attempts for select
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.course_quizzes quiz
    where quiz.id = quiz_id
      and public.owns_course(quiz.course_id)
  )
  or public.is_admin()
);

drop policy if exists "certificates_select_own_student" on public.certificates;
drop policy if exists "certificates_select_own_instructor" on public.certificates;
drop policy if exists "certificates_select_admin" on public.certificates;

create policy "certificates_select_authorized"
on public.certificates for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_course(course_id)
  or public.is_admin()
);
