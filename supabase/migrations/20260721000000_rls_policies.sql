-- ============================================================================
-- Row Level Security cho nền tảng E-Learning
-- Vai trò: student | instructor | admin
--
-- Nguyên tắc:
--   - Không table nào được truy cập khi chưa authenticate, trừ khi có policy
--     "select ... to anon" tường minh (chỉ dùng cho catalog khoá học công khai).
--   - Toàn bộ chính sách dựa vào auth.uid() + role lưu trong public.profiles.
--   - Client (browser) CHỈ dùng anon/publishable key. Không truyền
--     service_role key cho client trong bất kỳ trường hợp nào — service_role
--     bỏ qua RLS hoàn toàn nên chỉ được dùng ở server tin cậy (nếu thực sự
--     cần), không bao giờ trong code chạy trên trình duyệt.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SCHEMA TỐI THIỂU (giả định — điều chỉnh theo schema thật của dự án)
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  content text,
  position integer not null default 0
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS (security definer để tránh RLS đệ quy khi đọc role)
-- ----------------------------------------------------------------------------

-- Đọc role của user hiện tại. security definer => bỏ qua RLS của profiles
-- khi đọc, nên có thể gọi an toàn bên trong policy của chính bảng profiles
-- mà không gây đệ quy vô hạn.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'instructor';
$$;

-- Học viên hiện tại đã ghi danh khoá học course_id chưa.
create or replace function public.is_enrolled(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = target_course_id and student_id = auth.uid()
  );
$$;

-- Instructor hiện tại có sở hữu khoá học course_id không.
create or replace function public.owns_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.courses
    where id = target_course_id and instructor_id = auth.uid()
  );
$$;

-- Chặn tự nâng quyền: chỉ admin mới được đổi cột role của một profile.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Chỉ admin mới được thay đổi role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- Các role dùng ở client (anon, authenticated) phải có quyền EXECUTE thì mới
-- gọi được các hàm trên từ trong policy — thiếu bước này policy sẽ lỗi
-- "permission denied for function" dù logic đúng.
grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_instructor() to anon, authenticated;
grant execute on function public.is_enrolled(uuid) to anon, authenticated;
grant execute on function public.owns_course(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. BẬT RLS TRÊN TẤT CẢ BẢNG
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- ============================================================================
-- 4. PROFILES
-- ============================================================================

-- Student/instructor xem được hồ sơ của chính mình.
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Admin xem toàn bộ hồ sơ.
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

-- Mỗi người chỉ sửa được hồ sơ của chính mình (cột role được trigger ở trên
-- khoá lại, không ai tự đổi role qua policy này được).
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Admin sửa được mọi hồ sơ, kể cả đổi role (trigger cho phép khi is_admin()).
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Không cho insert/delete trực tiếp từ client: hồ sơ được tạo tự động qua
-- trigger khi có user mới đăng ký (on auth.users insert), không policy nào
-- ở đây cấp quyền insert/delete cho student/instructor/admin qua client.

-- ============================================================================
-- 5. COURSES
-- ============================================================================

-- Khoá học đã published hiển thị công khai (kể cả người chưa đăng nhập) để
-- phục vụ trang catalog/duyệt khoá học trước khi ghi danh.
create policy "courses_select_published"
on public.courses for select
to anon, authenticated
using (status = 'published');

-- Instructor xem được mọi khoá học của chính mình, kể cả bản draft/archived.
create policy "courses_select_own_instructor"
on public.courses for select
to authenticated
using (instructor_id = auth.uid());

-- Admin xem toàn bộ khoá học bất kể trạng thái.
create policy "courses_select_admin"
on public.courses for select
to authenticated
using (public.is_admin());

-- Instructor tạo khoá học mới, bắt buộc gán instructor_id = chính mình
-- (không thể tạo hộ khoá học cho instructor khác).
create policy "courses_insert_instructor"
on public.courses for insert
to authenticated
with check (public.is_instructor() and instructor_id = auth.uid());

-- Admin tạo khoá học cho bất kỳ instructor nào.
create policy "courses_insert_admin"
on public.courses for insert
to authenticated
with check (public.is_admin());

-- Instructor chỉ sửa được khoá học mình phụ trách.
create policy "courses_update_own_instructor"
on public.courses for update
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

-- Admin sửa được mọi khoá học.
create policy "courses_update_admin"
on public.courses for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Instructor xoá được khoá học của chính mình.
create policy "courses_delete_own_instructor"
on public.courses for delete
to authenticated
using (instructor_id = auth.uid());

-- Admin xoá được mọi khoá học.
create policy "courses_delete_admin"
on public.courses for delete
to authenticated
using (public.is_admin());

-- ============================================================================
-- 6. LESSONS (nội dung bài học thuộc courses)
-- ============================================================================

-- Học viên xem được bài học của khoá học mình đã ghi danh.
create policy "lessons_select_enrolled_student"
on public.lessons for select
to authenticated
using (public.is_enrolled(course_id));

-- Instructor xem được bài học thuộc khoá học của mình (kể cả chưa publish).
create policy "lessons_select_own_instructor"
on public.lessons for select
to authenticated
using (public.owns_course(course_id));

-- Admin xem toàn bộ bài học.
create policy "lessons_select_admin"
on public.lessons for select
to authenticated
using (public.is_admin());

-- Instructor thêm/sửa/xoá bài học, chỉ trong phạm vi khoá học mình sở hữu.
create policy "lessons_insert_own_instructor"
on public.lessons for insert
to authenticated
with check (public.owns_course(course_id));

create policy "lessons_update_own_instructor"
on public.lessons for update
to authenticated
using (public.owns_course(course_id))
with check (public.owns_course(course_id));

create policy "lessons_delete_own_instructor"
on public.lessons for delete
to authenticated
using (public.owns_course(course_id));

-- Admin thêm bài học vào bất kỳ khoá học nào.
create policy "lessons_insert_admin"
on public.lessons for insert
to authenticated
with check (public.is_admin());

-- Admin sửa được mọi bài học.
create policy "lessons_update_admin"
on public.lessons for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin xoá được mọi bài học.
create policy "lessons_delete_admin"
on public.lessons for delete
to authenticated
using (public.is_admin());

-- ============================================================================
-- 7. ENROLLMENTS (học viên ghi danh khoá học)
-- ============================================================================

-- Student xem được các lượt ghi danh của chính mình.
create policy "enrollments_select_own_student"
on public.enrollments for select
to authenticated
using (student_id = auth.uid());

-- Instructor xem được danh sách học viên đã ghi danh khoá học của mình
-- (đọc để quản lý lớp, không được sửa/xoá bản ghi ghi danh).
create policy "enrollments_select_own_instructor"
on public.enrollments for select
to authenticated
using (public.owns_course(course_id));

-- Admin xem toàn bộ.
create policy "enrollments_select_admin"
on public.enrollments for select
to authenticated
using (public.is_admin());

-- Student tự ghi danh cho chính mình vào khoá học đã published.
create policy "enrollments_insert_self_student"
on public.enrollments for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
);

