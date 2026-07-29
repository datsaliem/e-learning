-- ============================================================================
-- Hierarchical course categories managed by administrators.
--
-- `courses.category` remains as a synchronized slug shadow for compatibility
-- with existing catalog queries. `courses.category_id` is the authoritative
-- relationship and prevents deleting a category that is still in use.
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid,
  name text not null
    check (char_length(btrim(name)) between 2 and 80),
  slug text not null
    check (
      char_length(slug) between 2 and 100
      and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  icon text not null default 'folder'
    check (
      char_length(icon) between 1 and 64
      and icon ~ '^[a-z][a-z0-9-]*$'
    ),
  sort_order integer not null default 0
    check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_key unique (slug),
  constraint categories_parent_not_self
    check (parent_id is null or parent_id <> id),
  constraint categories_parent_id_fkey
    foreign key (parent_id)
    references public.categories (id)
    on delete restrict
);

create index categories_parent_sort_idx
  on public.categories (parent_id, sort_order, created_at);

create index categories_active_sort_idx
  on public.categories (is_active, sort_order, created_at);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- Reject self-parenting and cycles at the database boundary, including writes
-- that do not originate from the admin UI.
create or replace function private.validate_category_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A category cannot be its own parent'
      using errcode = '23514',
            detail = 'CATEGORY_PARENT_SELF';
  end if;

  if not exists (
    select 1
    from public.categories parent_category
    where parent_category.id = new.parent_id
  ) then
    raise exception 'Parent category does not exist'
      using errcode = '23503',
            detail = 'CATEGORY_PARENT_NOT_FOUND';
  end if;

  if exists (
    with recursive ancestors as (
      select category.id, category.parent_id
      from public.categories category
      where category.id = new.parent_id

      union all

      select parent_category.id, parent_category.parent_id
      from public.categories parent_category
      join ancestors child
        on parent_category.id = child.parent_id
    )
    select 1
    from ancestors
    where ancestors.id = new.id
  ) then
    raise exception 'Category hierarchy would contain a cycle'
      using errcode = '23514',
            detail = 'CATEGORY_PARENT_CYCLE';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_validate_parent on public.categories;
create trigger categories_validate_parent
before insert or update of parent_id on public.categories
for each row execute function private.validate_category_parent();

-- Preserve the taxonomy that was previously hard-coded in the application.
insert into public.categories (name, slug, icon, sort_order, is_active)
values
  ('Lập trình', 'lap-trinh', 'code-2', 0, true),
  ('Thiết kế', 'thiet-ke', 'palette', 1, true),
  ('Kinh doanh', 'kinh-doanh', 'briefcase', 2, true),
  ('Marketing', 'marketing', 'chart-no-axes-combined', 3, true),
  ('Ngoại ngữ', 'ngoai-ngu', 'languages', 4, true),
  ('Kỹ năng mềm', 'ky-nang-mem', 'users', 5, true)
on conflict (slug) do nothing;

alter table public.courses
  add column if not exists category_id uuid;

-- Any pre-existing custom text category is retained as a generated legacy
-- category instead of losing its relationship during the migration.
with legacy_categories as (
  select distinct
    btrim(course.category) as category_name,
    case btrim(course.category)
      when 'Lập trình' then 'lap-trinh'
      when 'Thiết kế' then 'thiet-ke'
      when 'Kinh doanh' then 'kinh-doanh'
      when 'Marketing' then 'marketing'
      when 'Ngoại ngữ' then 'ngoai-ngu'
      when 'Kỹ năng mềm' then 'ky-nang-mem'
      else
        case
          when lower(btrim(course.category)) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
            then lower(btrim(course.category))
          else 'legacy-' || substr(md5(btrim(course.category)), 1, 16)
        end
    end as category_slug
  from public.courses course
  where course.category is not null
    and btrim(course.category) <> ''
),
missing_categories as (
  select
    legacy.category_name,
    legacy.category_slug,
    1000 + row_number() over (order by legacy.category_slug) as generated_order
  from legacy_categories legacy
  where not exists (
    select 1
    from public.categories category
    where category.slug = legacy.category_slug
  )
)
insert into public.categories (name, slug, icon, sort_order, is_active)
select
  left(missing.category_name, 80),
  missing.category_slug,
  'folder',
  missing.generated_order,
  true
from missing_categories missing
on conflict (slug) do nothing;

