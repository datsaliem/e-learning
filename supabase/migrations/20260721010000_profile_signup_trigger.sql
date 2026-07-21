-- ============================================================================
-- Tự động tạo public.profiles khi có user mới trong auth.users (sau khi
-- signUp hoặc xác nhận email). Không có trigger này, ứng dụng sẽ không đọc
-- được role của user vừa đăng ký vì bảng profiles chưa có dòng nào cho họ.
--
-- Role mặc định luôn là 'student' — nâng lên instructor/admin phải do admin
-- thực hiện thủ công qua policy "profiles_update_admin" (xem migration RLS).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
