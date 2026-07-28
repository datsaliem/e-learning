# Production deployment — Vercel

Runbook này áp dụng cho project Vercel `e-learning-datsaliem` và Supabase
`pjevaqjgnlvjjgxesucl`. Domain production hiện tại:
`https://e-learning-datsaliem.vercel.app`.

## Trạng thái audit ngày 2026-07-27

- Deployment Vercel gần nhất ở trạng thái `Ready`; bản đang live build bằng Next.js 15.5.20.
  Source chuẩn bị release đã nâng lên Next.js 15.5.22 và pass format, lint, typecheck, production
  build cùng smoke test cục bộ.
- Deployment đang chạy chưa chứa toàn bộ source hiện tại: `/robots.txt` trả `404`, trong khi repo
  đã có `app/robots.ts`. Cần phát hành commit hiện tại sau khi hoàn tất các blocker bên dưới.
- Ba public variable chính trên Vercel Production đã được sửa về production URL, Supabase URL và
  publishable key. Cần redeploy để build mới nhận các giá trị này. `NEXT_PUBLIC_API_BASE_URL` cũ
  vẫn trỏ localhost nhưng source không còn đọc biến đó; có thể xóa sau. Ba server secret cho
  Supabase/Stripe vẫn chưa tồn tại. Preview chưa có biến nào.
- Supabase Auth đã được sửa Site URL thành domain production; allowlist hiện có callback production
  `/auth/confirm` và `http://localhost:3000/**`. Chưa mở wildcard Preview vì Preview chưa có backend
  sandbox riêng.
- 35 migration local và remote đã khớp nhau, gồm
  `20260823000000_storage_upsert_select_policies`; migration này đã được push lên production.
- Ba Storage bucket tồn tại đúng loại: `avatars` và `course-media` public, `course-content`
  private. SELECT policy tối thiểu cho avatar/course media `upsert` đã được áp dụng.
- Stripe route đã xác minh raw body + `Stripe-Signature`, giới hạn payload 1 MiB và xử lý
  idempotent bằng `(provider, event_id)`. Chưa có live key/webhook signing secret trên Vercel.
- Vercel Runtime Logs không có error/5xx trong cửa sổ audit. Source mới bổ sung structured error
  logging qua Next.js instrumentation và global error UI.
- Supabase Edge Function `transactional-email-worker` đang active nhưng thiếu `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`; cron chưa được cấu hình. Log từng có response `503`, nên transactional
  email chưa sẵn sàng production.
- Supabase Security Advisor còn cảnh báo `pg_net` ở schema `public`, một số SECURITY DEFINER RPC
  có chủ đích, và leaked-password protection đang tắt. Phải review/accept hoặc xử lý trước go-live.
- `npm audit --omit=dev` không còn vulnerability production. Full audit còn cảnh báo trong
  toolchain dev (ESLint/OpenNext/shadcn); không chạy `npm audit fix --force` vì nó đề xuất breaking
  downgrade/upgrade. Theo dõi và nâng khi các upstream phát hành bản tương thích.

## 1. Environment variables

### Vercel Production — bắt buộc

| Variable                        | Yêu cầu                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | `https://e-learning-datsaliem.vercel.app` hoặc custom domain ổn định  |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://pjevaqjgnlvjjgxesucl.supabase.co`                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key `sb_publishable_*`; được phép xuất hiện ở client      |
| `SUPABASE_SECRET_KEY`           | Secret key `sb_secret_*`, chỉ server; legacy service role là fallback |
| `PAYMENT_PROVIDER`              | `stripe`                                                              |
| `STRIPE_SECRET_KEY`             | `sk_live_*` khi nhận thanh toán thật                                  |
| `STRIPE_WEBHOOK_SECRET`         | `whsec_*` của đúng live webhook endpoint                              |

Không đặt `SUPABASE_SECRET_KEY`, service role, `sk_*`, `whsec_*` hoặc Resend key trong biến
`NEXT_PUBLIC_*`.

Đánh dấu ba server secret là **Sensitive** trên Vercel. Sau mỗi lần đổi env phải redeploy vì
deployment cũ không nhận giá trị mới.

Kiểm tra mà không in giá trị:

```bash
npx vercel env ls production
npx vercel env pull /tmp/e-learning-production.env --environment production --yes
node --env-file=/tmp/e-learning-production.env scripts/check-production-env.mjs
rm /tmp/e-learning-production.env
```

