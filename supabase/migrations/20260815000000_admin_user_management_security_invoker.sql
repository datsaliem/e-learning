-- Keep privileged Auth reads in a non-exposed schema. The public API function
-- is SECURITY INVOKER and delegates to this private implementation, which
-- still derives and validates the caller through auth.uid().
alter function public.get_admin_users(text, text, text, integer, integer)
  set schema private;

revoke all on function private.get_admin_users(text, text, text, integer, integer)
  from public, anon, authenticated;

-- `private` is not exposed through PostgREST. USAGE + EXECUTE are required only
-- so the authenticated invoker can cross the public wrapper boundary.
grant usage on schema private to authenticated;
grant execute on function private.get_admin_users(text, text, text, integer, integer)
  to authenticated;

create function public.get_admin_users(
  p_search text default null,
  p_role text default null,
  p_status text default null,
  p_page integer default 1,
  p_per_page integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_admin_users(
    p_search,
    p_role,
    p_status,
    p_page,
    p_per_page
  );
$$;

comment on function public.get_admin_users(text, text, text, integer, integer) is
  'Security-invoker API wrapper for the private admin-only user projection.';

revoke all on function public.get_admin_users(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_users(text, text, text, integer, integer)
  to authenticated;
