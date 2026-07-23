-- ============================================================================
-- Aggregate-only Admin Dashboard.
--
-- The RPC accepts no user id and derives authorization from auth.uid(). It
-- returns platform totals and time-series data without exposing user identities
-- or raw payment records.
-- ============================================================================

create index profiles_role_idx
  on public.profiles (role);

create index profiles_created_at_idx
  on public.profiles (created_at);

create index orders_paid_at_idx
  on public.orders (paid_at)
  where status = 'paid' and paid_at is not null;

create or replace function public.get_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  admin_user_id uuid := auth.uid();
  first_period date := (
    date_trunc('month', statement_timestamp()) - interval '11 months'
  )::date;
begin
  if admin_user_id is null
    or not exists (
      select 1
      from public.profiles profile
      where profile.id = admin_user_id
        and profile.role = 'admin'
    )
  then
    raise exception 'Admin authentication required'
      using errcode = '42501';
  end if;

  return (
    with
    periods as (
      select generate_series(
        first_period::timestamp,
        (first_period + interval '11 months')::timestamp,
        interval '1 month'
      )::date as period
    ),
    paid_orders as materialized (
      select purchase.id, purchase.paid_at
      from public.orders purchase
      where purchase.status = 'paid'
        and purchase.paid_at is not null
    ),
    paid_sales as materialized (
      select
        item.course_id,
        item.quantity,
        item.unit_amount * item.quantity::bigint as amount,
        purchase.paid_at
      from paid_orders purchase
      join public.order_items item on item.order_id = purchase.id
    ),
    users_by_period as (
      select
        date_trunc('month', profile.created_at)::date as period,
        count(*)::integer as value
      from public.profiles profile
      where profile.created_at >= first_period
        and profile.created_at < first_period + interval '12 months'
      group by 1
    ),
    revenue_by_period as (
      select
        date_trunc('month', sale.paid_at)::date as period,
        coalesce(sum(sale.amount), 0)::bigint as value
      from paid_sales sale
      where sale.paid_at >= first_period
        and sale.paid_at < first_period + interval '12 months'
      group by 1
    ),
    best_selling_courses as (
      select
        course.id,
        course.title,
        course.slug,
        course.thumbnail_url,
        sum(sale.quantity)::integer as sales_count,
        coalesce(sum(sale.amount), 0)::bigint as revenue
      from paid_sales sale
      join public.courses course on course.id = sale.course_id
      group by
        course.id,
        course.title,
        course.slug,
        course.thumbnail_url
      order by sales_count desc, revenue desc, course.id
      limit 5
    )
    select jsonb_build_object(
      'metrics',
      jsonb_build_object(
        'totalUsers',
        (select count(*)::integer from public.profiles),
        'totalStudents',
        (
          select count(*)::integer
          from public.profiles profile
          where profile.role = 'student'
        ),
        'totalInstructors',
        (
          select count(*)::integer
          from public.profiles profile
          where profile.role = 'instructor'
        ),
        'totalCourses',
        (select count(*)::integer from public.courses),
        'publishedCourses',
        (
          select count(*)::integer
          from public.courses course
          where course.status = 'published'
        ),
        'totalOrders',
        (select count(*)::integer from public.orders),
        'paidOrders',
        (select count(*)::integer from paid_orders),
        'totalRevenue',
        (select coalesce(sum(sale.amount), 0)::bigint from paid_sales sale),
        'totalEnrollments',
        (select count(*)::integer from public.enrollments)
      ),
      'revenueSeries',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'period', to_char(period.period, 'YYYY-MM-DD'),
              'value', coalesce(revenue.value, 0)
            )
            order by period.period
          ),
          '[]'::jsonb
        )
        from periods period
        left join revenue_by_period revenue using (period)
      ),
      'newUserSeries',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'period', to_char(period.period, 'YYYY-MM-DD'),
              'value', coalesce(new_user.value, 0)
            )
            order by period.period
          ),
          '[]'::jsonb
        )
        from periods period
        left join users_by_period new_user using (period)
      ),
      'bestSellingCourses',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', course.id,
              'title', course.title,
              'slug', course.slug,
              'thumbnailUrl', course.thumbnail_url,
              'salesCount', course.sales_count,
              'revenue', course.revenue
            )
            order by course.sales_count desc, course.revenue desc, course.id
          ),
          '[]'::jsonb
        )
        from best_selling_courses course
      )
    )
  );
end;
$$;

comment on function public.get_admin_dashboard() is
  'Returns aggregate platform metrics exclusively to the authenticated admin.';

revoke all on function public.get_admin_dashboard() from public, anon;
grant execute on function public.get_admin_dashboard() to authenticated;
