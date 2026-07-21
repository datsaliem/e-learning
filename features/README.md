# features

Mỗi tính năng nghiệp vụ (ví dụ: `courses`, `auth`, `enrollment`) có một thư mục con riêng, tự chứa:

```
features/
  <feature-name>/
    components/   # UI riêng của feature
    hooks/        # hooks riêng của feature
    services/     # gọi API riêng của feature
    types.ts      # types riêng của feature
    index.ts      # export public API của feature
```

Chỉ đặt logic dùng chung nhiều feature vào `components/`, `hooks/`, `lib/`, `types/`, `services/` ở root.
