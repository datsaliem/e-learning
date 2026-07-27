-- ============================================================================
-- Repair the commerce/enrollment foundation used by production.
--
-- 1. Backfill profiles for Auth users created before the signup trigger.
-- 2. Only free published courses may be self-enrolled; paid courses must come
--    through the verified payment workflow.
-- 3. Expose a deliberately small, read-only public catalog/curriculum API so
--    newly published database courses can replace mock-only commerce data.
-- ============================================================================

-- Existing users predate on_auth_user_created in the deployed project. Derive
-- privileged roles only from trusted app_metadata; user-controlled metadata
-- must never be able to elevate a role.
insert into public.profiles (id, full_name, role, created_at)
select
  auth_user.id,
  nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
  case
    when auth_user.raw_app_meta_data ->> 'role' in ('student', 'instructor', 'admin')
      then auth_user.raw_app_meta_data ->> 'role'
    else 'student'
  end,
  auth_user.created_at
from auth.users auth_user
on conflict (id) do nothing;

-- Keep future signups idempotent and schema-qualified.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, created_at)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    'student',
    new.created_at
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Remove broad default table grants. RLS still decides which rows each caller
-- may access, while these grants define the permitted operations explicitly.
revoke all on public.profiles from anon, authenticated;
revoke all on public.courses from anon, authenticated;
revoke all on public.enrollments from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.courses to anon;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, delete on public.enrollments to authenticated;

-- A client may self-enroll only when the effective price is zero. Paid course
-- enrollment is created exclusively by process_checkout_payment_event after a
-- verified provider event.
drop policy if exists "enrollments_insert_self_student" on public.enrollments;
create policy "enrollments_insert_self_student"
on public.enrollments for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and (select public.current_role()) = 'student'
  and exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.status = 'published'
      and coalesce(course.sale_price, course.price) = 0
  )
);

-- Public catalog projection. It intentionally omits profile phone/private
-- fields, lesson content, media storage paths and moderation feedback.
create or replace function public.get_published_course_catalog(
  p_slug text default null,
  p_course_id uuid default null,
  p_limit integer default 50
)
returns table (
  course_id uuid,
  slug text,
  title text,
  short_description text,
  full_description text,
  category text,
  level text,
  language text,
  thumbnail_url text,
  trailer_url text,
  price bigint,
  sale_price bigint,
  published_at timestamptz,
  instructor_id uuid,
  instructor_name text,
  instructor_avatar_url text,
  instructor_headline text,
  instructor_bio text,
  student_count bigint,
  lesson_count bigint,
  duration_seconds bigint,
  review_count bigint,
  rating numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    course.id,
    coalesce(course.slug, course.id::text),
    course.title,
    coalesce(course.short_description, ''),
    coalesce(course.description, ''),
    coalesce(course.category, 'khoa-hoc'),
    course.level,
    course.language,
    course.thumbnail_url,
    course.trailer_url,
    course.price,
    course.sale_price,
    coalesce(course.published_at, course.updated_at, course.created_at),
    instructor.id,
    coalesce(nullif(btrim(instructor.full_name), ''), 'Giảng viên E-Learning'),
    instructor.avatar_url,
    coalesce(instructor.headline, ''),
    coalesce(instructor.bio, ''),
    coalesce(enrollment_stats.student_count, 0),
    coalesce(lesson_stats.lesson_count, 0),
    coalesce(lesson_stats.duration_seconds, 0),
    coalesce(review_stats.review_count, 0),
    coalesce(review_stats.rating, 0)
  from public.courses course
  join public.profiles instructor on instructor.id = course.instructor_id
  left join lateral (
    select count(*)::bigint as student_count
    from public.enrollments enrollment
    where enrollment.course_id = course.id
  ) enrollment_stats on true
  left join lateral (
    select
      count(*)::bigint as lesson_count,
      coalesce(sum(lesson.duration_seconds), 0)::bigint as duration_seconds
    from public.lessons lesson
    where lesson.course_id = course.id
  ) lesson_stats on true
  left join lateral (
    select
      count(*)::bigint as review_count,
      coalesce(round(avg(review.rating)::numeric, 1), 0) as rating
    from public.course_reviews review
    where review.course_id = course.id
  ) review_stats on true
  where course.status = 'published'
    and (p_slug is null or course.slug = p_slug)
    and (p_course_id is null or course.id = p_course_id)
  order by
    coalesce(course.published_at, course.updated_at, course.created_at) desc,
    course.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_published_course_catalog(text, uuid, integer)
  from public;
grant execute on function public.get_published_course_catalog(text, uuid, integer)
  to anon, authenticated;

-- Curriculum outline for a public course. Full text/video/PDF/link content
-- remains protected by the existing lesson RLS policies.
create or replace function public.get_published_course_curriculum(
  p_course_id uuid
)
returns table (
  section_id uuid,
  section_title text,
  section_sort_order integer,
  lesson_id uuid,
  lesson_title text,
  lesson_duration_seconds integer,
  lesson_is_preview boolean,
  lesson_sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    section.id,
    section.title,
    section.sort_order,
    lesson.id,
    lesson.title,
    lesson.duration_seconds,
    lesson.is_preview,
    lesson.sort_order
  from public.courses course
  join public.course_sections section on section.course_id = course.id
  left join public.lessons lesson on lesson.section_id = section.id
  where course.id = p_course_id
    and course.status = 'published'
  order by section.sort_order, section.id, lesson.sort_order, lesson.id;
$$;

revoke all on function public.get_published_course_curriculum(uuid) from public;
grant execute on function public.get_published_course_curriculum(uuid)
  to anon, authenticated;

comment on function public.get_published_course_catalog(text, uuid, integer) is
  'Safe public projection used by the storefront for published database courses.';
comment on function public.get_published_course_curriculum(uuid) is
  'Safe public curriculum outline without protected lesson content or storage paths.';
