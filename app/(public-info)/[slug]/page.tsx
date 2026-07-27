import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "@/components/public/content-page";
import {
  isPublicPageSlug,
  PUBLIC_PAGE_CONTENT,
  type PublicPageSlug,
} from "@/lib/public-page-content";

interface PublicInfoPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: PublicPageSlug }> {
  return (Object.keys(PUBLIC_PAGE_CONTENT) as PublicPageSlug[]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PublicInfoPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isPublicPageSlug(slug)) {
    return { title: "Không tìm thấy trang" };
  }

  const content = PUBLIC_PAGE_CONTENT[slug];
  return {
    title: content.title,
    description: content.description,
  };
}

export default async function PublicInfoPage({ params }: PublicInfoPageProps) {
  const { slug } = await params;
  if (!isPublicPageSlug(slug)) {
    notFound();
  }

  return <ContentPage content={PUBLIC_PAGE_CONTENT[slug]} />;
}