-- Admin ghi danh hộ (ví dụ cấp quyền truy cập thủ công).
create policy "enrollments_insert_admin"
on public.enrollments for insert
to authenticated
with check (public.is_admin());

-- Student tự huỷ ghi danh (unenroll) chính mình.
create policy "enrollments_delete_self_student"
on public.enrollments for delete
to authenticated
using (student_id = auth.uid());

-- Admin xoá/quản lý mọi lượt ghi danh.
create policy "enrollments_delete_admin"
on public.enrollments for delete
to authenticated
using (public.is_admin());

-- ============================================================================
-- 8. LESSON_PROGRESS (tiến độ học tập)
-- ============================================================================

-- Student xem tiến độ của chính mình.
create policy "progress_select_own_student"
on public.lesson_progress for select
to authenticated
using (student_id = auth.uid());

-- Instructor xem tiến độ học viên trong khoá học mình phụ trách (theo dõi,
-- không sửa được điểm/tiến độ của học viên).
create policy "progress_select_own_instructor"
on public.lesson_progress for select
to authenticated
using (public.owns_course(course_id));

-- Admin xem toàn bộ tiến độ.
create policy "progress_select_admin"
on public.lesson_progress for select
to authenticated
using (public.is_admin());

-- Student tạo/cập nhật tiến độ của chính mình, chỉ khi đã ghi danh khoá học
-- tương ứng — không thể ghi tiến độ cho người khác hoặc khoá học chưa học.
create policy "progress_insert_own_student"
on public.lesson_progress for insert
to authenticated
with check (student_id = auth.uid() and public.is_enrolled(course_id));

create policy "progress_update_own_student"
on public.lesson_progress for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid() and public.is_enrolled(course_id));

-- Admin tạo bản ghi tiến độ cho bất kỳ học viên/khoá học nào (hỗ trợ, đối soát).
create policy "progress_insert_admin"
on public.lesson_progress for insert
to authenticated
with check (public.is_admin());

-- Admin sửa được mọi bản ghi tiến độ.
create policy "progress_update_admin"
on public.lesson_progress for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin xoá được mọi bản ghi tiến độ.
create policy "progress_delete_admin"
on public.lesson_progress for delete
to authenticated
using (public.is_admin());
