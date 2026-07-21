import { StarIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactNumber } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import type { CourseReview } from "@/features/courses/types";

function StarRow({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon
          key={index}
          className={
            index < Math.round(rating)
              ? `fill-warning text-warning ${size}`
              : `text-muted-foreground/30 ${size}`
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CourseReviews({
  reviews,
  rating,
  reviewCount,
}: {
  reviews: CourseReview[];
  rating: number;
  reviewCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đánh giá từ học viên</CardTitle>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-2xl font-semibold">{rating.toFixed(1)}</span>
          <StarRow rating={rating} />
          <span className="text-muted-foreground text-sm">
            ({formatCompactNumber(reviewCount)} đánh giá)
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có đánh giá nào cho khoá học này.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback>{getInitials(review.studentName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{review.studentName}</span>
                  <StarRow rating={review.rating} size="size-3.5" />
                </div>
                <p className="text-muted-foreground text-sm">{review.content}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
