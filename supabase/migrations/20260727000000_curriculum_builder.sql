-- ============================================================================
-- Curriculum Builder: CRUD nội dung, bốn loại lesson và sắp xếp nguyên tử.
-- ============================================================================

-- Giữ cột position để tương thích dữ liệu cũ, nhưng sort_order là nguồn dữ
-- liệu chuẩn cho toàn bộ code mới.
alter table public.course_sections
  add column if not exists sort_order integer;

update public.course_sections
set sort_order = position
where sort_order is null;

alter table public.course_sections
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.course_sections
  add constraint course_sections_sort_order_non_negative
  check (sort_order >= 0);

alter table public.lessons
  add column if not exists sort_order integer,
  add column if not exists content_path text,
  add column if not exists external_url text,
  add column if not exists is_preview boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

update public.lessons
set sort_order = position
where sort_order is null;

update public.lessons
set lesson_type = 'text'
where lesson_type = 'article';

alter table public.lessons
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.lessons drop constraint if exists lessons_type_check;
alter table public.lessons
  add constraint lessons_type_check
    check (lesson_type in ('video', 'text', 'pdf', 'external_link')),
  add constraint lessons_sort_order_non_negative
    check (sort_order >= 0),
  add constraint lessons_external_url_format
    check (
      external_url is null
      or external_url ~* '^https?://[^[:space:]]+$'
    );

-- Các lesson cũ chưa thuộc section được gom vào một section mặc định trước
-- khi section_id trở thành bắt buộc.
insert into public.course_sections (course_id, title, position, sort_order)
select distinct l.course_id, 'Nội dung khoá học', 0, 0
from public.lessons l
where l.section_id is null
  and not exists (
    select 1
    from public.course_sections s
    where s.course_id = l.course_id
  );

update public.lessons l
set section_id = (
  select s.id
  from public.course_sections s
  where s.course_id = l.course_id
  order by s.sort_order, s.created_at
  limit 1
)
where l.section_id is null;

alter table public.lessons
  alter column section_id set not null;

alter table public.lesson_resources
  add column if not exists sort_order integer;

update public.lesson_resources
set sort_order = position
where sort_order is null;

alter table public.lesson_resources
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.lesson_resources
  add constraint lesson_resources_sort_order_non_negative
  check (sort_order >= 0);

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create index if not exists course_sections_course_sort_idx
  on public.course_sections (course_id, sort_order);

create index if not exists lessons_section_sort_idx
  on public.lessons (section_id, sort_order);

create index if not exists lesson_resources_lesson_sort_idx
  on public.lesson_resources (lesson_id, sort_order);

