-- Supabase có thể cấp EXECUTE tường minh cho anon qua default privileges khi
-- function được tạo. Revoke cả PUBLIC lẫn anon, rồi chỉ grant RPC nghiệp vụ
-- cho authenticated.

revoke execute on function public.current_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_instructor() from public, anon;
revoke execute on function public.is_enrolled(uuid) from public, anon;
revoke execute on function public.owns_course(uuid) from public, anon;

revoke all on function public.save_lesson_watch_progress(uuid, uuid, integer)
  from public, anon;
grant execute on function public.save_lesson_watch_progress(uuid, uuid, integer)
  to authenticated;

revoke all on function public.reorder_course_sections(uuid, uuid[])
  from public, anon;
grant execute on function public.reorder_course_sections(uuid, uuid[])
  to authenticated;

revoke all on function public.reorder_course_lessons(uuid, jsonb)
  from public, anon;
grant execute on function public.reorder_course_lessons(uuid, jsonb)
  to authenticated;
