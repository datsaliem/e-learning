-- Admin-only aggregate used by the category management page. Keeping the
-- function SECURITY INVOKER preserves RLS on both categories and courses.
create or replace function public.get_admin_categories()
returns table (
  id uuid,
  parent_id uuid,
  name text,
  slug text,
  icon text,
  sort_order integer,
  is_active boolean,
  course_count bigint,
  child_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or not (select public.is_admin()) then
    raise exception 'Administrator authentication required'
      using errcode = '42501',
            detail = 'ADMIN_REQUIRED';
  end if;

  return query
  select
    category.id,
    category.parent_id,
    category.name,
    category.slug,
    category.icon,
    category.sort_order,
    category.is_active,
    (
      select count(*)
      from public.courses course
      where course.category_id = category.id
    ) as course_count,
    (
      select count(*)
      from public.categories child
      where child.parent_id = category.id
    ) as child_count,
    category.created_at,
    category.updated_at
  from public.categories category
  order by
    category.parent_id nulls first,
    category.sort_order,
    category.created_at,
    category.id;
end;
$$;

revoke all on function public.get_admin_categories()
  from public, anon, authenticated;
grant execute on function public.get_admin_categories()
  to authenticated;

comment on function public.get_admin_categories() is
  'Returns category hierarchy and aggregate counts exclusively to administrators.';
