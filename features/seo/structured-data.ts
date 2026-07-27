import type { JsonLdValue } from "@/components/seo/json-ld";
import type { CourseDetail } from "@/features/courses/types";
import type { SeoSettings } from "@/features/seo/types";
import { absoluteSiteUrl } from "@/lib/site-url";

export function buildOrganizationJsonLd(settings: SeoSettings, siteUrl: URL): JsonLdValue {
  const logoUrl = absoluteSiteUrl(
    settings.organizationLogoUrl ?? settings.defaultOgImageUrl,
    siteUrl,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl.origin}/#organization`,
    name: settings.organizationName,
    url: `${siteUrl.origin}/`,
    description: settings.siteDescription,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
    },
  };
}

export function buildCourseJsonLd(
  course: CourseDetail,
  settings: SeoSettings,
  siteUrl: URL,
): JsonLdValue {
  const courseUrl = absoluteSiteUrl(`/courses/${course.slug}`, siteUrl);
  const imageUrl = absoluteSiteUrl(course.thumbnailUrl ?? settings.defaultOgImageUrl, siteUrl);
  const aggregateRating =
    course.rating > 0 && course.reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: course.rating,
          ratingCount: course.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${courseUrl}#course`,
    name: course.title,
    description: course.longDescription || course.description,
    url: courseUrl,
    image: imageUrl,
    inLanguage: course.language ?? "vi",
    educationalLevel: course.level,
    provider: {
      "@type": "Organization",
      "@id": `${siteUrl.origin}/#organization`,
      name: settings.organizationName,
      url: `${siteUrl.origin}/`,
    },
    author: {
      "@type": "Person",
      name: course.instructorDetail.name,
    },
    offers: {
      "@type": "Offer",
      url: courseUrl,
      price: course.price,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      category: course.price === 0 ? "Free" : "Paid",
    },
    aggregateRating,
    totalHistoricalEnrollment: course.studentCount,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${Math.max(1, Math.ceil(course.durationHours))}H`,
      instructor: {
        "@type": "Person",
        name: course.instructorDetail.name,
      },
    },
  };
}

export function buildCourseBreadcrumbJsonLd(course: CourseDetail, siteUrl: URL): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: absoluteSiteUrl("/", siteUrl),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Khóa học",
        item: absoluteSiteUrl("/courses", siteUrl),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: course.title,
        item: absoluteSiteUrl(`/courses/${course.slug}`, siteUrl),
      },
    ],
  };
}
