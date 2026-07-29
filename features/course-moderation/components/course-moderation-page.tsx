"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookCheckIcon, InboxIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseModerationCard } from "@/features/course-moderation/components/course-moderation-card";
import {
  ModerationActionDialog,
  type ModerationDialogState,
} from "@/features/course-moderation/components/moderation-action-dialog";
import { ModerationPreviewDialog } from "@/features/course-moderation/components/moderation-preview-dialog";
import { MODERATION_TABS } from "@/features/course-moderation/constants";
import type {
  ModerationActionResult,
  ModerationCourse,
  ModerationDecision,
} from "@/features/course-moderation/types";
import type { CourseStatusAction } from "@/types/course";

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("vi-VN");
}

export function CourseModerationPage({ initialCourses }: { initialCourses: ModerationCourse[] }) {
  const router = useRouter();
  const [courses, setCourses] = React.useState(initialCourses);
  const [search, setSearch] = React.useState("");
  const [previewCourseId, setPreviewCourseId] = React.useState<string | null>(null);
  const [dialogState, setDialogState] = React.useState<ModerationDialogState | null>(null);

  React.useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  const normalizedSearch = normalizeSearch(search);
  const filteredCourses = normalizedSearch
    ? courses.filter((course) =>
        [course.title, course.slug, course.instructor.fullName, course.category].some((value) =>
          normalizeSearch(value).includes(normalizedSearch),
        ),
      )
    : courses;
  const previewCourse = courses.find((course) => course.id === previewCourseId) ?? null;
  const pendingCount = courses.filter((course) => course.status === "pending_review").length;
  const publishedCount = courses.filter((course) => course.status === "published").length;

  function openAction(course: ModerationCourse, decision: ModerationDecision) {
    setPreviewCourseId(null);
    setDialogState({ course, decision });
  }

  function handleCompleted(result: Extract<ModerationActionResult, { data: unknown }>["data"]) {
    const actionByStatus: Record<typeof result.status, CourseStatusAction> = {
      published: "approved",
      changes_requested: "changes_requested",
      rejected: "rejected",
    };

    setCourses((current) =>
      current.map((course) =>
        course.id === result.courseId
          ? {
              ...course,
              status: result.status,
              latestReviewFeedback: result.feedback,
              latestReviewedAt: result.reviewedAt,
              publishedAt: result.publishedAt,
              history: [
                {
                  id: `local-${result.reviewedAt}`,
                  fromStatus: "pending_review",
                  toStatus: result.status,
                  action: actionByStatus[result.status],
                  reason: result.feedback,
                  changedByRole: "admin",
                  createdAt: result.reviewedAt,
                },
                ...course.history,
              ],
            }
          : course,
      ),
    );
    router.refresh();
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
            Quản trị nội dung
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kiểm duyệt khóa học</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Xem preview, phản hồi cho giảng viên và theo dõi toàn bộ lịch sử xuất bản.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="warning">{pendingCount} chờ duyệt</Badge>
          <Badge variant="success">{publishedCount} đã xuất bản</Badge>
        </div>
      </header>

      <Card size="sm">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <label htmlFor="course-moderation-search" className="sr-only">
              Tìm khóa học
            </label>
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="course-moderation-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Tìm theo khóa học, slug hoặc giảng viên..."
              className="pl-8"
            />
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <BookCheckIcon className="size-4" aria-hidden="true" />
            {filteredCourses.length} khóa học phù hợp
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending_review">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            {MODERATION_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <Badge variant="secondary">
                  {courses.filter((course) => course.status === tab.value).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {MODERATION_TABS.map((tab) => {
          const tabCourses = filteredCourses.filter((course) => course.status === tab.value);

          return (
            <TabsContent key={tab.value} value={tab.value} className="pt-4">
              {tabCourses.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {tabCourses.map((course) => (
                    <CourseModerationCard
                      key={course.id}
                      course={course}
                      onPreview={() => setPreviewCourseId(course.id)}
                      onAction={(decision) => openAction(course, decision)}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-border bg-muted/20 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
                  <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
                    <InboxIcon aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-semibold">
                    {normalizedSearch
                      ? "Không tìm thấy khóa học"
                      : `Chưa có ${tab.label.toLowerCase()}`}
                  </h2>
                  <p className="text-muted-foreground mt-1 max-w-md text-sm">
                    {normalizedSearch
                      ? "Thử tìm bằng tiêu đề, slug hoặc tên giảng viên khác."
                      : "Danh sách sẽ tự cập nhật khi trạng thái khóa học thay đổi."}
                  </p>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <ModerationPreviewDialog
        course={previewCourse}
        onOpenChange={(open) => !open && setPreviewCourseId(null)}
        onAction={(decision) => {
          if (previewCourse) openAction(previewCourse, decision);
        }}
      />
      <ModerationActionDialog
        state={dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
        onCompleted={handleCompleted}
      />
    </main>
  );
}
