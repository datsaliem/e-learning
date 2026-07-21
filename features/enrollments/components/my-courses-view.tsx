"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpenIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyCourseCard } from "@/features/enrollments/components/my-course-card";
import type { EnrollmentStatus, MyCourseEnrollment } from "@/features/enrollments/types";

const TABS: { value: EnrollmentStatus; label: string; emptyDescription: string }[] = [
  {
    value: "in_progress",
    label: "Đang học",
    emptyDescription: "Bạn chưa có khoá học nào đang học dở.",
  },
  {
    value: "completed",
    label: "Đã hoàn thành",
    emptyDescription: "Bạn chưa hoàn thành khoá học nào.",
  },
  {
    value: "expired",
    label: "Đã hết hạn",
    emptyDescription: "Không có khoá học nào hết hạn truy cập.",
  },
];

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <BookOpenIcon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Button variant="outline" nativeButton={false} render={<Link href={actionHref} />}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function MyCoursesView({ enrollments }: { enrollments: MyCourseEnrollment[] }) {
  const [search, setSearch] = React.useState("");

  if (enrollments.length === 0) {
    return (
      <EmptyState
        title="Bạn chưa ghi danh khoá học nào"
        description="Khám phá các khoá học và bắt đầu hành trình học tập của bạn."
        actionHref="/"
        actionLabel="Khám phá khoá học"
      />
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? enrollments.filter(
        (enrollment) =>
          enrollment.courseTitle.toLowerCase().includes(normalizedSearch) ||
          enrollment.instructorName.toLowerCase().includes(normalizedSearch),
      )
    : enrollments;

  const byStatus = (status: EnrollmentStatus) =>
    filtered.filter((enrollment) => enrollment.status === status);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-sm">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Tìm theo tên khoá học, giảng viên..."
          className="pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Tabs defaultValue="in_progress">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} ({byStatus(tab.value).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const items = byStatus(tab.value);
          return (
            <TabsContent key={tab.value} value={tab.value} className="pt-4">
              {items.length === 0 ? (
                <EmptyState
                  title={
                    normalizedSearch
                      ? "Không tìm thấy khoá học phù hợp"
                      : `Chưa có ở mục "${tab.label}"`
                  }
                  description={
                    normalizedSearch ? "Thử tìm với từ khoá khác." : tab.emptyDescription
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {items.map((enrollment) => (
                    <MyCourseCard key={enrollment.enrollmentId} enrollment={enrollment} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
