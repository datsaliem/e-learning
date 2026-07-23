-- ============================================================================
-- Shopping cart: giỏ khách nằm ở localStorage, giỏ đã đăng nhập nằm tại đây.
--
-- course_id dùng text có chủ đích trong giai đoạn catalog còn đi qua service
-- layer (mock id như "course-1" và UUID thật đều hợp lệ). Mọi Server Action
-- vẫn xác minh course với catalog trước khi ghi; RLS là lớp bảo vệ cuối cùng.
-- ============================================================================

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null,
  created_at timestamptz not null default now(),
  constraint cart_items_user_course_unique unique (user_id, course_id),
  constraint cart_items_course_id_format check (
    char_length(course_id) between 1 and 128
    and course_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'
  )
);

alter table public.cart_items enable row level security;

revoke all on public.cart_items from anon;
revoke all on public.cart_items from authenticated;
grant select, insert, delete on public.cart_items to authenticated;

drop policy if exists "cart_select_own_or_admin" on public.cart_items;
create policy "cart_select_own_or_admin"
on public.cart_items for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
);

-- Client đã đăng nhập chỉ có thể thêm vào giỏ của chính mình. Với course UUID
-- thật, policy còn chặn course đã ghi danh hoặc do chính user phụ trách.
drop policy if exists "cart_insert_own_unowned_course" on public.cart_items;
create policy "cart_insert_own_unowned_course"
on public.cart_items for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and not exists (
    select 1
    from public.enrollments e
    where e.student_id = (select auth.uid())
      and e.course_id::text = cart_items.course_id
  )
  and not exists (
    select 1
    from public.courses c
    where c.instructor_id = (select auth.uid())
      and c.id::text = cart_items.course_id
  )
);

drop policy if exists "cart_delete_own_or_admin" on public.cart_items;
create policy "cart_delete_own_or_admin"
on public.cart_items for delete
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
);

-- Khi checkout/ghi danh tạo enrollment, course tương ứng tự rời khỏi giỏ.
create or replace function public.remove_enrolled_course_from_cart()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.cart_items
  where user_id = new.student_id
    and course_id = new.course_id::text;
  return new;
end;
$$;

revoke all on function public.remove_enrolled_course_from_cart()
  from public, anon, authenticated;

drop trigger if exists enrollment_remove_cart_item on public.enrollments;
create trigger enrollment_remove_cart_item
after insert on public.enrollments
for each row execute function public.remove_enrolled_course_from_cart();
