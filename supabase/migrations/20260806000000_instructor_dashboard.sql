-- ============================================================================
-- Instructor dashboard metrics and course reviews.
--
-- Dashboard data is exposed through one aggregate-only RPC. The function does
-- not accept an instructor id: it derives the scope from auth.uid() and rejects
-- every non-instructor caller before reading any data.
-- ============================================================================

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (
    comment is null
    or char_length(btrim(comment)) between 1 and 2000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_reviews_student_course_unique unique (student_id, course_id)
);

comment on table public.course_reviews is
  'One enrollment-backed rating per student and course.';

create index course_reviews_course_created_idx
  on public.course_reviews (course_id, created_at desc);

create index courses_instructor_updated_at_idx
  on public.courses (instructor_id, updated_at desc);

create index enrollments_course_enrolled_at_idx
  on public.enrollments (course_id, enrolled_at);

create index order_items_instructor_order_idx
  on public.order_items (instructor_id, order_id);

drop trigger if exists course_reviews_set_updated_at on public.course_reviews;
create trigger course_reviews_set_updated_at
before update on public.course_reviews
for each row execute function public.set_updated_at();

alter table public.course_reviews enable row level security;

-- New public tables do not rely on implicit Data API grants.
revoke all on public.course_reviews from public, anon, authenticated;
grant select on public.course_reviews to anon, authenticated;
grant insert, update, delete on public.course_reviews to authenticated;
grant all on public.course_reviews to service_role;

create policy "course_reviews_select_authorized"
on public.course_reviews for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.status = 'published'
  )
  or public.owns_course(course_id)
  or public.is_admin()
);

create policy "course_reviews_insert_authorized"
on public.course_reviews for insert
to authenticated
with check (
  (
    student_id = (select auth.uid())
    and (select public.current_role()) = 'student'
    and public.is_enrolled(course_id)
  )
  or public.is_admin()
);

create policy "course_reviews_update_authorized"
on public.course_reviews for update
to authenticated
using (
  (
    student_id = (select auth.uid())
    and (select public.current_role()) = 'student'
    and public.is_enrolled(course_id)
  )
  or public.is_admin()
)
with check (
  (
    student_id = (select auth.uid())
    and (select public.current_role()) = 'student'
    and public.is_enrolled(course_id)
  )
  or public.is_admin()
);

create policy "course_reviews_delete_authorized"
on public.course_reviews for delete
to authenticated
using (
  (
    student_id = (select auth.uid())
    and (select public.current_role()) = 'student'
  )
  or public.is_admin()
);

create or replace function public.get_instructor_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  instructor_user_id uuid := auth.uid();
  first_period date := (
    date_trunc('month', statement_timestamp()) - interval '11 months'
  )::date;
