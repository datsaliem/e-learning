-- ============================================================================
-- Admin user management.
--
-- - Exposes a paginated, filtered admin-only projection of Auth users.
-- - Keeps role mutations out of the browser by removing role column UPDATE
--   privileges from authenticated clients.
-- - Stores an append-only audit trail for account blocks and role changes.
-- ============================================================================

-- 1. Append-only audit events. Identity and email are snapshots rather than
-- foreign keys so the history remains useful if an Auth user is later removed.
create table public.admin_user_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_email text not null,
  target_user_id uuid not null,
  target_email text not null,
  action text not null
    check (
      action in (
        'account_blocked',
        'account_unblocked',
        'role_changed'
      )
    ),
  old_values jsonb not null default '{}'::jsonb
    check (jsonb_typeof(old_values) = 'object'),
  new_values jsonb not null default '{}'::jsonb
    check (jsonb_typeof(new_values) = 'object'),
  reason text not null
    check (char_length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default statement_timestamp()
);

create index admin_user_audit_logs_target_created_idx
  on public.admin_user_audit_logs (target_user_id, created_at desc);

create index admin_user_audit_logs_actor_created_idx
  on public.admin_user_audit_logs (actor_id, created_at desc);

alter table public.admin_user_audit_logs enable row level security;

revoke all on table public.admin_user_audit_logs
  from public, anon, authenticated, service_role;
grant select on table public.admin_user_audit_logs to authenticated;
grant select, insert on table public.admin_user_audit_logs to service_role;

create policy "admin_user_audit_logs_select_admin"
on public.admin_user_audit_logs for select
to authenticated
using ((select public.is_admin()));

comment on table public.admin_user_audit_logs is
  'Append-only audit trail for privileged user-management actions.';

-- Browser clients may still edit regular profile fields through the existing
-- ownership/admin RLS policies, but role changes must use trusted server code.
revoke update on table public.profiles from authenticated;
grant update (
  full_name,
  avatar_url,
  phone,
  headline,
  bio,
  website
) on table public.profiles to authenticated;

-- 2. Admin-only list projection. Email and ban state live in auth.users, while
-- public profile data and platform counters live in public tables.
create or replace function public.get_admin_users(
  p_search text default null,
  p_role text default null,
  p_status text default null,
  p_page integer default 1,
  p_per_page integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_search text := lower(nullif(btrim(p_search), ''));
  effective_page integer := greatest(coalesce(p_page, 1), 1);
  effective_per_page integer := least(greatest(coalesce(p_per_page, 10), 5), 50);
begin
  if actor_id is null
    or not exists (
      select 1
      from public.profiles actor_profile
      join auth.users actor_auth on actor_auth.id = actor_profile.id
      where actor_profile.id = actor_id
        and actor_profile.role = 'admin'
        and (
          actor_auth.banned_until is null
          or actor_auth.banned_until <= statement_timestamp()
        )
    )
  then
    raise exception 'Admin authentication required'
      using errcode = '42501';
  end if;

  if normalized_search is not null and char_length(normalized_search) > 100 then
    raise exception 'Search query is too long'
      using errcode = '22023';
  end if;

  if p_role is not null
    and p_role not in ('student', 'instructor', 'admin')
  then
    raise exception 'Invalid role filter'
      using errcode = '22023';
  end if;

  if p_status is not null
    and p_status not in ('active', 'blocked', 'unverified')
  then
    raise exception 'Invalid status filter'
      using errcode = '22023';
  end if;

  return (
    with base_users as materialized (
      select
        auth_user.id,
        coalesce(auth_user.email, '') as email,
        profile.full_name,
        profile.avatar_url,
        profile.phone,
        profile.headline,
        profile.bio,
        profile.website,
        coalesce(profile.role, 'student') as role,
        case
          when auth_user.banned_until > statement_timestamp() then 'blocked'
          when auth_user.email_confirmed_at is null then 'unverified'
          else 'active'
        end as account_status,
        auth_user.email_confirmed_at,
        auth_user.last_sign_in_at,
        auth_user.banned_until,
        auth_user.created_at,
        (
          select count(*)::integer
          from public.enrollments enrollment
          where enrollment.student_id = auth_user.id
        ) as enrollment_count,
        (
          select count(*)::integer
          from public.courses course
          where course.instructor_id = auth_user.id
        ) as course_count
      from auth.users auth_user
      left join public.profiles profile on profile.id = auth_user.id
    ),
    filtered_users as materialized (
      select *
      from base_users listed_user
      where (
          normalized_search is null
          or position(normalized_search in lower(listed_user.email)) > 0
          or position(
            normalized_search in lower(coalesce(listed_user.full_name, ''))
          ) > 0
          or position(
            normalized_search in lower(coalesce(listed_user.phone, ''))
          ) > 0
        )
        and (p_role is null or listed_user.role = p_role)
        and (p_status is null or listed_user.account_status = p_status)
    ),
    paged_users as (
      select *
      from filtered_users listed_user
      order by listed_user.created_at desc, listed_user.id
      offset (effective_page - 1) * effective_per_page
      limit effective_per_page
    ),
    result_stats as (
      select count(*)::integer as total
      from filtered_users
    )
    select jsonb_build_object(
      'users',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', listed_user.id,
              'email', listed_user.email,
              'fullName', listed_user.full_name,
              'avatarUrl', listed_user.avatar_url,
              'phone', listed_user.phone,
              'headline', listed_user.headline,
              'bio', listed_user.bio,
              'website', listed_user.website,
              'role', listed_user.role,
              'status', listed_user.account_status,
              'emailConfirmedAt', listed_user.email_confirmed_at,
              'lastSignInAt', listed_user.last_sign_in_at,
              'bannedUntil', listed_user.banned_until,
              'createdAt', listed_user.created_at,
              'enrollmentCount', listed_user.enrollment_count,
              'courseCount', listed_user.course_count
            )
            order by listed_user.created_at desc, listed_user.id
          )
          from paged_users listed_user
        ),
        '[]'::jsonb
      ),
      'pagination',
      (
        select jsonb_build_object(
          'page', effective_page,
          'perPage', effective_per_page,
          'total', result_stats.total,
          'totalPages',
          case
            when result_stats.total = 0 then 0
            else ceil(result_stats.total::numeric / effective_per_page)::integer
          end
        )
        from result_stats
      )
    )
  );
end;
$$;

comment on function public.get_admin_users(text, text, text, integer, integer) is
  'Returns paginated Auth and profile data exclusively to an active admin.';

revoke all on function public.get_admin_users(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_users(text, text, text, integer, integer)
  to authenticated;
