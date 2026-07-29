"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2Icon, Loader2Icon, PencilIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { saveSeoSitemapEntry } from "@/features/seo/actions";
import { SEO_CHANGE_FREQUENCY_LABELS, SEO_CONTENT_TYPE_LABELS } from "@/features/seo/constants";
import { seoSitemapEntryFormSchema, type SeoSitemapEntryFormInput } from "@/features/seo/schemas";
import {
  SEO_CHANGE_FREQUENCIES,
  SEO_CONTENT_TYPES,
  type SeoSitemapEntry,
} from "@/features/seo/types";
import { safeAction } from "@/lib/safe-action";

function getDefaultValues(entry?: SeoSitemapEntry): SeoSitemapEntryFormInput {
  return {
    contentType: entry?.contentType ?? "page",
    path: entry?.path ?? "",
    title: entry?.title ?? "",
    description: entry?.description ?? "",
    imageUrl: entry?.imageUrl ?? "",
    isPublished: entry?.isPublished ?? false,
    changeFrequency: entry?.changeFrequency ?? "weekly",
    priority: entry?.priority ?? 0.7,
  };
}

export function SitemapEntryDialog({ entry }: { entry?: SeoSitemapEntry }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<SeoSitemapEntryFormInput>({
    resolver: zodResolver(seoSitemapEntryFormSchema),
    defaultValues: getDefaultValues(entry),
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) form.reset(getDefaultValues(entry));
  }

  function onSubmit(values: SeoSitemapEntryFormInput) {
    startTransition(async () => {
      const result = await safeAction(() => saveSeoSitemapEntry(entry?.id ?? null, values));
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(entry ? "Đã cập nhật mục sitemap." : "Đã thêm mục sitemap.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant={entry ? "ghost" : "default"} size={entry ? "icon-sm" : "default"} />
        }
        aria-label={entry ? `Sửa ${entry.title}` : undefined}
      >
        {entry ? <PencilIcon /> : <FilePlus2Icon />}
        {!entry && "Thêm URL CMS"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Chỉnh sửa URL sitemap" : "Thêm URL từ CMS"}</DialogTitle>
          <DialogDescription>
            Sitemap cập nhật tự động khi mục được xuất bản. Chỉ đăng ký URL đã có trang public tương
            ứng.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={`sitemap-entry-form-${entry?.id ?? "new"}`}
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="grid gap-4 py-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại nội dung</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                        >
                          {SEO_CONTENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {SEO_CONTENT_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Đường dẫn public</FormLabel>
                      <FormControl>
                        <Input placeholder="/blog/hoc-nextjs" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ảnh sitemap (không bắt buộc)</FormLabel>
                    <FormControl>
                      <Input placeholder="/images/post.webp hoặc https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="changeFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tần suất thay đổi</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                        >
                          {SEO_CHANGE_FREQUENCIES.map((frequency) => (
                            <option key={frequency} value={frequency}>
                              {SEO_CHANGE_FREQUENCY_LABELS[frequency]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.1}
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>Từ 0.0 đến 1.0.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <label className="border-border hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(event) => field.onChange(event.target.checked)}
                          className="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 rounded focus-visible:ring-2"
                        />
                        <span>
                          <span className="block font-medium">Đưa vào sitemap công khai</span>
                          <span className="text-muted-foreground mt-1 block text-xs">
                            Bản nháp được giữ trong CMS nhưng không xuất hiện trong sitemap.xml.
                          </span>
                        </span>
                      </label>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form={`sitemap-entry-form-${entry?.id ?? "new"}`}
            disabled={isPending}
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            {entry ? "Lưu thay đổi" : "Thêm vào CMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
