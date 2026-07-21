-- ============================================================================
-- Thêm watched_seconds vào lesson_progress — cần thiết cho trang học
-- (/learn/[courseSlug]/[lessonId]) để lưu tiến độ xem theo giây và tự động
-- đánh dấu hoàn thành khi học viên xem đủ ngưỡng.
-- ============================================================================

alter table public.lesson_progress
  add column if not exists watched_seconds integer not null default 0;

alter table public.lesson_progress
  add constraint lesson_progress_watched_seconds_check check (watched_seconds >= 0);
