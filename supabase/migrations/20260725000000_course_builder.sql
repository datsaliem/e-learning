-- ============================================================================
-- Course Builder: metadata, workflow duyệt và Storage cho thumbnail/trailer.
-- ============================================================================

-- 1. Bổ sung metadata phục vụ Course Builder.
alter table public.courses
  add column if not exists slug text,
  add column if not exists short_description text,
  add column if not exists category text,
  add column if not exists level text not null default 'beginner',
  add column if not exists language text not null default 'Tiếng Việt',
  add column if not exists thumbnail_url text,
  add column if not exists trailer_url text,
  add column if not exists price bigint not null default 0,
  add column if not exists sale_price bigint,
  add column if not exists submitted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists courses_slug_key on public.courses (slug)
where slug is not null;

alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses
  add constraint courses_status_check
  check (status in ('draft', 'pending_review', 'published', 'archived'));

alter table public.courses
  add constraint courses_slug_format
    check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint courses_level_check
    check (level in ('beginner', 'intermediate', 'advanced')),
  add constraint courses_price_non_negative
    check (price >= 0),
  add constraint courses_sale_price_valid
    check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  add constraint courses_short_description_length
    check (short_description is null or char_length(short_description) <= 220),
  add constraint courses_language_length
    check (char_length(language) between 2 and 50);

-- Tự động cập nhật updated_at khi instructor chỉnh sửa khoá học.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

-- Instructor chỉ có thể tạo bản nháp/gửi duyệt. Việc publish thuộc về admin.
drop policy if exists "courses_insert_instructor" on public.courses;
create policy "courses_insert_instructor"
on public.courses for insert
to authenticated
with check (
  public.is_instructor()
  and instructor_id = auth.uid()
  and status in ('draft', 'pending_review')
);

drop policy if exists "courses_update_own_instructor" on public.courses;
create policy "courses_update_own_instructor"
on public.courses for update
to authenticated
using (public.is_instructor() and instructor_id = auth.uid())
with check (
  public.is_instructor()
  and instructor_id = auth.uid()
  and status in ('draft', 'pending_review')
);

-- 2. Bucket công khai cho thumbnail/trailer. Quy ước path:
--    course-media/{course_id}/thumbnail.ext
--    course-media/{course_id}/trailer.ext
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media',
  'course-media',
  true,
  209715200, -- 200MB, giới hạn nhỏ hơn được kiểm tra theo từng loại ở client
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_media_public_read" on storage.objects;
create policy "course_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'course-media');

-- Chỉ instructor sở hữu course_id ở thư mục đầu tiên mới được ghi media.
drop policy if exists "course_media_insert_by_owner" on storage.objects;
create policy "course_media_insert_by_owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-media'
  and public.is_instructor()
  and exists (
    select 1
    from public.courses
    where id::text = (storage.foldername(name))[1]
      and instructor_id = auth.uid()
  )
);

drop policy if exists "course_media_update_by_owner" on storage.objects;
create policy "course_media_update_by_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'course-media'
  and public.is_instructor()
  and exists (
    select 1
    from public.courses
    where id::text = (storage.foldername(name))[1]
      and instructor_id = auth.uid()
  )
)
with check (
  bucket_id = 'course-media'
  and public.is_instructor()
  and exists (
    select 1
    from public.courses
    where id::text = (storage.foldername(name))[1]
      and instructor_id = auth.uid()
  )
);

drop policy if exists "course_media_delete_by_owner" on storage.objects;
create policy "course_media_delete_by_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-media'
  and public.is_instructor()
  and exists (
    select 1
    from public.courses
    where id::text = (storage.foldername(name))[1]
      and instructor_id = auth.uid()
  )
);
