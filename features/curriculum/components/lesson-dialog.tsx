"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  FileArchiveIcon,
  FileTextIcon,
  LinkIcon,
  Loader2Icon,
  PaperclipIcon,
  Trash2Icon,
  UploadCloudIcon,
  VideoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { safeAction } from "@/lib/safe-action";
import {
  addLessonResources,
  deleteLessonResource,
  saveLesson,
  updateLessonContent,
} from "@/features/curriculum/actions";
import { lessonFormSchema, type LessonFormInput } from "@/features/curriculum/schemas";
import {
  removeUploadedContent,
  uploadLessonContent,
  uploadLessonResources,
  validateLessonContentFile,
  validateResourceFile,
} from "@/features/curriculum/storage";
import type {
  CurriculumLesson,
  CurriculumLessonType,
  CurriculumResource,
  CurriculumSection,
} from "@/features/curriculum/types";

const TYPE_OPTIONS: {
  value: CurriculumLessonType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "video", label: "Video", description: "MP4, WEBM hoặc MOV", icon: VideoIcon },
  { value: "text", label: "Văn bản", description: "Nội dung đọc", icon: FileTextIcon },
  {
    value: "pdf",
    label: "PDF",
    description: "Tài liệu hiển thị trong trang học",
    icon: FileArchiveIcon,
  },
  { value: "external_link", label: "Liên kết ngoài", description: "URL http(s)", icon: LinkIcon },
];

function fileNameFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.split("/").at(-1) ?? path;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sections: CurriculumSection[];
  initialSectionId: string;
  lesson: CurriculumLesson | null;
  onSaved: (lesson: CurriculumLesson) => void;
  onResourceDeleted: (lessonId: string, resourceId: string) => void;
}

