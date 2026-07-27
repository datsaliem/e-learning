"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLinkIcon, Globe2Icon, Loader2Icon, SaveIcon, ShieldCheckIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROTECTED_ROBOTS_PATHS } from "@/features/seo/constants";
import { saveSeoSettings } from "@/features/seo/actions";
import { seoSettingsFormSchema, type SeoSettingsFormInput } from "@/features/seo/schemas";
import type { SeoSettings } from "@/features/seo/types";
import { safeAction } from "@/lib/safe-action";

function CheckboxField({
  checked,
  onCheckedChange,
  title,
  description,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <label className="border-border hover:bg-muted/40 flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 rounded focus-visible:ring-2"
      />
      <span className="grid gap-1">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
      </span>
    </label>
  );
}

export function SeoSettingsForm({ settings }: { settings: SeoSettings }) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<SeoSettingsFormInput>({
    resolver: zodResolver(seoSettingsFormSchema),
    defaultValues: {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      organizationName: settings.organizationName,
      organizationLogoUrl: settings.organizationLogoUrl ?? "",
      defaultOgImageUrl: settings.defaultOgImageUrl,
      twitterHandle: settings.twitterHandle ?? "",
      indexSite: settings.indexSite,
      followLinks: settings.followLinks,
      sitemapEnabled: settings.sitemapEnabled,
      crawlDelay: settings.crawlDelay ?? 0,
      robotsAllowText: settings.robotsAllow.join("\n"),
      robotsDisallowText: settings.robotsDisallow.join("\n"),
    },
  });

  function onSubmit(values: SeoSettingsFormInput) {
    startTransition(async () => {
      const result = await safeAction(() => saveSeoSettings(values));
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Đã cập nhật metadata, robots và sitemap.");
      form.reset(values);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8" noValidate>
        <section aria-labelledby="seo-brand-heading" className="grid gap-5">
          <div>
            <h2 id="seo-brand-heading" className="text-lg font-semibold">
              Thương hiệu và chia sẻ
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Giá trị mặc định được dùng cho metadata, Open Graph, Twitter Card và Organization
              schema.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="siteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên website</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên tổ chức</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="siteDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả mặc định</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormDescription>
                  Nên rõ ý trong khoảng 120–160 ký tự; trang khóa học vẫn dùng mô tả riêng.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="defaultOgImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ảnh Open Graph mặc định</FormLabel>
                  <FormControl>
                    <Input placeholder="/og.png hoặc https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organizationLogoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo Organization</FormLabel>
                  <FormControl>
                    <Input placeholder="/logo.png hoặc https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="twitterHandle"
            render={({ field }) => (
              <FormItem className="max-w-md">
                <FormLabel>Twitter/X handle</FormLabel>
                <FormControl>
                  <Input placeholder="@elearning" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Để trống nếu chưa có tài khoản chính thức.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section aria-labelledby="seo-crawler-heading" className="grid gap-5">
          <div>
            <h2 id="seo-crawler-heading" className="text-lg font-semibold">
              Crawling và indexing
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Các thay đổi ở đây tác động trực tiếp tới robots.txt công khai.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="indexSite"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CheckboxField
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      title="Cho phép index website"
                      description="Tắt để yêu cầu crawler không index toàn bộ website."
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="followLinks"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CheckboxField
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      title="Cho phép follow liên kết"
                      description="Điều khiển robots meta mặc định của các trang public."
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sitemapEnabled"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CheckboxField
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      title="Xuất sitemap.xml"
                      description="Tắt sẽ bỏ URL sitemap khỏi robots và trả sitemap rỗng."
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
            <FormField
              control={form.control}
              name="robotsAllowText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allow (mỗi dòng một đường dẫn)</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="robotsDisallowText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disallow bổ sung</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="/preview/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="crawlDelay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Crawl delay (giây)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={86400}
                      step={1}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>0 = không khai báo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>Route riêng tư luôn được bảo vệ khỏi indexing</AlertTitle>
            <AlertDescription>
              <p>CMS không thể bỏ chặn các prefix sau:</p>
              <code className="bg-muted mt-2 block rounded-md p-2 text-xs whitespace-pre-wrap">
                {PROTECTED_ROBOTS_PATHS.join("  ")}
              </code>
            </AlertDescription>
          </Alert>
        </section>

        <div className="border-border bg-background sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-lg">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/robots.txt" target="_blank" rel="noreferrer" />}
            >
              <Globe2Icon />
              robots.txt
              <ExternalLinkIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/sitemap.xml" target="_blank" rel="noreferrer" />}
            >
              Sitemap
              <ExternalLinkIcon />
            </Button>
          </div>
          <Button type="submit" disabled={isPending || !form.formState.isDirty}>
            {isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Lưu cấu hình
          </Button>
        </div>
      </form>
    </Form>
  );
}
