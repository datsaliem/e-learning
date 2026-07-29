import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstructorDashboardLoading() {
  return (
    <div className="bg-muted/25 flex-1" aria-busy="true" aria-label="Đang tải bảng điều khiển">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-72 max-w-full" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="hidden h-9 w-32 sm:block" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton className="h-14 w-full" key={index} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
