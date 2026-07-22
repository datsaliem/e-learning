"use client";

import * as React from "react";
import { DragDropProvider, type DragEndEvent, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { toast } from "sonner";
import {
  BookOpenIcon,
  Clock3Icon,
  FileArchiveIcon,
  FileTextIcon,
  GripVerticalIcon,
  LinkIcon,
  ListChecksIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  VideoIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { safeAction } from "@/lib/safe-action";
import { cn } from "@/lib/utils";
import {
  createSection,
  deleteLesson,
  deleteSection,
  reorderLessons,
  reorderSections,
  updateSection,
} from "@/features/curriculum/actions";
import { LessonDialog } from "@/features/curriculum/components/lesson-dialog";
import type {
  CurriculumLesson,
  CurriculumLessonType,
  CurriculumSection,
} from "@/features/curriculum/types";

const LESSON_TYPE_CONFIG: Record<
  CurriculumLessonType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  video: { label: "Video", icon: VideoIcon },
  text: { label: "Văn bản", icon: FileTextIcon },
  pdf: { label: "PDF", icon: FileArchiveIcon },
  external_link: { label: "Liên kết", icon: LinkIcon },
};

function normalizeSections(sections: CurriculumSection[]): CurriculumSection[] {
  return sections.map((section, sectionIndex) => ({
    ...section,
    sortOrder: sectionIndex,
    lessons: section.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      sectionId: section.id,
      sortOrder: lessonIndex,
    })),
  }));
}