update public.courses course
set category_id = category.id,
    category = category.slug
from public.categories category
where course.category_id is null
  and course.category is not null
  and category.slug = case btrim(course.category)
    when 'Lập trình' then 'lap-trinh'
    when 'Thiết kế' then 'thiet-ke'
    when 'Kinh doanh' then 'kinh-doanh'
    when 'Marketing' then 'marketing'
    when 'Ngoại ngữ' then 'ngoai-ngu'
    when 'Kỹ năng mềm' then 'ky-nang-mem'
    else
      case
        when lower(btrim(course.category)) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
          then lower(btrim(course.category))
        else 'legacy-' || substr(md5(btrim(course.category)), 1, 16)
      end
  end;

alter table public.courses
  drop constraint if exists courses_category_id_fkey;

alter table public.courses
  add constraint courses_category_id_fkey
  foreign key (category_id)
  references public.categories (id)
  on delete restrict;

create index if not exists courses_category_id_idx
  on public.courses (category_id);

-- Resolve legacy slug writes and keep the text shadow synchronized with the
-- authoritative foreign key.
create or replace function private.sync_course_category_reference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  resolved_category_id uuid;
  resolved_slug text;
begin
  if tg_op = 'UPDATE'
    and new.category is distinct from old.category
    and new.category_id is not distinct from old.category_id
    and new.category is not null
    and btrim(new.category) <> ''
  then
    select category.id, category.slug
    into resolved_category_id, resolved_slug
    from public.categories category
    where category.slug = lower(btrim(new.category));
  elsif new.category_id is not null then
    select category.id, category.slug
    into resolved_category_id, resolved_slug
    from public.categories category
    where category.id = new.category_id;
  elsif new.category is not null and btrim(new.category) <> '' then
    select category.id, category.slug
    into resolved_category_id, resolved_slug
    from public.categories category
    where category.slug = lower(btrim(new.category));
  else
    new.category_id := null;
    new.category := null;
    return new;
  end if;

  if resolved_category_id is null then
    raise exception 'Course category does not exist or is unavailable'
      using errcode = '23503',
            detail = 'COURSE_CATEGORY_NOT_FOUND';
  end if;

  new.category_id := resolved_category_id;
  new.category := resolved_slug;
  return new;
end;
$$;

drop trigger if exists courses_sync_category_reference on public.courses;
create trigger courses_sync_category_reference
before insert or update of category_id, category on public.courses
for each row execute function private.sync_course_category_reference();

create or replace function private.sync_category_slug_to_courses()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.courses course
  set category = new.slug
  where course.category_id = new.id
    and course.category is distinct from new.slug;

  return new;
end;
$$;

drop trigger if exists categories_sync_course_slug on public.categories;
create trigger categories_sync_course_slug
after update of slug on public.categories
for each row
when (old.slug is distinct from new.slug)
execute function private.sync_category_slug_to_courses();

alter table public.categories enable row level security;

revoke all on table public.categories
  from public, anon, authenticated, service_role;

grant select on table public.categories to anon;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.categories to service_role;

create policy "categories_select_public"
on public.categories for select
to anon
using (is_active);

create policy "categories_select_authenticated"
on public.categories for select
to authenticated
using (is_active or (select public.is_admin()));

create policy "categories_insert_admin"
on public.categories for insert
to authenticated
with check ((select public.is_admin()));

create policy "categories_update_admin"
on public.categories for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "categories_delete_admin"
on public.categories for delete
to authenticated
using ((select public.is_admin()));

