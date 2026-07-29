-- ============================================================================
-- Security/performance hardening theo Supabase Database Advisors.
-- ============================================================================

-- Public bucket vẫn phục vụ object URL mà không cần SELECT policy rộng trên
-- storage.objects. Xoá policy này ngăn client liệt kê toàn bộ object.
drop policy if exists "avatar_public_read" on storage.objects;
drop policy if exists "course_media_public_read" on storage.objects;

-- Các trigger function không bao giờ được gọi trực tiếp qua Data API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_self_escalation() from public, anon, authenticated;

-- Event-trigger helper do Supabase quản lý có thể không tồn tại trong mọi môi
-- trường local, vì vậy chỉ revoke khi function hiện diện.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Anonymous request không cần gọi các helper RLS. Authenticated vẫn cần quyền
-- EXECUTE để policy có thể đánh giá role/quyền sở hữu của chính user đó.
revoke execute on function public.current_role() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_instructor() from anon;
revoke execute on function public.is_enrolled(uuid) from anon;
revoke execute on function public.owns_course(uuid) from anon;

-- Index các foreign key thường xuyên xuất hiện trong RLS và truy vấn builder.
create index if not exists courses_instructor_id_idx
  on public.courses (instructor_id);

create index if not exists enrollments_course_id_idx
  on public.enrollments (course_id);

create index if not exists lesson_progress_course_id_idx
  on public.lesson_progress (course_id);

create index if not exists lesson_progress_lesson_course_idx
  on public.lesson_progress (lesson_id, course_id);

create index if not exists lessons_course_id_idx
  on public.lessons (course_id);

create index if not exists lessons_section_course_idx
  on public.lessons (section_id, course_id);
