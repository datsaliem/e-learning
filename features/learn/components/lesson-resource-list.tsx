import { DownloadIcon, FileIcon } from "lucide-react";

import type { LearningResource } from "@/features/learn/types";

export function LessonResourceList({ resources }: { resources: LearningResource[] }) {
  if (resources.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="lesson-resources-heading">
      <h2 id="lesson-resources-heading" className="text-base font-semibold">
        Tài liệu bài học
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {resources.map((resource) => (
          <li key={resource.id}>
            <a
              href={resource.downloadUrl}
              download={resource.name}
              className="border-border hover:bg-muted focus-visible:ring-ring flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3"
            >
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <FileIcon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{resource.name}</span>
                <span className="text-muted-foreground block text-xs">{resource.fileLabel}</span>
              </span>
              <DownloadIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Tải xuống {resource.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
