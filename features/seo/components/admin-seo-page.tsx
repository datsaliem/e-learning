"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleCheckIcon,
  CircleOffIcon,
  ExternalLinkIcon,
  FileSearchIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { deleteSeoSitemapEntry } from "@/features/seo/actions";
import { SEO_CHANGE_FREQUENCY_LABELS, SEO_CONTENT_TYPE_LABELS } from "@/features/seo/constants";
import { SeoSettingsForm } from "@/features/seo/components/seo-settings-form";
import { SitemapEntryDialog } from "@/features/seo/components/sitemap-entry-dialog";
import type { AdminSeoData, SeoSitemapEntry } from "@/features/seo/types";
import { safeAction } from "@/lib/safe-action";

function DeleteEntryButton({ entry }: { entry: SeoSitemapEntry }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    if (!window.confirm(`Xóa “${entry.title}” khỏi registry sitemap?`)) return;

    startTransition(async () => {
      const result = await safeAction(() => deleteSeoSitemapEntry(entry.id));
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Đã xóa mục sitemap.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Xóa ${entry.title}`}
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
    </Button>
  );
}

function SitemapEntryRow({ entry }: { entry: SeoSitemapEntry }) {
  return (
    <article className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium">{entry.title}</h3>
          <Badge variant="outline">{SEO_CONTENT_TYPE_LABELS[entry.contentType]}</Badge>
          <Badge variant={entry.isPublished ? "success" : "secondary"}>
            {entry.isPublished ? "Đã xuất bản" : "Bản nháp"}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Link
            href={entry.path}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            {entry.path}
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </Link>
          <span>{SEO_CHANGE_FREQUENCY_LABELS[entry.changeFrequency]}</span>
          <span>Priority {entry.priority.toFixed(1)}</span>
          <span>
            Cập nhật{" "}
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            }).format(new Date(entry.updatedAt))}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <SitemapEntryDialog entry={entry} />
        <DeleteEntryButton entry={entry} />
      </div>
    </article>
  );
}

export function AdminSeoPage({ data }: { data: AdminSeoData }) {
  const publishedCount = data.entries.filter((entry) => entry.isPublished).length;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-sm font-medium">Tìm kiếm và chia sẻ</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Quản lý SEO</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Điều khiển metadata mặc định, robots.txt và các URL CMS được xuất tự động vào sitemap.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={data.settings.indexSite ? "success" : "destructive"}>
            {data.settings.indexSite ? <CircleCheckIcon /> : <CircleOffIcon />}
            {data.settings.indexSite ? "Đang cho phép index" : "Đang chặn index"}
          </Badge>
          <Badge variant="secondary">{publishedCount} URL CMS public</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Cấu hình toàn website</CardTitle>
          <CardDescription>
            Thay đổi được áp dụng cho request metadata tiếp theo và các metadata route.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeoSettingsForm settings={data.settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>Registry nội dung CMS</CardTitle>
            <CardDescription>
              Blog, product và page mới sẽ xuất hiện trong sitemap khi trạng thái là đã xuất bản.
              Khóa học được lấy trực tiếp từ catalog nên không cần đăng ký lại tại đây.
            </CardDescription>
          </div>
          <div data-slot="card-action">
            <SitemapEntryDialog />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {data.entries.length > 0 ? (
            <div className="divide-border divide-y">
              {data.entries.map((entry) => (
                <SitemapEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
              <FileSearchIcon className="text-muted-foreground size-9" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">Chưa có URL CMS</h2>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Sitemap vẫn chứa trang public và khóa học đã xuất bản. Thêm registry khi CMS có nội
                dung mới.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-muted-foreground text-xs">
        robots.txt chỉ hướng dẫn crawler; Auth và Supabase RLS vẫn là lớp bảo vệ dữ liệu thực tế.
      </p>
    </div>
  );
}
