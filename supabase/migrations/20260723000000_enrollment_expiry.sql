-- ============================================================================
-- Thêm thời hạn truy cập cho enrollments, phục vụ trang "Khoá học của tôi"
-- (tab Đang học / Đã hoàn thành / Đã hết hạn).
--
-- expires_at NULL = truy cập trọn đời (mặc định). Set giá trị khi khoá học
-- có gói truy cập giới hạn thời gian (ví dụ license doanh nghiệp 1 năm).
-- ============================================================================

alter table public.enrollments
  add column if not exists expires_at timestamptz;
