"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  ExternalLinkIcon,
  FileWarningIcon,
  Loader2Icon,
  VideoOffIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { safeAction } from "@/lib/safe-action";
import { saveLessonProgress } from "@/features/learn/actions";
import { LessonResourceList } from "@/features/learn/components/lesson-resource-list";
import {
  getCompletionThresholdSeconds,
  type AdjacentLearningLesson,
  type LearningLesson,
} from "@/features/learn/types";

const AUTOSAVE_INTERVAL_MS = 10_000;

const LESSON_TYPE_LABEL = {
  video: "Video",
  text: "Bài đọc",
  pdf: "PDF",
  external_link: "Liên kết ngoài",
} as const;

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface LearnPlayerProps {
  courseId: string;
  courseSlug: string;
  lesson: LearningLesson;
  initialWatchedSeconds: number;
  initialCompleted: boolean;
  previousLesson: AdjacentLearningLesson | null;
  nextLesson: AdjacentLearningLesson | null;
}

export function LearnPlayer({
  courseId,
  courseSlug,
  lesson,
  initialWatchedSeconds,
  initialCompleted,
  previousLesson,
  nextLesson,
}: LearnPlayerProps) {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const durationSeconds = lesson.durationSeconds;
  const completionThreshold = getCompletionThresholdSeconds(lesson.type, durationSeconds);
  const safeInitialSeconds = Math.min(initialWatchedSeconds, durationSeconds);

  const [watchedSeconds, setWatchedSeconds] = React.useState(safeInitialSeconds);
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);
  const watchedSecondsRef = React.useRef(safeInitialSeconds);
  const completedRef = React.useRef(initialCompleted);
  const lastSavedRef = React.useRef(safeInitialSeconds);
  const errorShownRef = React.useRef(false);
  const completionAnnouncedRef = React.useRef(initialCompleted);

  const saveProgress = React.useCallback(
    async (seconds: number) => {
      const normalizedSeconds = Math.min(Math.max(Math.floor(seconds), 0), durationSeconds);

      const previousLastSaved = lastSavedRef.current;
      lastSavedRef.current = normalizedSeconds;
      setIsSaving(true);

      const result = await safeAction(() =>
        saveLessonProgress({
          courseId,
          lessonId: lesson.id,
          watchedSeconds: normalizedSeconds,
        }),
      );

      if ("error" in result) {
        lastSavedRef.current = previousLastSaved;
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          toast.error(result.error);
        }
        if (normalizedSeconds >= completionThreshold) {
          completedRef.current = false;
          setCompleted(false);
        }
        setIsSaving(false);
        return;
      }

      errorShownRef.current = false;
      const savedSeconds = Math.max(watchedSecondsRef.current, result.data.watchedSeconds);
      watchedSecondsRef.current = savedSeconds;
      setWatchedSeconds(savedSeconds);

      if (result.data.completed) {
        completedRef.current = true;
        setCompleted(true);
        if (!completionAnnouncedRef.current) {
          completionAnnouncedRef.current = true;
          toast.success("Đã hoàn thành bài học!");
        }
        router.refresh();
      }

      setIsSaving(false);
    },
    [completionThreshold, courseId, durationSeconds, lesson.id, router],
  );

  React.useEffect(() => {
    function handleVisibilityChange() {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (!visible && watchedSecondsRef.current !== lastSavedRef.current) {
        void saveProgress(watchedSecondsRef.current);
      }
    }

    function handlePageHide() {
      if (watchedSecondsRef.current !== lastSavedRef.current) {
        void saveProgress(watchedSecondsRef.current);
      }
    }

    setIsVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [saveProgress]);

  // Nội dung không phải video tính thời gian khi tab đang hiển thị; video lấy currentTime thật.
  React.useEffect(() => {
    if (lesson.type === "video" || !isVisible || completed) return;

    const interval = window.setInterval(() => {
      setWatchedSeconds((current) => {
        const next = Math.min(current + 1, durationSeconds);
        watchedSecondsRef.current = next;
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [completed, durationSeconds, isVisible, lesson.type]);

  const isActivelyWatching = lesson.type === "video" ? isPlaying : isVisible && !completed;

  React.useEffect(() => {
    if (!isActivelyWatching) return;

    const interval = window.setInterval(() => {
      if (watchedSecondsRef.current !== lastSavedRef.current) {
        void saveProgress(watchedSecondsRef.current);
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isActivelyWatching, saveProgress]);

  React.useEffect(() => {
    if (!completed && watchedSeconds >= completionThreshold) {
      completedRef.current = true;
      setCompleted(true);
      void saveProgress(watchedSeconds);
    }
  }, [completed, completionThreshold, saveProgress, watchedSeconds]);

  function handleVideoLoaded() {
    const video = videoRef.current;
    if (!video || initialCompleted || safeInitialSeconds <= 0) return;
    video.currentTime = Math.min(safeInitialSeconds, Math.max(video.duration - 1, 0));
  }

  function handleVideoTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const seconds = Math.min(Math.floor(event.currentTarget.currentTime), durationSeconds);
    const next = Math.max(watchedSecondsRef.current, seconds);
    watchedSecondsRef.current = next;
    setWatchedSeconds(next);
  }

  function handleVideoPause() {
    setIsPlaying(false);
    if (watchedSecondsRef.current !== lastSavedRef.current) {
      void saveProgress(watchedSecondsRef.current);
    }
  }

  function handleVideoEnded() {
    watchedSecondsRef.current = durationSeconds;
    setWatchedSeconds(durationSeconds);
    setIsPlaying(false);
    void saveProgress(durationSeconds);
  }

  const progressPercent = Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">{lesson.title}</h1>
          {completed && (
            <span className="text-success flex items-center gap-1 text-sm font-medium">
              <CheckCircle2Icon className="size-4" aria-hidden="true" />
              Đã hoàn thành
            </span>
          )}
        </div>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Clock3Icon className="size-4" aria-hidden="true" />
          {LESSON_TYPE_LABEL[lesson.type]} · khoảng {Math.max(1, Math.ceil(durationSeconds / 60))}{" "}
          phút
          {isSaving && (
            <span className="ml-auto flex items-center gap-1" role="status">
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
              Đang lưu
            </span>
          )}
        </p>
      </header>

      {lesson.type === "video" ? (
        lesson.videoUrl && !videoError ? (
          <div className="overflow-hidden rounded-xl bg-black shadow-sm">
            <video
              ref={videoRef}
              src={lesson.videoUrl}
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              aria-label={`Video bài học: ${lesson.title}`}
              className="aspect-video size-full object-contain"
              onLoadedMetadata={handleVideoLoaded}
              onPlay={() => setIsPlaying(true)}
              onPause={handleVideoPause}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              onError={() => setVideoError(true)}
            />
          </div>
        ) : (
          <Alert>
            <VideoOffIcon aria-hidden="true" />
            <AlertTitle>Chưa thể tải video</AlertTitle>
            <AlertDescription>
              Liên kết video có thể đã hết hạn hoặc nội dung đang được cập nhật. Hãy tải lại trang.
            </AlertDescription>
          </Alert>
        )
      ) : lesson.type === "text" ? (
        <article className="bg-card ring-foreground/10 rounded-xl px-5 py-6 leading-7 whitespace-pre-wrap ring-1 sm:px-8 sm:py-8">
          {lesson.content || "Nội dung bài học đang được giảng viên cập nhật."}
        </article>
      ) : lesson.type === "pdf" ? (
        lesson.documentUrl ? (
          <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
            <iframe
              src={lesson.documentUrl}
              title={`Tài liệu PDF: ${lesson.title}`}
              className="h-[70dvh] min-h-[32rem] w-full"
            />
          </div>
        ) : (
          <Alert>
            <FileWarningIcon aria-hidden="true" />
            <AlertTitle>Chưa thể tải PDF</AlertTitle>
            <AlertDescription>
              Tài liệu có thể đang được cập nhật. Hãy tải lại trang sau ít phút.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <div className="bg-card ring-foreground/10 flex flex-col items-start rounded-xl p-6 ring-1 sm:p-8">
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
            <ExternalLinkIcon aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Nội dung trên trang bên ngoài</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Liên kết sẽ mở trong tab mới. Quay lại đây để tiếp tục theo dõi tiến độ.
          </p>
          {lesson.externalUrl ? (
            <Button
              className="mt-5"
              nativeButton={false}
              render={<a href={lesson.externalUrl} target="_blank" rel="noreferrer noopener" />}
            >
              Mở nội dung
              <ExternalLinkIcon aria-hidden="true" />
            </Button>
          ) : (
            <p className="text-destructive mt-4 text-sm">Liên kết chưa được giảng viên cập nhật.</p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2" aria-labelledby="lesson-progress-heading">
        <div className="flex items-center justify-between gap-4 text-sm">
          <h2 id="lesson-progress-heading" className="font-medium">
            Tiến độ bài học
          </h2>
          <span className="text-muted-foreground tabular-nums">
            {formatTime(watchedSeconds)} / {formatTime(durationSeconds)} · {progressPercent}%
          </span>
        </div>
        <Progress value={progressPercent} aria-label={`Tiến độ bài học ${progressPercent}%`} />
        {!completed && (
          <p className="text-muted-foreground text-xs">
            {lesson.type === "video"
              ? "Bài học tự hoàn thành khi bạn xem ít nhất 90% video."
              : "Bài học tự hoàn thành khi bạn đọc đủ thời lượng ước tính."}
          </p>
        )}
      </section>

      <LessonResourceList resources={lesson.resources} />

      <nav
        className="flex items-center justify-between gap-3 border-t pt-5"
        aria-label="Điều hướng bài học"
      >
        {previousLesson ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/learn/${courseSlug}/${previousLesson.id}`} />}
          >
            <ChevronLeftIcon aria-hidden="true" />
            <span>
              <span className="sm:hidden">Bài trước</span>
              <span className="hidden max-w-56 truncate sm:block">{previousLesson.title}</span>
            </span>
          </Button>
        ) : (
          <span />
        )}

        {nextLesson ? (
          <Button
            nativeButton={false}
            render={<Link href={`/learn/${courseSlug}/${nextLesson.id}`} />}
          >
            <span>
              <span className="sm:hidden">Bài tiếp theo</span>
              <span className="hidden max-w-56 truncate sm:block">{nextLesson.title}</span>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
