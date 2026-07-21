-- ============================================================================
-- Bổ sung các trường hồ sơ (phone, headline, bio, website) và storage bucket
-- cho avatar người dùng. Tiếp nối schema profiles đã tạo ở migration RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cột mới trên profiles
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists phone text,
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists website text;

alter table public.profiles
  add constraint profiles_phone_length check (phone is null or char_length(phone) <= 20),
  add constraint profiles_headline_length check (headline is null or char_length(headline) <= 120),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  add constraint profiles_website_length check (website is null or char_length(website) <= 2048);

-- ----------------------------------------------------------------------------
-- 2. Storage bucket cho avatar
-- ----------------------------------------------------------------------------

-- public: true => ảnh đại diện truy cập được qua URL công khai trực tiếp,
-- không cần signed URL. Giới hạn định dạng/kích thước được kiểm tra ở phía
-- ứng dụng (Zod) trước khi upload; đây là lớp phòng vệ ở tầng DB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS trên storage.objects được Supabase bật sẵn theo mặc định. Quy ước path
-- upload: avatars/{user_id}/{filename} — mỗi user chỉ được ghi vào đúng thư
-- mục mang id của chính mình, storage.foldername(name) tách path thành mảng
-- thư mục con nên phần tử đầu tiên chính là user_id.

-- Ai cũng xem được avatar (bao gồm cả người chưa đăng nhập) — cần thiết để
-- hiển thị avatar công khai trên trang khoá học, bình luận, v.v.
create policy "avatar_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Chỉ được tải lên đúng thư mục mang id của chính mình.
create policy "avatar_upload_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Ghi đè (thay ảnh cùng tên) chỉ trong thư mục của chính mình.
create policy "avatar_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Xoá ảnh cũ khi thay avatar mới, chỉ trong thư mục của chính mình.
create policy "avatar_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