function SortableLesson({
  lesson,
  index,
  disabled,
  onEdit,
  onDelete,
}: {
  lesson: CurriculumLesson;
  index: number;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: lesson.id,
    index,
    group: lesson.sectionId,
    type: "lesson",
    accept: "lesson",
    disabled,
  });
  const config = LESSON_TYPE_CONFIG[lesson.type];
  const TypeIcon = config.icon;

  return (
    <li
      ref={ref}
      className={cn(
        "border-border bg-background flex items-center gap-2 rounded-xl border px-2 py-2 shadow-xs transition-opacity sm:px-3",
        isDragging && "opacity-50",
      )}
    >
      <button
        ref={handleRef}
        type="button"
        className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg outline-none focus-visible:ring-3 active:cursor-grabbing"
        aria-label={`Kéo để sắp xếp bài học ${lesson.title}`}
        disabled={disabled}
      >
        <GripVerticalIcon aria-hidden="true" />
      </button>

      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
        <TypeIcon className="size-4" aria-hidden="true" />
      </span>

      <button
        type="button"
        onClick={onEdit}
        className="focus-visible:ring-ring min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-3"
      >
        <span className="block truncate text-sm font-medium">{lesson.title}</span>
        <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{config.label}</span>
          <span className="flex items-center gap-1">
            <Clock3Icon className="size-3" aria-hidden="true" />
            {Math.max(1, Math.ceil(lesson.durationSeconds / 60))} phút
          </span>
          {lesson.resources.length > 0 && (
            <span className="flex items-center gap-1">
              <PaperclipIcon className="size-3" aria-hidden="true" />
              {lesson.resources.length} tài liệu
            </span>
          )}
        </span>
      </button>

      {lesson.isPreview && <Badge variant="secondary">Học thử</Badge>}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Thao tác với ${lesson.title}`}
            />
          }
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon aria-hidden="true" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon aria-hidden="true" />
            Xoá bài học
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function SortableSection({
  section,
  index,
  disabled,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onRename,
  onDelete,
}: {
  section: CurriculumSection;
  index: number;
  disabled: boolean;
  onAddLesson: () => void;
  onEditLesson: (lesson: CurriculumLesson) => void;
  onDeleteLesson: (lesson: CurriculumLesson) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: section.id,
    index,
    type: "section",
    accept: "section",
    disabled,
  });
  const { ref: lessonDropRef, isDropTarget } = useDroppable({
    id: section.id,
    type: "lesson-container",
    accept: "lesson",
    disabled,
  });

  return (
    <article
      ref={ref}
      className={cn(
        "border-border bg-card overflow-hidden rounded-2xl border shadow-sm transition-opacity",
        isDragging && "opacity-50",
      )}
    >
      <header className="bg-muted/40 flex items-center gap-2 border-b px-3 py-3 sm:px-4">
        <button
          ref={handleRef}
          type="button"
          className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg outline-none focus-visible:ring-3 active:cursor-grabbing"
          aria-label={`Kéo để sắp xếp section ${section.title}`}
          disabled={disabled}
        >
          <GripVerticalIcon aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">Section {index + 1}</p>
          <h3 className="truncate font-semibold">{section.title}</h3>
        </div>
        <Badge variant="outline">{section.lessons.length} bài</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Thao tác với section ${section.title}`}
              />
            }
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <PencilIcon aria-hidden="true" />
              Đổi tên
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon aria-hidden="true" />
              Xoá section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={lessonDropRef}
        className={cn(
          "grid min-h-20 gap-3 p-3 transition-colors sm:p-4",
          isDropTarget && "bg-primary/5",
        )}
      >
        {section.lessons.length > 0 ? (
          <ul className="grid gap-2">
            {section.lessons.map((lesson, lessonIndex) => (
              <SortableLesson
                key={lesson.id}
                lesson={lesson}
                index={lessonIndex}
                disabled={disabled}
                onEdit={() => onEditLesson(lesson)}
                onDelete={() => onDeleteLesson(lesson)}
              />
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={onAddLesson}
            className="border-border text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-20 items-center justify-center gap-2 rounded-xl border border-dashed text-sm outline-none focus-visible:ring-3"
          >
            <PlusIcon aria-hidden="true" />
            Thêm bài học đầu tiên
          </button>
        )}

        {section.lessons.length > 0 && (
          <Button type="button" variant="ghost" className="justify-start" onClick={onAddLesson}>
            <PlusIcon aria-hidden="true" />
            Thêm bài học
          </Button>
        )}
      </div>
    </article>
  );
}

interface SectionDialogState {
  open: boolean;
  section: CurriculumSection | null;
}

interface LessonDialogState {
  open: boolean;
  sectionId: string;
  lesson: CurriculumLesson | null;
}

export function CurriculumBuilder({
  courseId,
  initialSections,
}: {
  courseId: string;
  initialSections: CurriculumSection[];
}) {
  const [sections, setSections] = React.useState(() => normalizeSections(initialSections));
  const [sectionDialog, setSectionDialog] = React.useState<SectionDialogState>({
    open: false,
    section: null,
  });
  const [lessonDialog, setLessonDialog] = React.useState<LessonDialogState>({
    open: false,
    sectionId: "",
    lesson: null,
  });
  const [sectionTitle, setSectionTitle] = React.useState("");
  const [isSavingSection, setIsSavingSection] = React.useState(false);
  const [isReordering, setIsReordering] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const lessonCount = sections.reduce((total, section) => total + section.lessons.length, 0);
  const totalDuration = sections.reduce(
    (total, section) =>
      total +
      section.lessons.reduce((sectionTotal, lesson) => sectionTotal + lesson.durationSeconds, 0),
    0,
  );

  function openSectionDialog(section: CurriculumSection | null) {
    setSectionTitle(section?.title ?? "");
    setSectionDialog({ open: true, section });
  }

  async function saveSectionTitle() {
    const title = sectionTitle.trim();
    if (!title) {
      toast.error("Vui lòng nhập tên section.");
      return;
    }

    setIsSavingSection(true);
    const result = sectionDialog.section
      ? await safeAction(() => updateSection(courseId, sectionDialog.section!.id, title))
      : await safeAction(() => createSection(courseId, title));
    setIsSavingSection(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    if (sectionDialog.section) {
      setSections((current) =>
        current.map((section) =>
          section.id === sectionDialog.section!.id
            ? { ...section, title: result.data.title }
            : section,
        ),
      );
      toast.success("Đã cập nhật section.");
    } else {
      if (!("sortOrder" in result.data)) {
        toast.error("Không thể xác định thứ tự section mới.");
        return;
      }
      const newSection = result.data;
      setSections((current) => [
        ...current,
        {
          id: newSection.id,
          courseId,
          title: newSection.title,
          sortOrder: Number(newSection.sortOrder),
          lessons: [],
        },
      ]);
      toast.success("Đã tạo section.");
    }
    setSectionDialog({ open: false, section: null });
  }

  async function removeSection(section: CurriculumSection) {
    const message =
      section.lessons.length > 0
        ? `Xoá “${section.title}” và ${section.lessons.length} bài học bên trong?`
        : `Xoá section “${section.title}”?`;
    if (!window.confirm(message)) return;

    setDeletingId(section.id);
    const result = await safeAction(() => deleteSection(courseId, section.id));
    setDeletingId(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setSections((current) => normalizeSections(current.filter((item) => item.id !== section.id)));
    toast.success("Đã xoá section.");
  }

  async function removeLesson(lesson: CurriculumLesson) {
    if (!window.confirm(`Xoá bài học “${lesson.title}”? Tiến độ liên quan cũng sẽ bị xoá.`)) return;

    setDeletingId(lesson.id);
    const result = await safeAction(() => deleteLesson(courseId, lesson.id));
    setDeletingId(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setSections((current) =>
      normalizeSections(
        current.map((section) => ({
          ...section,
          lessons: section.lessons.filter((item) => item.id !== lesson.id),
        })),
      ),
    );
    toast.success("Đã xoá bài học.");
  }

  function upsertLesson(savedLesson: CurriculumLesson) {
    setSections((current) => {
      const withoutLesson = current.map((section) => ({
        ...section,
        lessons: section.lessons.filter((lesson) => lesson.id !== savedLesson.id),
      }));
      return normalizeSections(
        withoutLesson.map((section) =>
          section.id === savedLesson.sectionId
            ? { ...section, lessons: [...section.lessons, savedLesson] }
            : section,
        ),
      );
    });
  }

  function removeResourceFromState(lessonId: string, resourceId: string) {
    setSections((current) =>
      current.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                resources: lesson.resources.filter((resource) => resource.id !== resourceId),
              }
            : lesson,
        ),
      })),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const source = event.operation.source;
    if (!source || event.canceled) return;

    const previous = sections;
    if (source.type === "section") {
      const next = normalizeSections(move(sections, event) as CurriculumSection[]);
      if (next.every((section, index) => section.id === sections[index]?.id)) return;
      setSections(next);
      setIsReordering(true);
      const result = await safeAction(() =>
        reorderSections(
          courseId,
          next.map((section) => section.id),
        ),
      );
      setIsReordering(false);
      if ("error" in result) {
        setSections(previous);
        toast.error(result.error);
      } else {
        toast.success("Đã lưu thứ tự section.");
      }
      return;
    }

    if (source.type === "lesson") {
      const lessonMap = Object.fromEntries(
        sections.map((section) => [section.id, section.lessons]),
      );
      const movedLessons = move(lessonMap, event) as Record<string, CurriculumLesson[]>;
      const next = normalizeSections(
        sections.map((section) => ({ ...section, lessons: movedLessons[section.id] ?? [] })),
      );
      const previousOrder = sections.flatMap((section) =>
        section.lessons.map((lesson) => `${section.id}:${lesson.id}`),
      );
      const nextOrder = next.flatMap((section) =>
        section.lessons.map((lesson) => `${section.id}:${lesson.id}`),
      );
      if (previousOrder.join("|") === nextOrder.join("|")) return;

      setSections(next);
      setIsReordering(true);
      const result = await safeAction(() =>
        reorderLessons(
          courseId,
          next.map((section) => ({
            sectionId: section.id,
            lessonIds: section.lessons.map((lesson) => lesson.id),
          })),
        ),
      );
      setIsReordering(false);
      if ("error" in result) {
        setSections(previous);
        toast.error(result.error);
      } else {
        toast.success("Đã lưu thứ tự bài học.");
      }
    }
  }

  const disabled = isReordering || deletingId !== null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12" aria-labelledby="curriculum-heading">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id="curriculum-heading" className="flex items-center gap-2">
              <ListChecksIcon className="text-primary" aria-hidden="true" />
              Curriculum
            </CardTitle>
            <CardDescription className="mt-1">
              Kéo section hoặc bài học để sắp xếp. Thứ tự được lưu tự động.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => openSectionDialog(null)}>
            <PlusIcon aria-hidden="true" />
            Tạo section
          </Button>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <BookOpenIcon className="size-4" aria-hidden="true" />
              {sections.length} section
            </span>
            <span className="flex items-center gap-1.5">
              <ListChecksIcon className="size-4" aria-hidden="true" />
              {lessonCount} bài học
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3Icon className="size-4" aria-hidden="true" />
              {Math.ceil(totalDuration / 60)} phút
            </span>
            {isReordering && (
              <span className="text-primary ml-auto flex items-center gap-1.5" role="status">
                <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                Đang lưu thứ tự
              </span>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="border-border bg-muted/20 flex flex-col items-center rounded-2xl border border-dashed px-5 py-12 text-center">
              <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
                <BookOpenIcon aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">Bắt đầu xây dựng curriculum</h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Tạo section đầu tiên, sau đó thêm video, văn bản, PDF hoặc liên kết ngoài.
              </p>
              <Button type="button" className="mt-5" onClick={() => openSectionDialog(null)}>
                <PlusIcon aria-hidden="true" />
                Tạo section đầu tiên
              </Button>
            </div>
          ) : (
            <DragDropProvider onDragEnd={(event) => void handleDragEnd(event)}>
              <div className="grid gap-4">
                {sections.map((section, index) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    index={index}
                    disabled={disabled}
                    onAddLesson={() =>
                      setLessonDialog({ open: true, sectionId: section.id, lesson: null })
                    }
                    onEditLesson={(lesson) =>
                      setLessonDialog({ open: true, sectionId: section.id, lesson })
                    }
                    onDeleteLesson={(lesson) => void removeLesson(lesson)}
                    onRename={() => openSectionDialog(section)}
                    onDelete={() => void removeSection(section)}
                  />
                ))}
              </div>
            </DragDropProvider>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={sectionDialog.open}
        onOpenChange={(open) =>
          !isSavingSection && setSectionDialog((current) => ({ ...current, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sectionDialog.section ? "Đổi tên section" : "Tạo section"}</DialogTitle>
            <DialogDescription>
              Section giúp chia khoá học thành các chương dễ theo dõi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label htmlFor="section-title" className="text-sm font-medium">
              Tên section
            </label>
            <Input
              id="section-title"
              autoFocus
              maxLength={120}
              value={sectionTitle}
              placeholder="Ví dụ: Bắt đầu với Next.js"
              onChange={(event) => setSectionTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveSectionTitle();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSavingSection}
              onClick={() => setSectionDialog({ open: false, section: null })}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              disabled={isSavingSection}
              onClick={() => void saveSectionTitle()}
            >
              {isSavingSection && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              {sectionDialog.section ? "Lưu tên" : "Tạo section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lessonDialog.open && (
        <LessonDialog
          open={lessonDialog.open}
          onOpenChange={(open) => setLessonDialog((current) => ({ ...current, open }))}
          courseId={courseId}
          sections={sections}
          initialSectionId={lessonDialog.sectionId}
          lesson={lessonDialog.lesson}
          onSaved={upsertLesson}
          onResourceDeleted={removeResourceFromState}
        />
      )}
    </section>
  );
}
