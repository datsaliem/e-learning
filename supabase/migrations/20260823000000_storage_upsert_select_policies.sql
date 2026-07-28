-- Public buckets bypass RLS only for public object delivery. Storage upsert
-- still needs INSERT + SELECT + UPDATE on storage.objects. These SELECT
-- policies expose only the caller's own avatar rows or media rows belonging to
-- a course owned by that instructor.

drop policy if exists "avatar_select_own_folder" on storage.objects;
create policy "avatar_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "course_media_select_by_owner" on storage.objects;
create policy "course_media_select_by_owner"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-media'
  and exists (
    select 1
    from public.courses course
    where course.id::text = (storage.foldername(name))[1]
      and course.instructor_id = (select auth.uid())
  )
);