export function LessonDialog({
  open,
  onOpenChange,
  courseId,
  sections,
  initialSectionId,
  lesson,
  onSaved,
  onResourceDeleted,
}: LessonDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [progressLabel, setProgressLabel] = React.useState<string | null>(null);
  const [contentFile, setContentFile] = React.useState<File | null>(null);
  const [resourceFiles, setResourceFiles] = React.useState<File[]>([]);
  const [resources, setResources] = React.useState<CurriculumResource[]>(lesson?.resources ?? []);
  const [workingLesson, setWorkingLesson] = React.useState<CurriculumLesson | null>(lesson);
  const [deletingResourceId, setDeletingResourceId] = React.useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const form = useForm<LessonFormInput>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      sectionId: lesson?.sectionId ?? initialSectionId,
      title: lesson?.title ?? "",
      lessonType: lesson?.type ?? "video",
      durationMinutes: lesson ? Math.max(1, Math.ceil(lesson.durationSeconds / 60)) : 5,
      isPreview: lesson?.isPreview ?? false,
      content: lesson?.content ?? "",
      externalUrl: lesson?.externalUrl ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      sectionId: lesson?.sectionId ?? initialSectionId,
      title: lesson?.title ?? "",
      lessonType: lesson?.type ?? "video",
      durationMinutes: lesson ? Math.max(1, Math.ceil(lesson.durationSeconds / 60)) : 5,
      isPreview: lesson?.isPreview ?? false,
      content: lesson?.content ?? "",
      externalUrl: lesson?.externalUrl ?? "",
    });
    setWorkingLesson(lesson);
    setResources(lesson?.resources ?? []);
    setContentFile(null);
    setResourceFiles([]);
    setFileInputKey((current) => current + 1);
  }, [form, initialSectionId, lesson, open]);

  const lessonType = form.watch("lessonType");
  const existingContentPath =
    lessonType === "video" ? workingLesson?.videoPath : workingLesson?.contentPath;

  function chooseContentFile(file: File | undefined) {
    if (!file) {
      setContentFile(null);
      return;
    }
    const error = validateLessonContentFile(file, lessonType);
    if (error) {
      toast.error(error);
      setFileInputKey((current) => current + 1);
      return;
    }
    setContentFile(file);
  }

  function chooseResourceFiles(files: File[]) {
    if (files.length + resources.length > 10) {
      toast.error("Mỗi bài học có tối đa 10 tài liệu đính kèm.");
      return;
    }
    for (const file of files) {
      const error = validateResourceFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return;
      }
    }
    setResourceFiles(files);
  }

  async function removeResource(resource: CurriculumResource) {
    if (!workingLesson && !lesson) return;
    const activeLessonId = workingLesson?.id ?? lesson?.id;
    if (!activeLessonId) return;

    setDeletingResourceId(resource.id);
    const result = await safeAction(() =>
      deleteLessonResource(courseId, activeLessonId, resource.id),
    );
    setDeletingResourceId(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setResources((current) => current.filter((item) => item.id !== resource.id));
    onResourceDeleted(activeLessonId, resource.id);
    toast.success("Đã xoá tài liệu.");
  }

  async function submit(values: LessonFormInput) {
    if (
      (values.lessonType === "video" || values.lessonType === "pdf") &&
      !contentFile &&
      !existingContentPath
    ) {
      toast.error(
        values.lessonType === "video" ? "Vui lòng chọn video bài học." : "Vui lòng chọn file PDF.",
      );
      return;
    }

    setIsSaving(true);
    setProgressLabel("Đang lưu thông tin bài học...");
    let uploadedContentPath: string | null = null;
    let uploadedResources: { storagePath: string }[] = [];

    try {
      const activeLessonId = workingLesson?.id ?? lesson?.id ?? null;
      const saveResult = await safeAction(() => saveLesson(courseId, activeLessonId, values));
      if ("error" in saveResult) throw new Error(saveResult.error);

      let nextLesson: CurriculumLesson = {
        ...saveResult.data,
        resources,
      };
      setWorkingLesson(nextLesson);

      const uploadedLessonType = values.lessonType;
      if (contentFile && (uploadedLessonType === "video" || uploadedLessonType === "pdf")) {
        setProgressLabel(
          uploadedLessonType === "video" ? "Đang tải video lên..." : "Đang tải PDF lên...",
        );
        uploadedContentPath = await uploadLessonContent(courseId, nextLesson.id, contentFile);
        const contentResult = await safeAction(() =>
          updateLessonContent(courseId, nextLesson.id, {
            lessonType: uploadedLessonType,
            storagePath: uploadedContentPath!,
          }),
        );
        if ("error" in contentResult) throw new Error(contentResult.error);

        nextLesson = {
          ...nextLesson,
          videoPath: uploadedLessonType === "video" ? uploadedContentPath : null,
          contentPath: uploadedLessonType === "pdf" ? uploadedContentPath : null,
        };
        uploadedContentPath = null;
      }

      if (resourceFiles.length > 0) {
        setProgressLabel("Đang tải tài liệu đính kèm...");
        const uploads = await uploadLessonResources(courseId, nextLesson.id, resourceFiles);
        uploadedResources = uploads;
        const resourceResult = await safeAction(() =>
          addLessonResources(courseId, nextLesson.id, uploads),
        );
        if ("error" in resourceResult) throw new Error(resourceResult.error);
        uploadedResources = [];
        nextLesson = {
          ...nextLesson,
          resources: [...resources, ...resourceResult.data],
        };
      }

      setWorkingLesson(nextLesson);
      onSaved(nextLesson);
      toast.success(lesson ? "Đã cập nhật bài học." : "Đã tạo bài học.");
      onOpenChange(false);
    } catch (error) {
      const paths = [
        uploadedContentPath,
        ...uploadedResources.map((resource) => resource.storagePath),
      ].filter((path): path is string => Boolean(path));
      await removeUploadedContent(paths);
      toast.error(error instanceof Error ? error.message : "Không thể lưu bài học.");
    } finally {
      setIsSaving(false);
      setProgressLabel(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lesson ? "Chỉnh sửa bài học" : "Tạo bài học mới"}</DialogTitle>
          <DialogDescription>
            Chọn loại nội dung, thời lượng và tài liệu học viên có thể tải xuống.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="lesson-form"
            noValidate
            onSubmit={form.handleSubmit((values) => void submit(values))}
            className="grid gap-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Tiêu đề bài học</FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: Cài đặt môi trường phát triển" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => value && field.onChange(value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời lượng (phút)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={field.value}
                        onChange={(event) => field.onChange(event.currentTarget.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lessonType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại bài học</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (!value) return;
                      field.onChange(value);
                      setContentFile(null);
                      setFileInputKey((current) => current + 1);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <Icon aria-hidden="true" />
                            {option.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {TYPE_OPTIONS.find((option) => option.value === field.value)?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {lessonType === "text" && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nội dung</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-48"
                        placeholder="Nhập nội dung bài học..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {lessonType === "external_link" && (
              <FormField
                control={form.control}
                name="externalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liên kết bài học</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/bai-hoc" {...field} />
                    </FormControl>
                    <FormDescription>Liên kết sẽ được mở trong tab mới.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(lessonType === "video" || lessonType === "pdf") && (
              <div className="grid gap-2">
                <label htmlFor="lesson-content-file" className="text-sm font-medium">
                  {lessonType === "video" ? "File video" : "File PDF"}
                </label>
                <label
                  htmlFor="lesson-content-file"
                  className="border-border hover:bg-muted focus-within:ring-ring flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors focus-within:ring-3"
                >
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <UploadCloudIcon aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium">
                      {contentFile?.name ??
                        fileNameFromPath(existingContentPath) ??
                        "Chọn file để tải lên"}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {lessonType === "video"
                        ? "MP4, WEBM, MOV · tối đa 500MB"
                        : "PDF · tối đa 50MB"}
                    </span>
                  </span>
                  <input
                    key={fileInputKey}
                    id="lesson-content-file"
                    type="file"
                    accept={
                      lessonType === "video"
                        ? "video/mp4,video/webm,video/quicktime"
                        : "application/pdf"
                    }
                    className="sr-only"
                    onChange={(event) => chooseContentFile(event.currentTarget.files?.[0])}
                  />
                </label>
              </div>
            )}

            <FormField
              control={form.control}
              name="isPreview"
              render={({ field }) => (
                <FormItem>
                  <label className="border-border flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.currentTarget.checked)}
                      className="accent-primary mt-0.5 size-4"
                    />
                    <span>
                      <span className="block text-sm font-medium">Cho phép học thử</span>
                      <span className="text-muted-foreground block text-xs">
                        Học viên chưa ghi danh có thể xem trước bài học này.
                      </span>
                    </span>
                  </label>
                </FormItem>
              )}
            />

            <div className="grid gap-3">
              <div>
                <label htmlFor="lesson-resources" className="text-sm font-medium">
                  Tài liệu đính kèm
                </label>
                <p className="text-muted-foreground mt-1 text-xs">
                  PDF, ZIP, TXT, CSV, DOCX hoặc PPTX · tối đa 10 file.
                </p>
              </div>

              {(resources.length > 0 || resourceFiles.length > 0) && (
                <ul className="grid gap-2">
                  {resources.map((resource) => (
                    <li
                      key={resource.id}
                      className="border-border flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <PaperclipIcon
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-medium">{resource.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatFileSize(resource.fileSizeBytes)}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xoá ${resource.name}`}
                        disabled={deletingResourceId === resource.id}
                        onClick={() => void removeResource(resource)}
                      >
                        {deletingResourceId === resource.id ? (
                          <Loader2Icon className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2Icon aria-hidden="true" />
                        )}
                      </Button>
                    </li>
                  ))}
                  {resourceFiles.map((file) => (
                    <li
                      key={`${file.name}-${file.lastModified}`}
                      className="border-primary/20 bg-primary/5 flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <PaperclipIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      <span className="text-muted-foreground text-xs">Mới</span>
                    </li>
                  ))}
                </ul>
              )}

              <label
                htmlFor="lesson-resources"
                className="border-border hover:bg-muted flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-sm transition-colors"
              >
                <PaperclipIcon aria-hidden="true" />
                Chọn tài liệu
                <input
                  id="lesson-resources"
                  type="file"
                  multiple
                  accept=".pdf,.zip,.txt,.csv,.docx,.pptx"
                  className="sr-only"
                  onChange={(event) =>
                    chooseResourceFiles(Array.from(event.currentTarget.files ?? []))
                  }
                />
              </label>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button type="submit" form="lesson-form" disabled={isSaving}>
            {isSaving ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
            {progressLabel ?? (lesson ? "Lưu thay đổi" : "Tạo bài học")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
