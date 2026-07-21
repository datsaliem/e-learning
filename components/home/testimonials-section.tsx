import { TestimonialCard } from "@/features/testimonials/components/testimonial-card";
import { SectionHeading } from "@/components/shared/section-heading";
import type { Testimonial } from "@/features/testimonials/types";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <SectionHeading
        title="Học viên nói gì về chúng tôi"
        description="Câu chuyện thực tế từ những người đã học."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </section>
  );
}
