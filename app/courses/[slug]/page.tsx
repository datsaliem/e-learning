import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { JsonLd } from "@/components/seo/json-ld";
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
import { getPublicSeoSettings } from "@/features/seo/queries";
import { buildCourseBreadcrumbJsonLd, buildCourseJsonLd } from "@/features/seo/structured-data";
import { absoluteSiteUrl, getSiteUrl } from "@/lib/site-url";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

const getCachedCourseBySlug = cache(getCourseBySlug);

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [course, settings, siteUrl] = await Promise.all([
    getCachedCourseBySlug(slug),
    getPublicSeoSettings(),
    getSiteUrl(),
  ]);

  if (!course) {
    return {
      title: "Không tìm thấy khoá học",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/courses/${course.slug}`;
  const socialImage = absoluteSiteUrl(course.thumbnailUrl ?? settings.defaultOgImageUrl, siteUrl);

  return {
    title: course.title,
    description: course.description,
    keywords: [
      course.title,
      course.categoryLabel,
      course.instructor.name,
      "khóa học online",
      "e-learning",
    ],
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: settings.indexSite,
      follow: settings.followLinks,
      googleBot: {
        index: settings.indexSite,
        follow: settings.followLinks,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: settings.siteName,
      url: canonicalPath,
      title: course.title,
      description: course.description,
      images: [{ url: socialImage, alt: course.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description: course.description,
      images: [socialImage],
      ...(settings.twitterHandle
        ? {
            site: settings.twitterHandle,
            creator: settings.twitterHandle,
          }
        : {}),
    },
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const course = await getCachedCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const [user, reviews, relatedCourses, isEnrolled, settings, siteUrl] = await Promise.all([
    getCurrentUser(),
    getCourseReviews(course.id),
    getRelatedCourses(course),
    getEnrollmentStatus(course.id),
    getPublicSeoSettings(),
    getSiteUrl(),
  ]);

  return (
    <>
      <JsonLd id="course-json-ld" data={buildCourseJsonLd(course, settings, siteUrl)} />
      <JsonLd id="course-breadcrumb-json-ld" data={buildCourseBreadcrumbJsonLd(course, siteUrl)} />
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
