-- ============================================================================
-- Lesson resource uploads: vòng đời upload và MIME cho video/tài liệu/hình ảnh.
-- ============================================================================

alter table public.lesson_resources
  add column if not exists upload_status text not null default 'ready',
  add column if not exists updated_at timestamptz not null default now();

alter table public.lesson_resources
  drop constraint if exists lesson_resources_upload_status_check;

alter table public.lesson_resources
  add constraint lesson_resources_upload_status_check
    check (upload_status in ('uploading', 'ready'));

create unique index if not exists lesson_resources_storage_path_unique_idx
  on public.lesson_resources (storage_path);

create index if not exists lesson_resources_lesson_status_sort_idx
  on public.lesson_resources (lesson_id, upload_status, sort_order);

drop trigger if exists lesson_resources_set_updated_at on public.lesson_resources;
create trigger lesson_resources_set_updated_at
before update on public.lesson_resources
for each row execute function public.set_updated_at();

-- Học viên chỉ thấy metadata của file đã upload và xác minh xong. Instructor
-- sở hữu course vẫn thấy được bản ghi "uploading" để có thể hoàn tất hoặc xoá.
drop policy if exists "resources_select_enrolled_student" on public.lesson_resources;
create policy "resources_select_enrolled_student"
on public.lesson_resources for select
to authenticated
using (
  upload_status = 'ready'
  and exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.is_enrolled(l.course_id)
  )
);

-- Bucket vẫn riêng tư. Giới hạn bucket là lớp phòng vệ cuối cùng; giới hạn
-- nhỏ hơn theo từng MIME được kiểm tra ở client và kiểm tra lại trong action.
update storage.buckets
set file_size_limit = 524288000,
    allowed_mime_types = array[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
      'application/zip',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif'
    ]
where id = 'course-content';
