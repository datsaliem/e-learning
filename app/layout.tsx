import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/features/auth/queries";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { CartProvider } from "@/features/cart/components/cart-provider";
import { getInitialCart } from "@/features/cart/queries";
import { getNotificationSnapshot } from "@/features/notifications/queries";
import { getPublicSeoSettings } from "@/features/seo/queries";
import { buildOrganizationJsonLd } from "@/features/seo/structured-data";
import { absoluteSiteUrl, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [siteUrl, settings] = await Promise.all([getSiteUrl(), getPublicSeoSettings()]);
  const socialImage = absoluteSiteUrl(settings.defaultOgImageUrl, siteUrl);

  return {
    metadataBase: siteUrl,
    applicationName: settings.siteName,
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.siteDescription,
    robots: {
      index: settings.indexSite,
      follow: settings.followLinks,
      nocache: !settings.indexSite,
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
      url: siteUrl,
      siteName: settings.siteName,
      title: settings.siteName,
      description: settings.siteDescription,
      images: [
        {
          url: socialImage,
          alt: `${settings.siteName} — ${settings.siteDescription}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.siteName,
      description: settings.siteDescription,
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

// Header và giỏ hàng phụ thuộc session cookie của từng request.
// Không prerender layout thành trạng thái khách, nếu không user đã đăng nhập vẫn thấy redirect/login.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, settings, siteUrl] = await Promise.all([
    getCurrentUser(),
    getPublicSeoSettings(),
    getSiteUrl(),
  ]);
  const userHeaderData = user
    ? await Promise.all([getInitialCart(user.id), getNotificationSnapshot(user.id)])
    : null;
  const initialCart = userHeaderData?.[0] ?? [];
  const notificationSnapshot = userHeaderData?.[1];

  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <JsonLd id="organization-json-ld" data={buildOrganizationJsonLd(settings, siteUrl)} />
        <CartProvider userId={user?.id ?? null} initialItems={initialCart}>
          <SiteHeader
            user={
              user
                ? {
                    id: user.id,
                    name: user.fullName ?? user.email,
                    email: user.email,
                  }
                : undefined
            }
            notificationSnapshot={notificationSnapshot}
          />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
