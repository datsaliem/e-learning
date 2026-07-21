import { InstructorCard } from "@/features/instructors/components/instructor-card";
import { SectionHeading } from "@/components/shared/section-heading";
import type { Instructor } from "@/features/instructors/types";

export function FeaturedInstructors({ instructors }: { instructors: Instructor[] }) {
  return (
    <section className="bg-muted/30 border-border border-y">
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <SectionHeading
          title="Giảng viên nổi bật"
          description="Học từ những chuyên gia hàng đầu trong ngành."
        />

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </div>
      </div>
    </section>
  );
}
