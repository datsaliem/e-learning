-- Supabase Free áp global upload limit 50MB. Đồng bộ bucket với giới hạn thực
-- tế để client và Storage trả về cùng một hành vi.
update storage.buckets
set file_size_limit = 52428800
where id = 'course-content';