Không dùng `vercel env run` cho audit này khi workspace có `.env.local`, vì local values có thể
ghi đè remote values và tạo kết quả sai.

`vercel.json` dùng `npm run build:production`, vì vậy release mới sẽ fail-fast nếu thiếu hoặc còn
placeholder.

### Preview

Không dùng Preview với production Supabase/Stripe nếu tester có thể ghi dữ liệu. Ưu tiên Supabase
Branch + Stripe sandbox và đặt env riêng cho Preview. Chỉ khi chấp nhận dùng chung backend mới copy
public credentials sang Preview.

### Supabase Edge Function secrets

Các biến sau thuộc Supabase Edge Functions, không cần đặt trên Vercel:

```bash
supabase secrets set \
  RESEND_API_KEY=... \
  RESEND_FROM_EMAIL='E-Learning <hello@verified-domain>' \
  EMAIL_APP_URL='https://e-learning-datsaliem.vercel.app'
```

`RESEND_REPLY_TO` và `EMAIL_WORKER_BATCH_SIZE` là tùy chọn. Xác minh domain sender trong Resend
trước khi bật cron.

## 2. Supabase Auth redirect URLs

Trong Authentication → URL Configuration:

- Site URL: `https://e-learning-datsaliem.vercel.app`
- Redirect URL production: `https://e-learning-datsaliem.vercel.app/auth/confirm`
- Local development: `http://localhost:3000/**`
- Nếu Preview dùng Auth: `https://*-datsaliems-projects.vercel.app/**`

Production dùng path chính xác; wildcard chỉ dành cho local/preview. Template email Supabase phải
dùng `{{ .RedirectTo }}` khi link được tạo với `emailRedirectTo`/`redirectTo`.

Site URL, production callback và local wildcard đã được cấu hình ngày 2026-07-27. Preview wildcard
chỉ thêm sau khi Preview có Supabase branch/sandbox phù hợp.

Smoke test cả hai luồng:

1. Đăng ký một email mới → click confirm → về `/auth/confirm` rồi `/dashboard`.
2. Quên mật khẩu → click email → về `/auth/confirm?next=/reset-password`.

## 3. Database migrations và Storage

Trước release:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

Sau khi push:

```bash
supabase db push --linked --dry-run
```

Kết quả cuối phải là `Remote database is up to date`. Sau mọi DDL, chạy Security và Performance
Advisors trong dashboard/MCP.

Storage smoke test bằng ba tài khoản khác nhau:

- Student upload avatar, upload lại cùng path, rồi xóa; không đọc/list được row avatar của user khác
  qua authenticated Storage API.
- Instructor upload và upsert thumbnail/trailer cho khóa học mình sở hữu; bị từ chối với khóa học
  của instructor khác.
- `course-content` không có public URL; enrolled student đọc được signed object, user chưa ghi danh
  bị từ chối.
- Xác nhận giới hạn bucket: avatar 2 MiB, course-media 200 MiB, course-content 50 MiB và MIME
  allowlist đúng.

## 4. Stripe webhook

Tạo live webhook endpoint:

```text
https://e-learning-datsaliem.vercel.app/api/webhooks/stripe
```

Chỉ subscribe bốn event app xử lý:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Copy signing secret của chính endpoint live vào `STRIPE_WEBHOOK_SECRET`; không dùng secret do
`stripe listen` sinh ra. API version của endpoint phải tương thích với Stripe SDK đang pin trong
source.

Checklist test:

- GET endpoint trả `405`.
- POST thiếu/sai signature trả `400`.
- Một Checkout Session thực có `metadata.order_id` UUID, đúng amount/currency.
- Event hợp lệ cập nhật order/payment/enrollment.
- Resend cùng `event.id` không tạo payment/enrollment trùng.
- Stripe Dashboard không còn delivery pending/failed sau smoke test.

Stripe tự retry webhook live tối đa khoảng ba ngày. Endpoint trả `5xx` cho lỗi tạm thời để Stripe
retry, `400` cho signature/payload không hợp lệ.

## 5. Error logging và security headers

`instrumentation.ts` ghi một JSON line đã redact vào `console.error`, gồm `errorId`, route pattern,
route type và digest; không log cookie, header, raw webhook body hoặc thông tin cá nhân. Xem bằng:

```bash
npx vercel logs --environment production --level error --since 1h
npx vercel logs --environment production --status-code 5xx --since 1h
```

