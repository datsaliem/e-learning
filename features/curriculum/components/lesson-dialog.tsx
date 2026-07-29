"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  FileArchiveIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  Loader2Icon,
  PaperclipIcon,
  Trash2Icon,
  UploadCloudIcon,
  VideoIcon,
  XIcon,
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { safeAction } from "@/lib/safe-action";
import { saveLesson, updateLessonContent } from "@/features/curriculum/actions";
import { lessonFormSchema, type LessonFormInput } from "@/features/curriculum/schemas";
import {
  cancelLessonContentUpload,
  cancelLessonResourceUpload,
  completeLessonResourceUpload,
  deleteLessonResourceFile,
  prepareLessonContentUpload,
  prepareLessonResourceUpload,
} from "@/features/lesson-resources/actions";
import {
  formatFileSize,
  LESSON_RESOURCE_ACCEPT,
  MAX_LESSON_RESOURCES,
  validateLessonContentMetadata,
  validateLessonResourceMetadata,
} from "@/features/lesson-resources/config";
import {
  createResumableUploadTask,
  UploadCancelledError,
  type ResumableUploadTask,
} from "@/features/lesson-resources/resumable-upload";
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

type PendingUploadStatus = "queued" | "uploading" | "error" | "cancelled";

interface PendingResourceUpload {
  id: string;
  file: File;
  progress: number;
  status: PendingUploadStatus;
  error?: string;
}

interface ActiveUpload {
  id: string;
  task: ResumableUploadTask;
}

function fileMetadata(file: File) {
  return { name: file.name, mimeType: file.type, fileSizeBytes: file.size };
}

