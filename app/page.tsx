import { CtaSection } from "@/components/home/cta-section";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { FeaturedInstructors } from "@/components/home/featured-instructors";
import { HeroSection } from "@/components/home/hero-section";
import { NewCourses } from "@/components/home/new-courses";
import { PopularCourses } from "@/components/home/popular-courses";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import {
  getFeaturedCategories,
  getNewCourses,
  getPopularCourses,
} from "@/features/courses/services";
import { getFeaturedInstructors } from "@/features/instructors/services";
import { getTestimonials } from "@/features/testimonials/services";

export default async function Home() {
  const [categories, popularCourses, newCourses, instructors, testimonials] = await Promise.all([
    getFeaturedCategories(),
    getPopularCourses(),
    getNewCourses(),
    getFeaturedInstructors(),
    getTestimonials(),
  ]);

  return (
    <>
      <HeroSection />
      <FeaturedCategories categories={categories} />
      <PopularCourses courses={popularCourses} />
      <NewCourses courses={newCourses} />
      <FeaturedInstructors instructors={instructors} />
      <TestimonialsSection testimonials={testimonials} />
      <CtaSection />
    </>
  );
}