-- Sắp xếp section trong một transaction. Hàm chạy security invoker nên mọi
-- UPDATE bên trong vẫn chịu RLS của user đang đăng nhập.
create or replace function public.reorder_course_sections(
  target_course_id uuid,
  ordered_section_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  expected_count integer;
  supplied_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not (public.owns_course(target_course_id) or public.is_admin()) then
    raise exception 'course ownership required';
  end if;

  select count(*) into expected_count
  from public.course_sections
  where course_id = target_course_id;

  supplied_count := coalesce(cardinality(ordered_section_ids), 0);

  if supplied_count <> expected_count then
    raise exception 'section list is incomplete';
  end if;

  if (
    select count(distinct supplied.section_id)
    from unnest(coalesce(ordered_section_ids, array[]::uuid[])) as supplied(section_id)
  ) <> supplied_count then
    raise exception 'section list contains duplicates';
  end if;

  if exists (
    select 1
    from unnest(coalesce(ordered_section_ids, array[]::uuid[])) as supplied(section_id)
    where not exists (
      select 1
      from public.course_sections s
      where s.id = supplied.section_id
        and s.course_id = target_course_id
    )
  ) then
    raise exception 'section does not belong to course';
  end if;

  update public.course_sections s
  set sort_order = (ordered.ordinality - 1)::integer,
      position = (ordered.ordinality - 1)::integer
  from unnest(ordered_section_ids) with ordinality as ordered(id, ordinality)
  where s.id = ordered.id
    and s.course_id = target_course_id;
end;
$$;

-- Payload: [{"section_id":"uuid","lesson_ids":["uuid", ...]}, ...].
-- Toàn bộ lesson phải xuất hiện đúng một lần, nhờ đó một lần kéo-thả có thể
-- đổi cả section_id lẫn sort_order mà không để database ở trạng thái dở dang.
create or replace function public.reorder_course_lessons(
  target_course_id uuid,
  section_payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  expected_section_count integer;
  supplied_section_count integer;
  expected_lesson_count integer;
  supplied_lesson_count integer;
  section_entry jsonb;
  target_section_id uuid;
  lesson_value text;
  lesson_index integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not (public.owns_course(target_course_id) or public.is_admin()) then
    raise exception 'course ownership required';
  end if;

  if section_payload is null or jsonb_typeof(section_payload) <> 'array' then
    raise exception 'invalid lesson order payload';
  end if;

  select count(*) into expected_section_count
  from public.course_sections
  where course_id = target_course_id;

  select count(*) into supplied_section_count
  from jsonb_array_elements(section_payload);

  if supplied_section_count <> expected_section_count then
    raise exception 'section payload is incomplete';
  end if;

  if (
    select count(distinct (entry.value ->> 'section_id')::uuid)
    from jsonb_array_elements(section_payload) as entry(value)
  ) <> supplied_section_count then
    raise exception 'section payload contains duplicates';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(section_payload) as entry(value)
    where not exists (
      select 1
      from public.course_sections s
      where s.id = (entry.value ->> 'section_id')::uuid
        and s.course_id = target_course_id
    )
  ) then
    raise exception 'section does not belong to course';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(section_payload) as entry(value)
    where jsonb_typeof(entry.value -> 'lesson_ids') <> 'array'
  ) then
    raise exception 'lesson_ids must be arrays';
  end if;

  select count(*) into expected_lesson_count
  from public.lessons
  where course_id = target_course_id;

  select count(*) into supplied_lesson_count
  from jsonb_array_elements(section_payload) as section_entry(value)
  cross join lateral jsonb_array_elements_text(section_entry.value -> 'lesson_ids') as lesson(value);

  if supplied_lesson_count <> expected_lesson_count then
    raise exception 'lesson list is incomplete';
  end if;

  if (
    select count(distinct lesson.value::uuid)
    from jsonb_array_elements(section_payload) as section_entry(value)
    cross join lateral jsonb_array_elements_text(section_entry.value -> 'lesson_ids') as lesson(value)
  ) <> supplied_lesson_count then
    raise exception 'lesson list contains duplicates';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(section_payload) as section_entry(value)
    cross join lateral jsonb_array_elements_text(section_entry.value -> 'lesson_ids') as lesson(value)
    where not exists (
      select 1
      from public.lessons l
      where l.id = lesson.value::uuid
        and l.course_id = target_course_id
    )
  ) then
    raise exception 'lesson does not belong to course';
  end if;

  for section_entry in
    select value from jsonb_array_elements(section_payload)
  loop
    target_section_id := (section_entry ->> 'section_id')::uuid;
    lesson_index := 0;

    for lesson_value in
      select value
      from jsonb_array_elements_text(section_entry -> 'lesson_ids')
    loop
      update public.lessons
      set section_id = target_section_id,
          sort_order = lesson_index,
          position = lesson_index
      where id = lesson_value::uuid
        and course_id = target_course_id;

      lesson_index := lesson_index + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function public.reorder_course_sections(uuid, uuid[]) from public;
revoke all on function public.reorder_course_lessons(uuid, jsonb) from public;
grant execute on function public.reorder_course_sections(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_course_lessons(uuid, jsonb) to authenticated;

-- Data API mới không tự cấp quyền cho bảng/hàm; khai báo tường minh và để
-- RLS hiện có quyết định instructor nào được phép thao tác từng row.
grant select, insert, update, delete on public.course_sections to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_resources to authenticated;
