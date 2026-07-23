"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  EyeIcon,
  LockKeyholeIcon,
  Loader2Icon,
  OctagonXIcon,
  SaveIcon,
  SendIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  saveCourseDraft,
  submitCourseForReview,
  updateCourseMedia,
} from "@/features/course-builder/actions";
import { CourseMediaField } from "@/features/course-builder/components/course-media-field";
import { CoursePreviewDialog } from "@/features/course-builder/components/course-preview-dialog";
import { CourseReviewPanel } from "@/features/course-builder/components/course-review-panel";
import {
  COURSE_CATEGORY_OPTIONS,
  COURSE_LANGUAGE_OPTIONS,
  COURSE_LEVEL_OPTIONS,
  type CourseMediaKind,
} from "@/features/course-builder/constants";
import { uploadCourseMedia } from "@/features/course-builder/media";
import {
  courseBuilderSchema,
  slugifyCourseTitle,
  validateCourseMediaFile,
  type CourseBuilderInput,
} from "@/features/course-builder/schemas";
import type { CourseWorkflowStatus, OwnedCourseDraft } from "@/features/course-builder/types";
import { isEditableCourseStatus } from "@/types/course";

interface CourseBuilderFormProps {
  instructorName: string;
  initialCourse?: OwnedCourseDraft;
}

type SubmitIntent = "draft" | "review";

const STATUS_CONFIG: Record<
  CourseWorkflowStatus,
  {
    label: string;
    variant: "outline" | "warning" | "success" | "destructive" | "secondary";
  }
> = {
  draft: { label: "Bản nháp", variant: "outline" },
  pending_review: { label: "Chờ duyệt", variant: "warning" },
  changes_requested: { label: "Cần chỉnh sửa", variant: "warning" },
  published: { label: "Đã xuất bản", variant: "success" },
  rejected: { label: "Bị từ chối", variant: "destructive" },
  archived: { label: "Đã lưu trữ", variant: "secondary" },
};

const EMPTY_COURSE: CourseBuilderInput = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  category: "lap-trinh",
  level: "beginner",
  language: "Tiếng Việt",
  thumbnailUrl: "",
  trailerUrl: "",
  price: 0,
  salePrice: undefined,
};