-- Reorder one complete sibling group atomically. Requiring every sibling ID
-- exactly once prevents partial or stale clients from corrupting sort_order.
create or replace function public.reorder_categories(
  p_parent_id uuid,
  p_category_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
  supplied_count integer;
begin
  if auth.uid() is null or not (select public.is_admin()) then
    raise exception 'Administrator authentication required'
      using errcode = '42501',
            detail = 'ADMIN_REQUIRED';
  end if;

  if p_parent_id is not null
    and not exists (
      select 1
      from public.categories parent_category
      where parent_category.id = p_parent_id
    )
  then
    raise exception 'Parent category does not exist'
      using errcode = '23503',
            detail = 'CATEGORY_PARENT_NOT_FOUND';
  end if;

  perform 1
  from public.categories category
  where category.parent_id is not distinct from p_parent_id
  for update;

  select count(*)::integer
  into expected_count
  from public.categories category
  where category.parent_id is not distinct from p_parent_id;

  supplied_count := coalesce(cardinality(p_category_ids), 0);

  if supplied_count <> expected_count then
    raise exception 'Category list is incomplete'
      using errcode = '22023',
            detail = 'CATEGORY_ORDER_INCOMPLETE';
  end if;

  if (
    select count(distinct supplied.category_id)
    from unnest(coalesce(p_category_ids, array[]::uuid[]))
      as supplied(category_id)
  ) <> supplied_count
  then
    raise exception 'Category list contains duplicates'
      using errcode = '22023',
            detail = 'CATEGORY_ORDER_DUPLICATE';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_category_ids, array[]::uuid[]))
      as supplied(category_id)
    where not exists (
      select 1
      from public.categories category
      where category.id = supplied.category_id
        and category.parent_id is not distinct from p_parent_id
    )
  )
  then
    raise exception 'Category does not belong to this parent'
      using errcode = '22023',
            detail = 'CATEGORY_ORDER_WRONG_PARENT';
  end if;

  update public.categories category
  set sort_order = (ordered.ordinality - 1)::integer
  from unnest(p_category_ids) with ordinality
    as ordered(category_id, ordinality)
  where category.id = ordered.category_id;
end;
$$;

-- Deleting with a transfer target is one transaction: all courses move first,
-- then the category is removed. Direct DELETE remains protected by both FKs.
create or replace function public.delete_admin_category(
  p_category_id uuid,
  p_transfer_category_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_parent_id uuid;
  child_count integer;
  course_count integer;
begin
  if auth.uid() is null or not (select public.is_admin()) then
    raise exception 'Administrator authentication required'
      using errcode = '42501',
            detail = 'ADMIN_REQUIRED';
  end if;

  select category.parent_id
  into source_parent_id
  from public.categories category
  where category.id = p_category_id
  for update;

  if not found then
    raise exception 'Category does not exist'
      using errcode = 'P0002',
            detail = 'CATEGORY_NOT_FOUND';
  end if;

  select count(*)::integer
  into child_count
  from public.categories category
  where category.parent_id = p_category_id;

  if child_count > 0 then
    raise exception 'Move child categories before deleting this category'
      using errcode = 'P0001',
            detail = 'CATEGORY_HAS_CHILDREN';
  end if;

  select count(*)::integer
  into course_count
  from public.courses course
  where course.category_id = p_category_id;

  if course_count > 0 and p_transfer_category_id is null then
    raise exception 'Move courses before deleting this category'
      using errcode = 'P0001',
            detail = 'CATEGORY_HAS_COURSES';
  end if;

  if p_transfer_category_id is not null then
    if p_transfer_category_id = p_category_id then
      raise exception 'Transfer category must be different'
        using errcode = '22023',
              detail = 'CATEGORY_TRANSFER_SELF';
    end if;

    if not exists (
      select 1
      from public.categories target_category
      where target_category.id = p_transfer_category_id
        and target_category.is_active
    ) then
      raise exception 'Transfer category does not exist or is inactive'
        using errcode = '23503',
              detail = 'CATEGORY_TRANSFER_NOT_FOUND';
    end if;

    update public.courses course
    set category_id = p_transfer_category_id
    where course.category_id = p_category_id;
  end if;

  delete from public.categories category
  where category.id = p_category_id;

  with normalized as (
    select
      category.id,
      row_number() over (
        order by category.sort_order, category.created_at, category.id
      ) - 1 as normalized_order
    from public.categories category
    where category.parent_id is not distinct from source_parent_id
  )
  update public.categories category
  set sort_order = normalized.normalized_order::integer
  from normalized
  where category.id = normalized.id
    and category.sort_order <> normalized.normalized_order;

  return jsonb_build_object(
    'categoryId', p_category_id,
    'transferredCourseCount', course_count
  );
end;
$$;

revoke all on function public.reorder_categories(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.reorder_categories(uuid, uuid[])
  to authenticated;

revoke all on function public.delete_admin_category(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_admin_category(uuid, uuid)
  to authenticated;

comment on table public.categories is
  'Hierarchical taxonomy for course discovery and administration.';

comment on column public.courses.category_id is
  'Authoritative category relationship; courses.category is a synchronized slug shadow.';
