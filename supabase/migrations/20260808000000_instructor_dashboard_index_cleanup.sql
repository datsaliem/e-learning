-- The dashboard's composite indexes retain the same leading columns as these
-- older single-column indexes, so they cover the existing lookup patterns too.

drop index if exists public.courses_instructor_id_idx;
drop index if exists public.enrollments_course_id_idx;
drop index if exists public.order_items_instructor_id_idx;
