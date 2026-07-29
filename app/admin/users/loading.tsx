import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Đang tải danh sách người dùng"
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <Card size="sm">
        <CardContent className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_8rem]">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      <div className="rounded-xl border">
        <Skeleton className="h-12 w-full rounded-b-none" />
        <div className="space-y-px">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 border-t px-4 py-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="hidden h-5 w-20 sm:block" />
              <Skeleton className="hidden h-5 w-20 sm:block" />
              <Skeleton className="size-8" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
