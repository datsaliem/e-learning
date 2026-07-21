import { QuoteIcon, StarIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import type { Testimonial } from "@/features/testimonials/types";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-4">
        <QuoteIcon className="text-primary/30 size-8" aria-hidden="true" />

        <div className="flex items-center gap-0.5" aria-label={`${testimonial.rating} trên 5 sao`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon
              key={index}
              className={
                index < testimonial.rating
                  ? "fill-warning text-warning size-4"
                  : "text-muted-foreground/30 size-4"
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <p className="text-muted-foreground flex-1 text-sm">“{testimonial.content}”</p>

        <div className="flex items-center gap-2.5 pt-2">
          <Avatar className="size-9">
            <AvatarFallback>{getInitials(testimonial.studentName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{testimonial.studentName}</p>
            <p className="text-muted-foreground text-xs">{testimonial.courseTitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