begin
  if instructor_user_id is null
    or not exists (
      select 1
      from public.profiles profile
      where profile.id = instructor_user_id
        and profile.role = 'instructor'
    )
  then
    raise exception 'Instructor authentication required'
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
    owned_courses as materialized (
      select
        course.id,
        course.title,
        course.slug,
        course.status,
        course.thumbnail_url,
        course.created_at,
        course.updated_at
      from public.courses course
      where course.instructor_id = instructor_user_id
    ),
    owned_enrollments as materialized (
      select
        enrollment.id,
        enrollment.course_id,
        enrollment.student_id,
        enrollment.enrolled_at,
        enrollment.progress_percent,
        enrollment.completed_at
      from public.enrollments enrollment
      join owned_courses course on course.id = enrollment.course_id
    ),
    paid_sales as materialized (
      select
        item.course_id,
        item.unit_amount * item.quantity::bigint as amount,
        purchase.paid_at
      from public.order_items item
      join owned_courses course on course.id = item.course_id
      join public.orders purchase on purchase.id = item.order_id
      where item.instructor_id = instructor_user_id
        and purchase.status = 'paid'
        and purchase.paid_at is not null
    ),
    owned_reviews as materialized (
      select review.course_id, review.rating
      from public.course_reviews review
      join owned_courses course on course.id = review.course_id
    ),
    enrollment_by_course as (
      select
        enrollment.course_id,
        count(*)::integer as students_count,
        count(*) filter (
          where enrollment.completed_at is not null
            or enrollment.progress_percent = 100
        )::integer as completed_count
      from owned_enrollments enrollment
      group by enrollment.course_id
    ),
    revenue_by_course as (
      select
        sale.course_id,
        coalesce(sum(sale.amount), 0)::bigint as revenue
      from paid_sales sale
      group by sale.course_id
    ),
    reviews_by_course as (
      select
        review.course_id,
        round(avg(review.rating)::numeric, 2) as average_rating,
        count(*)::integer as review_count
      from owned_reviews review
      group by review.course_id
    ),
    enrollment_by_period as (
      select
        date_trunc('month', enrollment.enrolled_at)::date as period,
        count(*)::integer as value
      from owned_enrollments enrollment
      where enrollment.enrolled_at >= first_period
        and enrollment.enrolled_at < first_period + interval '12 months'
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
    recent_courses as (
      select course.*
      from owned_courses course
      order by course.updated_at desc, course.created_at desc, course.id
      limit 5
    )
    select jsonb_build_object(
      'metrics',
      jsonb_build_object(
        'totalCourses',
        (select count(*)::integer from owned_courses),
        'totalStudents',
        (
          select count(distinct enrollment.student_id)::integer
          from owned_enrollments enrollment
        ),
        'totalEnrollments',
        (select count(*)::integer from owned_enrollments),
        'totalRevenue',
        (select coalesce(sum(sale.amount), 0)::bigint from paid_sales sale),
        'averageRating',
        (
          select round(avg(review.rating)::numeric, 2)
          from owned_reviews review
        ),
        'reviewCount',
        (select count(*)::integer from owned_reviews),
        'completionRate',
        (
          select coalesce(
            round(
              count(*) filter (
                where enrollment.completed_at is not null
                  or enrollment.progress_percent = 100
              )::numeric
              * 100
              / nullif(count(*), 0),
              1
            ),
            0
          )
          from owned_enrollments enrollment
        )
      ),
      'enrollmentSeries',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'period', to_char(period.period, 'YYYY-MM-DD'),
              'value', coalesce(enrollment.value, 0)
            )
            order by period.period
          ),
          '[]'::jsonb
        )
        from periods period
        left join enrollment_by_period enrollment using (period)
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
      'recentCourses',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', course.id,
              'title', course.title,
              'slug', course.slug,
              'status', course.status,
              'thumbnailUrl', course.thumbnail_url,
              'createdAt', course.created_at,
              'updatedAt', course.updated_at,
              'studentsCount', coalesce(enrollment.students_count, 0),
              'revenue', coalesce(revenue.revenue, 0),
              'averageRating', review.average_rating,
              'reviewCount', coalesce(review.review_count, 0),
              'completionRate',
              case
                when coalesce(enrollment.students_count, 0) = 0 then 0
                else round(
                  enrollment.completed_count::numeric
                  * 100
                  / enrollment.students_count,
                  1
                )
              end
            )
            order by course.updated_at desc, course.created_at desc, course.id
          ),
          '[]'::jsonb
        )
        from recent_courses course
        left join enrollment_by_course enrollment on enrollment.course_id = course.id
        left join revenue_by_course revenue on revenue.course_id = course.id
        left join reviews_by_course review on review.course_id = course.id
      )
    )
  );
end;
$$;

comment on function public.get_instructor_dashboard() is
  'Returns aggregate dashboard data scoped exclusively to the authenticated instructor.';

revoke all on function public.get_instructor_dashboard() from public, anon;
grant execute on function public.get_instructor_dashboard() to authenticated;