export function CourseBuilderForm({ instructorName, initialCourse }: CourseBuilderFormProps) {
  const router = useRouter();
  const [courseId, setCourseId] = React.useState(initialCourse?.id ?? null);
  const [status, setStatus] = React.useState<CourseWorkflowStatus>(
    initialCourse?.status ?? "draft",
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = React.useState<SubmitIntent | null>(null);
  const [progressLabel, setProgressLabel] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null);
  const [trailerFile, setTrailerFile] = React.useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = React.useState(initialCourse?.thumbnailUrl ?? "");
  const [trailerPreview, setTrailerPreview] = React.useState(initialCourse?.trailerUrl ?? "");
  const thumbnailObjectUrlRef = React.useRef<string | null>(null);
  const trailerObjectUrlRef = React.useRef<string | null>(null);
  const slugWasEdited = React.useRef(Boolean(initialCourse?.slug));

  const form = useForm<CourseBuilderInput>({
    resolver: zodResolver(courseBuilderSchema),
    defaultValues: initialCourse
      ? {
          title: initialCourse.title,
          slug: initialCourse.slug,
          shortDescription: initialCourse.shortDescription,
          fullDescription: initialCourse.fullDescription,
          category: initialCourse.category,
          level: initialCourse.level,
          language: initialCourse.language,
          thumbnailUrl: initialCourse.thumbnailUrl,
          trailerUrl: initialCourse.trailerUrl,
          price: initialCourse.price,
          salePrice: initialCourse.salePrice,
        }
      : EMPTY_COURSE,
  });

  const title = form.watch("title");
  const previewCourse = form.watch();
  const isBusy = pendingIntent !== null;
  const canEdit = isEditableCourseStatus(status);

  React.useEffect(() => {
    if (initialCourse) setStatus(initialCourse.status);
  }, [initialCourse]);

  React.useEffect(() => {
    if (!slugWasEdited.current) {
      form.setValue("slug", slugifyCourseTitle(title), {
        shouldDirty: title.length > 0,
        shouldValidate: false,
      });
    }
  }, [form, title]);

  React.useEffect(() => {
    return () => {
      // Các ref giữ object URL mới nhất, cần đọc tại thời điểm unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (thumbnailObjectUrlRef.current) URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (trailerObjectUrlRef.current) URL.revokeObjectURL(trailerObjectUrlRef.current);
    };
  }, []);

  function selectMedia(kind: CourseMediaKind, file: File) {
    const validationError = validateCourseMediaFile(file, kind);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const objectUrlRef = kind === "thumbnail" ? thumbnailObjectUrlRef : trailerObjectUrlRef;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    if (kind === "thumbnail") {
      setThumbnailFile(file);
      setThumbnailPreview(objectUrl);
    } else {
      setTrailerFile(file);
      setTrailerPreview(objectUrl);
    }
  }

  function commitMedia(kind: CourseMediaKind, url: string) {
    const objectUrlRef = kind === "thumbnail" ? thumbnailObjectUrlRef : trailerObjectUrlRef;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;

    if (kind === "thumbnail") {
      setThumbnailFile(null);
      setThumbnailPreview(url);
    } else {
      setTrailerFile(null);
      setTrailerPreview(url);
    }
  }

  async function persistCourse(values: CourseBuilderInput, intent: SubmitIntent) {
    setFormError(null);
    setPendingIntent(intent);
    setProgressLabel("Đang lưu thông tin khoá học...");
    let savedCourseId = courseId;

    try {
      const saveResult = await safeAction(() => saveCourseDraft(courseId, values));
      if ("error" in saveResult) throw new Error(saveResult.error);

      const activeCourseId = saveResult.data.courseId;
      savedCourseId = activeCourseId;
      setCourseId(activeCourseId);
      setStatus(saveResult.data.status);

      let thumbnailUrl = values.thumbnailUrl;
      let trailerUrl = values.trailerUrl;

      if (thumbnailFile) {
        setProgressLabel("Đang tải thumbnail lên...");
        thumbnailUrl = await uploadCourseMedia(activeCourseId, "thumbnail", thumbnailFile);
      }

      if (trailerFile) {
        setProgressLabel("Đang tải trailer lên...");
        trailerUrl = await uploadCourseMedia(activeCourseId, "trailer", trailerFile);
      }

      if (thumbnailFile || trailerFile) {
        setProgressLabel("Đang liên kết media với khoá học...");
        const mediaResult = await safeAction(() =>
          updateCourseMedia(activeCourseId, {
            thumbnailUrl: thumbnailFile ? thumbnailUrl : undefined,
            trailerUrl: trailerFile ? trailerUrl : undefined,
          }),
        );
        if ("error" in mediaResult) throw new Error(mediaResult.error);
      }

      let nextStatus: CourseWorkflowStatus = saveResult.data.status;
      if (intent === "review") {
        setProgressLabel("Đang gửi khoá học để duyệt...");
        const reviewResult = await safeAction(() => submitCourseForReview(activeCourseId));
        if ("error" in reviewResult) throw new Error(reviewResult.error);
        nextStatus = reviewResult.data.status;
      }

      const savedValues = { ...values, thumbnailUrl, trailerUrl };
      form.reset(savedValues);
      if (thumbnailFile) commitMedia("thumbnail", thumbnailUrl);
      if (trailerFile) commitMedia("trailer", trailerUrl);
      setStatus(nextStatus);

      toast.success(
        intent === "review"
          ? "Khoá học đã được gửi để duyệt."
          : saveResult.data.status === "draft"
            ? "Đã lưu bản nháp khoá học."
            : "Đã lưu các chỉnh sửa.",
      );

      if (!courseId) {
        router.replace(`/instructor/courses/${activeCourseId}/edit`);
      } else {
        router.refresh();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể lưu khoá học. Vui lòng thử lại.";
      setFormError(message);
      toast.error(message);

      if (savedCourseId && !courseId) {
        router.replace(`/instructor/courses/${savedCourseId}/edit`);
      }
    } finally {
      setPendingIntent(null);
      setProgressLabel(null);
    }
  }

  function handleInvalid() {
    setFormError("Một số trường chưa hợp lệ. Vui lòng kiểm tra các thông báo bên dưới.");
  }

  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/instructor/dashboard")}
            className="mb-2 -ml-2"
          >
            <ArrowLeftIcon aria-hidden="true" />
            Bảng điều khiển
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {initialCourse ? "Chỉnh sửa khoá học" : "Tạo khoá học mới"}
            </h1>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Hoàn thiện thông tin, xem trước rồi gửi đội ngũ quản trị phê duyệt.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
          <EyeIcon aria-hidden="true" />
          Xem trước
        </Button>
      </div>

      {initialCourse && <CourseReviewPanel course={initialCourse} />}

      {!canEdit && (
        <Alert>
          <LockKeyholeIcon aria-hidden="true" />
          <AlertDescription>
            Khóa học đang ở trạng thái “{statusConfig.label}”. Thông tin và curriculum hiện chỉ có
            thể xem để đảm bảo nội dung đã gửi duyệt không thay đổi.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(
            (values) => void persistCourse(values, "draft"),
            handleInvalid,
          )}
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <fieldset className="contents" disabled={!canEdit || isBusy}>
            <div className="flex min-w-0 flex-col gap-6">
              {formError && (
                <Alert variant="destructive">
                  <OctagonXIcon aria-hidden="true" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cơ bản</CardTitle>
                  <CardDescription>
                    Giúp học viên hiểu nhanh nội dung và đối tượng của khoá học.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tiêu đề</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: Next.js từ cơ bản đến thực chiến" {...field} />
                        </FormControl>
                        <FormDescription>Tối đa 120 ký tự.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="nextjs-tu-co-ban-den-thuc-chien"
                              {...field}
                              onChange={(event) => {
                                slugWasEdited.current = true;
                                field.onChange(event);
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              slugWasEdited.current = false;
                              form.setValue("slug", slugifyCourseTitle(form.getValues("title")), {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          >
                            Tạo lại
                          </Button>
                        </div>
                        <FormDescription>Dùng trong URL công khai của khoá học.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả ngắn</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tóm tắt giá trị nổi bật của khoá học..."
                            className="min-h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{field.value.length}/220 ký tự.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-5 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Danh mục</FormLabel>
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
                              {COURSE_CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
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
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cấp độ</FormLabel>
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
                              {COURSE_LEVEL_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
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
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ngôn ngữ</FormLabel>
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
                              {COURSE_LANGUAGE_OPTIONS.map((language) => (
                                <SelectItem key={language} value={language}>
                                  {language}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nội dung giới thiệu</CardTitle>
                  <CardDescription>
                    Trình bày kết quả học tập, chủ đề chính và những gì học viên nhận được.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="fullDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả đầy đủ</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Viết mô tả chi tiết về khoá học..."
                            className="min-h-72 resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Từ 100 đến 10.000 ký tự.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
                  <CardDescription>Thumbnail là bắt buộc trước khi gửi duyệt.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <CourseMediaField
                    kind="thumbnail"
                    file={thumbnailFile}
                    previewUrl={thumbnailPreview}
                    disabled={isBusy}
                    onSelect={(file) => selectMedia("thumbnail", file)}
                  />
                  <CourseMediaField
                    kind="trailer"
                    file={trailerFile}
                    previewUrl={trailerPreview}
                    disabled={isBusy}
                    onSelect={(file) => selectMedia("trailer", file)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Giá và xuất bản</CardTitle>
                  <CardDescription>Giá được nhập theo Việt Nam đồng.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá gốc</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1000}
                            value={field.value}
                            onBlur={field.onBlur}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value === "" ? 0 : Number(event.target.value),
                              )
                            }
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>Nhập 0 cho khoá học miễn phí.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá khuyến mãi</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1000}
                            placeholder="Không áp dụng"
                            value={field.value ?? ""}
                            onBlur={field.onBlur}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value === "" ? undefined : Number(event.target.value),
                              )
                            }
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {progressLabel && (
                    <p
                      className="text-muted-foreground flex items-center gap-2 text-sm"
                      role="status"
                    >
                      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                      {progressLabel}
                    </p>
                  )}

                  <div className="grid gap-2">
                    <Button type="submit" variant="outline" disabled={isBusy || !canEdit}>
                      {pendingIntent === "draft" ? (
                        <Loader2Icon className="animate-spin" aria-hidden="true" />
                      ) : (
                        <SaveIcon aria-hidden="true" />
                      )}
                      {status === "draft" ? "Lưu bản nháp" : "Lưu chỉnh sửa"}
                    </Button>
                    <Button
                      type="button"
                      disabled={isBusy || !canEdit}
                      onClick={form.handleSubmit(
                        (values) => void persistCourse(values, "review"),
                        handleInvalid,
                      )}
                    >
                      {pendingIntent === "review" ? (
                        <Loader2Icon className="animate-spin" aria-hidden="true" />
                      ) : (
                        <SendIcon aria-hidden="true" />
                      )}
                      Gửi duyệt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </fieldset>
        </form>
      </Form>

      <CoursePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        course={previewCourse}
        thumbnailUrl={thumbnailPreview}
        trailerUrl={trailerPreview}
        instructorName={instructorName}
      />
    </div>
  );
}
