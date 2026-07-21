-- ============================================================================
-- Learning page: chương, nội dung bài học, tài liệu riêng tư và progress an toàn.
-- ============================================================================

-- Enrollment hết hạn không còn được xem nội dung hoặc ghi tiến độ.
create or replace function public.is_enrolled(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments
    where course_id = target_course_id
      and student_id = auth.uid()
      and (expires_at is null or expires_at > now())
  );
$$;

create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (id, course_id)
);

alter table public.lessons
  add column if not exists section_id uuid,
  add column if not exists lesson_type text not null default 'article',
  add column if not exists video_path text,
  add column if not exists duration_seconds integer not null default 30;

alter table public.lessons
  add constraint lessons_type_check check (lesson_type in ('video', 'article')),
  add constraint lessons_duration_positive check (duration_seconds > 0),
  add constraint lessons_id_course_unique unique (id, course_id),
  add constraint lessons_section_course_fk
    foreign key (section_id, course_id)
    references public.course_sections (id, course_id)
    on delete cascade;

alter table public.lesson_progress
  add constraint lesson_progress_lesson_course_fk
    foreign key (lesson_id, course_id)
    references public.lessons (id, course_id)
    on delete cascade;

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  name text not null,
  storage_path text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

alter table public.course_sections enable row level security;
alter table public.lesson_resources enable row level security;

grant select, insert, update, delete on public.course_sections to authenticated;
grant select, insert, update, delete on public.lesson_resources to authenticated;

create policy "sections_select_enrolled_student"
on public.course_sections for select
to authenticated
using (public.is_enrolled(course_id));

create policy "sections_select_own_instructor"
on public.course_sections for select
to authenticated
using (public.owns_course(course_id));

create policy "sections_select_admin"
on public.course_sections for select
to authenticated
using (public.is_admin());

create policy "sections_insert_own_instructor"
on public.course_sections for insert
to authenticated
with check (public.owns_course(course_id));

create policy "sections_update_own_instructor"
on public.course_sections for update
to authenticated
using (public.owns_course(course_id))
with check (public.owns_course(course_id));

create policy "sections_delete_own_instructor"
on public.course_sections for delete
to authenticated
using (public.owns_course(course_id));

create policy "sections_manage_admin"
on public.course_sections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "resources_select_enrolled_student"
on public.lesson_resources for select
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.is_enrolled(l.course_id)
  )
);

create policy "resources_select_own_instructor"
on public.lesson_resources for select
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.owns_course(l.course_id)
  )
);

create policy "resources_select_admin"
on public.lesson_resources for select
to authenticated
using (public.is_admin());

create policy "resources_insert_own_instructor"
on public.lesson_resources for insert
to authenticated
with check (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.owns_course(l.course_id)
  )
);

create policy "resources_update_own_instructor"
on public.lesson_resources for update
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.owns_course(l.course_id)
  )
)
with check (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.owns_course(l.course_id)
  )
);

create policy "resources_delete_own_instructor"
on public.lesson_resources for delete
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and public.owns_course(l.course_id)
  )
);

create policy "resources_manage_admin"
on public.lesson_resources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Bucket riêng tư: path luôn bắt đầu bằng course_id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-content',
  'course-content',
  false,
  524288000,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/zip',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "course_content_read_with_access"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses c
    where c.id::text = (storage.foldername(name))[1]
      and (
        public.is_enrolled(c.id)
        or public.owns_course(c.id)
        or public.is_admin()
      )
  )
);

create policy "course_content_insert_by_owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses c
    where c.id::text = (storage.foldername(name))[1]
      and (public.owns_course(c.id) or public.is_admin())
  )
);

create policy "course_content_update_by_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses c
    where c.id::text = (storage.foldername(name))[1]
      and (public.owns_course(c.id) or public.is_admin())
  )
)
with check (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses c
    where c.id::text = (storage.foldername(name))[1]
      and (public.owns_course(c.id) or public.is_admin())
  )
);

create policy "course_content_delete_by_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-content'
  and exists (
    select 1
    from public.courses c
    where c.id::text = (storage.foldername(name))[1]
      and (public.owns_course(c.id) or public.is_admin())
  )
);

-- Upsert progress nguyên tử. Client không được tự quyết định completed.
create or replace function public.save_lesson_watch_progress(
  target_course_id uuid,
  target_lesson_id uuid,
  new_watched_seconds integer
)
returns table (saved_watched_seconds integer, is_completed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  lesson_duration integer;
  lesson_kind text;
  normalized_seconds integer;
  completion_threshold integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if public.current_role() <> 'student' then
    raise exception 'student role required';
  end if;

  if not public.is_enrolled(target_course_id) then
    raise exception 'active enrollment required';
  end if;

  select l.duration_seconds, l.lesson_type
  into lesson_duration, lesson_kind
  from public.lessons l
  where l.id = target_lesson_id and l.course_id = target_course_id;

  if not found then
    raise exception 'lesson not found in course';
  end if;

  normalized_seconds := least(greatest(coalesce(new_watched_seconds, 0), 0), lesson_duration);
  completion_threshold := case
    when lesson_kind = 'video' then ceil(lesson_duration * 0.9)::integer
    else lesson_duration
  end;

  insert into public.lesson_progress as progress (
    student_id,
    course_id,
    lesson_id,
    watched_seconds,
    completed,
    updated_at
  )
  values (
    auth.uid(),
    target_course_id,
    target_lesson_id,
    normalized_seconds,
    normalized_seconds >= completion_threshold,
    now()
  )
  on conflict (student_id, lesson_id) do update set
    watched_seconds = greatest(progress.watched_seconds, excluded.watched_seconds),
    completed = progress.completed or greatest(
      progress.watched_seconds,
      excluded.watched_seconds
    ) >= completion_threshold,
    course_id = excluded.course_id,
    updated_at = now();

  return query
  select progress.watched_seconds, progress.completed
  from public.lesson_progress progress
  where progress.student_id = auth.uid()
    and progress.lesson_id = target_lesson_id;
end;
$$;

revoke all on function public.save_lesson_watch_progress(uuid, uuid, integer) from public;
grant execute on function public.save_lesson_watch_progress(uuid, uuid, integer) to authenticated;
