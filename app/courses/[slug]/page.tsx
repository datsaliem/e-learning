import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/features/auth/queries";
import { getCourseBySlug, getCourseReviews, getRelatedCourses } from "@/features/courses/services";
import { CourseCurriculum } from "@/features/courses/components/course-curriculum";
import { CourseHero } from "@/features/courses/components/course-hero";
import { CourseObjectives } from "@/features/courses/components/course-objectives";
import { CourseRequirements } from "@/features/courses/components/course-requirements";
import { CourseReviews } from "@/features/courses/components/course-reviews";
import { RelatedCourses } from "@/features/courses/components/related-courses";
import { InstructorBioCard } from "@/features/instructors/components/instructor-bio-card";
import { getEnrollmentStatus } from "@/features/enrollments/queries";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return { title: "Không tìm thấy khoá học" };
  }

  return {
    title: course.title,
    description: course.description,
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const [user, reviews, relatedCourses] = await Promise.all([
    getCurrentUser(),
    getCourseReviews(course.id),
    getRelatedCourses(course),
  ]);
  const isEnrolled = await getEnrollmentStatus(course.id);

  return (
    <>
      <CourseHero course={course} isAuthenticated={!!user} isEnrolled={isEnrolled} />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12">
        {course.objectives.length > 0 && <CourseObjectives objectives={course.objectives} />}
        {course.requirements.length > 0 && (
          <CourseRequirements requirements={course.requirements} />
        )}
        <CourseCurriculum curriculum={course.curriculum} />
        <InstructorBioCard instructor={course.instructorDetail} />
        <CourseReviews reviews={reviews} rating={course.rating} reviewCount={course.reviewCount} />
      </div>

      <RelatedCourses courses={relatedCourses} />
    </>
  );
}