function resourceIcon(mimeType: string | null) {
  if (mimeType?.startsWith("video/")) return VideoIcon;
  if (mimeType?.startsWith("image/")) return ImageIcon;
  return FileTextIcon;
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
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [progressLabel, setProgressLabel] = React.useState<string | null>(null);
  const [contentUploadProgress, setContentUploadProgress] = React.useState<number | null>(null);
  const [contentFile, setContentFile] = React.useState<File | null>(null);
  const [pendingResourceUploads, setPendingResourceUploads] = React.useState<
    PendingResourceUpload[]
  >([]);
  const [resources, setResources] = React.useState<CurriculumResource[]>(lesson?.resources ?? []);
  const [workingLesson, setWorkingLesson] = React.useState<CurriculumLesson | null>(lesson);
  const [deletingResourceId, setDeletingResourceId] = React.useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const [activeUploadId, setActiveUploadId] = React.useState<string | null>(null);
  const activeUploadRef = React.useRef<ActiveUpload | null>(null);

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
    setContentUploadProgress(null);
    setPendingResourceUploads([]);
    setActiveUploadId(null);
    activeUploadRef.current = null;
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
    if (lessonType !== "video" && lessonType !== "pdf") return;
    const error = validateLessonContentMetadata(fileMetadata(file), lessonType);
    if (error) {
      toast.error(error);
      setFileInputKey((current) => current + 1);
      return;
    }
    setContentFile(file);
  }

  function chooseResourceFiles(files: File[]) {
    const availableSlots = MAX_LESSON_RESOURCES - resources.length - pendingResourceUploads.length;
    if (files.length > availableSlots) {
      toast.error(`Mỗi bài học có tối đa ${MAX_LESSON_RESOURCES} tài liệu đính kèm.`);
      return;
    }

    for (const file of files) {
      const error = validateLessonResourceMetadata(fileMetadata(file));
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return;
      }
    }

    const existingKeys = new Set(
      pendingResourceUploads.map(
        ({ file }) => `${file.name}:${file.size}:${file.lastModified}:${file.type}`,
      ),
    );
    const uniqueFiles = files.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });

    setPendingResourceUploads((current) => [
      ...current,
      ...uniqueFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "queued" as const,
      })),
    ]);
  }

  function updatePendingUpload(id: string, patch: Partial<PendingResourceUpload>) {
    setPendingResourceUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function cancelActiveUpload() {
    const activeUpload = activeUploadRef.current;
    if (!activeUpload) return;
    setIsCancelling(true);
    updatePendingUpload(activeUpload.id, { status: "cancelled", error: "Đang huỷ..." });
    try {
      await activeUpload.task.cancel();
    } finally {
      setIsCancelling(false);
    }
  }

  function removePendingUpload(id: string) {
    if (activeUploadId === id) {
      void cancelActiveUpload();
      return;
    }
    setPendingResourceUploads((current) => current.filter((item) => item.id !== id));
  }

  async function removeResource(resource: CurriculumResource) {
    if (!workingLesson && !lesson) return;
    const activeLessonId = workingLesson?.id ?? lesson?.id;
    if (!activeLessonId) return;

    setDeletingResourceId(resource.id);
    const result = await safeAction(() =>
      deleteLessonResourceFile(courseId, activeLessonId, resource.id),
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
    let savedLessonId: string | null = workingLesson?.id ?? lesson?.id ?? null;
    let pendingContentPath: string | null = null;
    let pendingResourceReservation: { resourceId: string; localId: string } | null = null;

    try {
      const activeLessonId = workingLesson?.id ?? lesson?.id ?? null;
      const saveResult = await safeAction(() => saveLesson(courseId, activeLessonId, values));
      if ("error" in saveResult) throw new Error(saveResult.error);

      let nextLesson: CurriculumLesson = {
        ...saveResult.data,
        resources,
      };
      savedLessonId = nextLesson.id;
      setWorkingLesson(nextLesson);
      onSaved(nextLesson);

      const uploadedLessonType = values.lessonType;
      if (contentFile && (uploadedLessonType === "video" || uploadedLessonType === "pdf")) {
        setProgressLabel(
          uploadedLessonType === "video" ? "Đang tải video lên..." : "Đang tải PDF lên...",
        );
        setContentUploadProgress(0);

        const preparation = await safeAction(() =>
          prepareLessonContentUpload(
            courseId,
            nextLesson.id,
            uploadedLessonType,
            fileMetadata(contentFile),
          ),
        );
        if ("error" in preparation) throw new Error(preparation.error);

        pendingContentPath = preparation.data.storagePath;
        const task = createResumableUploadTask({
          file: contentFile,
          storagePath: preparation.data.storagePath,
          uploadEndpoint: preparation.data.uploadEndpoint,
          uploadToken: preparation.data.uploadToken,
          onProgress: setContentUploadProgress,
        });
        activeUploadRef.current = { id: "lesson-content", task };
        setActiveUploadId("lesson-content");

        try {
          await task.promise;
        } catch (error) {
          if (error instanceof UploadCancelledError) throw error;
          throw new Error("Không thể tải file nội dung. Vui lòng kiểm tra mạng và thử lại.");
        } finally {
          activeUploadRef.current = null;
          setActiveUploadId(null);
        }

        const contentResult = await safeAction(() =>
          updateLessonContent(courseId, nextLesson.id, {
            lessonType: uploadedLessonType,
            storagePath: preparation.data.storagePath,
          }),
        );
        if ("error" in contentResult) throw new Error(contentResult.error);

        nextLesson = {
          ...nextLesson,
          videoPath: uploadedLessonType === "video" ? preparation.data.storagePath : null,
          contentPath: uploadedLessonType === "pdf" ? preparation.data.storagePath : null,
        };
        pendingContentPath = null;
        setContentFile(null);
        setContentUploadProgress(null);
        setWorkingLesson(nextLesson);
        onSaved(nextLesson);
      }

      for (const pendingUpload of pendingResourceUploads) {
        const { id: localId, file } = pendingUpload;
        setProgressLabel(`Đang tải ${file.name}...`);
        updatePendingUpload(localId, { status: "uploading", progress: 0, error: undefined });

        const preparation = await safeAction(() =>
          prepareLessonResourceUpload(courseId, nextLesson.id, fileMetadata(file)),
        );
        if ("error" in preparation) {
          updatePendingUpload(localId, { status: "error", error: preparation.error });
          throw new Error(preparation.error);
        }

        pendingResourceReservation = {
          resourceId: preparation.data.resourceId,
          localId,
        };
        const task = createResumableUploadTask({
          file,
          storagePath: preparation.data.storagePath,
          uploadEndpoint: preparation.data.uploadEndpoint,
          uploadToken: preparation.data.uploadToken,
          onProgress: (progress) => updatePendingUpload(localId, { progress }),
        });
        activeUploadRef.current = { id: localId, task };
        setActiveUploadId(localId);

        try {
          await task.promise;
        } catch (error) {
          if (error instanceof UploadCancelledError) throw error;
          updatePendingUpload(localId, {
            status: "error",
            error: "Kết nối bị gián đoạn. Có thể thử tải lại.",
          });
          throw new Error(`Không thể tải ${file.name}. Vui lòng thử lại.`);
        } finally {
          activeUploadRef.current = null;
          setActiveUploadId(null);
        }

        const completion = await safeAction(() =>
          completeLessonResourceUpload(courseId, nextLesson.id, preparation.data.resourceId),
        );
        if ("error" in completion) {
          updatePendingUpload(localId, { status: "error", error: completion.error });
          throw new Error(completion.error);
        }

        pendingResourceReservation = null;
        nextLesson = {
          ...nextLesson,
          resources: [...nextLesson.resources, completion.data],
        };
        setResources(nextLesson.resources);
        setWorkingLesson(nextLesson);
        setPendingResourceUploads((current) => current.filter((item) => item.id !== localId));
        onSaved(nextLesson);
      }

      setWorkingLesson(nextLesson);
      onSaved(nextLesson);
      toast.success(lesson ? "Đã cập nhật bài học." : "Đã tạo bài học.");
      onOpenChange(false);
    } catch (error) {
      if (pendingContentPath && savedLessonId) {
        await safeAction(() =>
          cancelLessonContentUpload(courseId, savedLessonId!, pendingContentPath!),
        );
      }
      if (pendingResourceReservation && savedLessonId) {
        await safeAction(() =>
          cancelLessonResourceUpload(
            courseId,
            savedLessonId!,
            pendingResourceReservation!.resourceId,
          ),
        );
        updatePendingUpload(pendingResourceReservation.localId, {
          status: error instanceof UploadCancelledError ? "cancelled" : "error",
          progress: 0,
          ...(error instanceof UploadCancelledError ? { error: "Đã huỷ tải lên." } : {}),
        });
      }

      if (error instanceof UploadCancelledError) toast.info(error.message);
      else toast.error(error instanceof Error ? error.message : "Không thể lưu bài học.");
    } finally {
      activeUploadRef.current = null;
      setActiveUploadId(null);
      setIsSaving(false);
      setIsCancelling(false);
      setContentUploadProgress(null);
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
                <div className="border-border flex items-center gap-2 rounded-xl border border-dashed px-4 py-4">
                  <label
                    htmlFor="lesson-content-file"
                    className="focus-within:ring-ring flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg focus-within:ring-3"
                  >
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
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
                          ? "MP4, WEBM, MOV · tối đa 50MB"
                          : "PDF · tối đa 50MB"}
                      </span>
                    </span>
                    <input
                      key={fileInputKey}
                      id="lesson-content-file"
                      type="file"
                      disabled={isSaving}
                      accept={
                        lessonType === "video"
                          ? "video/mp4,video/webm,video/quicktime"
                          : "application/pdf"
                      }
                      className="sr-only"
                      onChange={(event) => chooseContentFile(event.currentTarget.files?.[0])}
                    />
                  </label>
                  {contentFile && !isSaving ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Bỏ chọn ${contentFile.name}`}
                      onClick={() => {
                        setContentFile(null);
                        setFileInputKey((current) => current + 1);
                      }}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
                {contentUploadProgress !== null ? (
                  <div className="grid gap-1" aria-live="polite">
                    <div className="flex items-center justify-between text-xs">
                      <span>Đang tải nội dung</span>
                      <span className="text-muted-foreground tabular-nums">
                        {contentUploadProgress}%
                      </span>
                    </div>
                    <Progress
                      value={contentUploadProgress}
                      aria-label={`Tiến trình tải nội dung ${contentUploadProgress}%`}
                    />
                  </div>
                ) : null}
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
                  Video, PDF, DOCX hoặc hình ảnh · tối đa {MAX_LESSON_RESOURCES} file. Video tối đa
                  50MB, tài liệu 50MB và ảnh 10MB.
                </p>
              </div>

              {(resources.length > 0 || pendingResourceUploads.length > 0) && (
                <ul className="grid gap-2">
                  {resources.map((resource) => {
                    const ResourceIcon = resourceIcon(resource.mimeType);
                    return (
                      <li
                        key={resource.id}
                        className="border-border flex items-center gap-3 rounded-lg border px-3 py-2"
                      >
                        <ResourceIcon
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
                          disabled={isSaving || deletingResourceId === resource.id}
                          onClick={() => void removeResource(resource)}
                        >
                          {deletingResourceId === resource.id ? (
                            <Loader2Icon className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2Icon aria-hidden="true" />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                  {pendingResourceUploads.map((pendingUpload) => {
                    const ResourceIcon = resourceIcon(pendingUpload.file.type);
                    const isUploading = pendingUpload.status === "uploading";
                    const hasError =
                      pendingUpload.status === "error" || pendingUpload.status === "cancelled";
                    return (
                      <li
                        key={pendingUpload.id}
                        className="border-primary/20 bg-primary/5 grid gap-2 rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <ResourceIcon
                            className="text-primary size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="block truncate font-medium">
                              {pendingUpload.file.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatFileSize(pendingUpload.file.size)}
                              {isUploading ? ` · ${pendingUpload.progress}%` : " · Chờ tải lên"}
                            </span>
                          </span>
                          {hasError ? (
                            <CircleAlertIcon
                              className="text-destructive size-4"
                              aria-hidden="true"
                            />
                          ) : pendingUpload.progress === 100 ? (
                            <CircleCheckIcon className="text-success size-4" aria-hidden="true" />
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              isUploading
                                ? `Huỷ tải ${pendingUpload.file.name}`
                                : `Bỏ ${pendingUpload.file.name}`
                            }
                            disabled={isCancelling && activeUploadId === pendingUpload.id}
                            onClick={() => removePendingUpload(pendingUpload.id)}
                          >
                            {isCancelling && activeUploadId === pendingUpload.id ? (
                              <Loader2Icon className="animate-spin" aria-hidden="true" />
                            ) : (
                              <XIcon aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                        {isUploading ? (
                          <Progress
                            value={pendingUpload.progress}
                            aria-label={`Tiến trình tải ${pendingUpload.file.name}: ${pendingUpload.progress}%`}
                          />
                        ) : null}
                        {pendingUpload.error ? (
                          <p className="text-destructive text-xs" role="alert">
                            {pendingUpload.error}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <label
                htmlFor="lesson-resources"
                aria-disabled={isSaving}
                className="border-border hover:bg-muted flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-sm transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                <PaperclipIcon aria-hidden="true" />
                Chọn tài liệu
                <input
                  id="lesson-resources"
                  type="file"
                  multiple
                  disabled={isSaving}
                  accept={LESSON_RESOURCE_ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    chooseResourceFiles(Array.from(event.currentTarget.files ?? []));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving && (!activeUploadId || isCancelling)}
            onClick={() => (isSaving ? void cancelActiveUpload() : onOpenChange(false))}
          >
            {isCancelling ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
            {isSaving ? "Huỷ tải lên" : "Huỷ"}
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