Production phải có các header:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy`
- `Permissions-Policy`
- không còn `X-Powered-By`

Kiểm tra:

```bash
curl -I https://e-learning-datsaliem.vercel.app/
curl -I https://e-learning-datsaliem.vercel.app/admin/dashboard
curl -I https://e-learning-datsaliem.vercel.app/robots.txt
```

Admin chưa đăng nhập phải redirect về `/login`; dashboard, admin, checkout và learning page phải
giữ `noindex`.

## 6. Go-live checklist

- [ ] Chốt production domain; cập nhật DNS nếu dùng custom domain.
- [ ] Vercel Production env pass `npm run check:production-env`.
- [ ] Preview dùng backend sandbox/branch riêng và pass smoke test.
- [ ] Supabase Site URL/Redirect URLs đã cập nhật và test email callback.
- [ ] `supabase db push --dry-run` không còn migration chờ.
- [ ] Storage upload/upsert/read-deny test đạt.
- [ ] Supabase Security Advisor đã review; leaked-password protection bật hoặc có risk acceptance.
- [ ] Stripe live webhook, events, secret và API version đúng.
- [ ] Resend secrets, verified sender, Edge Function và cron hoạt động; không còn
      `503`/dead-letter ngoài dự kiến.
- [ ] `npm run verify` pass trên commit release.
- [ ] `npm audit --omit=dev` không có vulnerability chưa được chấp nhận.
- [ ] Deploy Preview, test register/login/reset/profile/course/checkout/learn.
- [ ] Promote đúng Preview deployment lên Production.
- [ ] Kiểm tra `/`, `/courses`, `/robots.txt`, `/sitemap.xml`, Auth callback, Stripe endpoint, admin
      redirect và security headers.
- [ ] Theo dõi Vercel/Supabase/Stripe/Resend logs ít nhất 30 phút.
- [ ] Ghi release record: commit SHA, Vercel deployment ID/URL, migration cuối, Edge Function
      version, Stripe endpoint ID và thời điểm đổi env.

## 7. Rollback

### App/Vercel

1. Dừng promote/deploy mới và lưu deployment ID đang lỗi.
2. Rollback về deployment production tốt gần nhất:

   ```bash
   npx vercel rollback <previous-production-deployment-url>
   npx vercel rollback status
   ```

   Hoặc dùng **Instant Rollback** trong Vercel dashboard. Hobby chỉ rollback được deployment
   production liền trước.

3. Smoke test domain chính, Auth, checkout và learning page.
4. Env trong Project Settings vẫn áp dụng cho các build tương lai; nếu env là nguyên nhân,
   revert/rotate riêng rồi tạo deployment mới.
5. Khi đã sửa xong, promote deployment tốt để thoát trạng thái rollback và bật lại auto-assignment
   production domain.

### Database/Supabase

Vercel rollback **không** rollback database, Storage policy, Auth config hoặc Edge Function. Mặc
định dùng forward-fix:

1. Tạo migration mới bằng `supabase migration new <rollback_or_fix_name>`.
2. Viết DDL tương thích cả app cũ và app mới; không xóa migration đã chạy.
3. Dry-run, backup/PITR nếu thay đổi dữ liệu, push và chạy advisors.

Với migration Storage lần này, rollback kỹ thuật là drop hai policy `avatar_select_own_folder` và
`course_media_select_by_owner`, nhưng thao tác đó sẽ làm `upsert` hỏng lại; chỉ dùng khi có bằng
chứng policy gây sự cố.

Nếu migration destructive gây mất/corrupt dữ liệu, ngừng ghi, dùng Supabase backup/PITR theo plan
và liên hệ support; không cố sửa bằng cách reset migration history.

### Stripe và email

- Nếu webhook mới lỗi, tạm disable endpoint mới, giữ event để Stripe retry sau khi app được
  rollback/fix; không đánh dấu thủ công order paid.
- Nếu email worker lỗi, tắt cron trước, giữ outbox, sửa secrets/function rồi bật lại. Không xóa
  dead-letter trước khi ghi nhận và quyết định retry.

Sau rollback, tạo incident note gồm timeline, impact, root cause, các event cần replay và hành động
ngăn tái diễn.

## 8. Tài liệu vận hành chính thức

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime)
- [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback)
- [Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Stripe webhooks](https://docs.stripe.com/webhooks?lang=node)
