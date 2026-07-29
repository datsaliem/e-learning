# Transactional email worker

Worker này gửi email Resend từ `private.transactional_email_outbox`. Các trigger
database chỉ enqueue job; không có network request nào chạy trong luồng đăng ký,
ghi danh, thanh toán, hoàn thành khóa học hoặc cấp chứng chỉ.

## Secrets bắt buộc

Thiết lập trong Supabase Dashboard → Edge Functions → Secrets:

- `RESEND_API_KEY`: API key server-side của Resend.
- `RESEND_FROM_EMAIL`: sender thuộc domain đã verify, ví dụ
  `E-Learning <hello@example.com>`.
- `EMAIL_APP_URL`: URL production dùng cho CTA trong email.
- `RESEND_REPLY_TO`: tùy chọn.
- `EMAIL_WORKER_BATCH_SIZE`: tùy chọn, từ 1 đến 25; mặc định 10.

`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` do Supabase cung cấp tự động cho
Edge Function. Không đưa service role vào biến `NEXT_PUBLIC_*` hoặc client.

## Lịch chạy và bảo mật

Sau khi deploy function, gọi một lần trong SQL Editor với URL của project:

```sql
select private.configure_transactional_email_cron(
  'https://<project-ref>.supabase.co/functions/v1/transactional-email-worker'
);
```

Hàm tạo token ngẫu nhiên trong Supabase Vault và cấu hình `pg_cron` gọi worker
mỗi phút. Endpoint tắt JWT gateway vì đây là service-to-service cron call, nhưng
mọi request vẫn phải vượt qua token Vault trước khi worker claim job.

## Retry và logging

- Retry mặc định: 1 phút, 5 phút, 15 phút, 1 giờ, tối đa 5 lần.
- HTTP `408`, `425`, `429`, lỗi `5xx`, timeout và network error được retry.
- Lỗi validation vĩnh viễn chuyển thẳng sang `dead_letter`.
- Mỗi lần gửi được ghi vào `private.transactional_email_logs`.
- Resend nhận `Idempotency-Key` từ khóa dedupe của sự kiện để hạn chế gửi trùng.
