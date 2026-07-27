import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/features/auth/queries";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { CartProvider } from "@/features/cart/components/cart-provider";
import { getInitialCart } from "@/features/cart/queries";
import { getNotificationSnapshot } from "@/features/notifications/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "E-Learning";
const SITE_DESCRIPTION =
  "Học kỹ năng mới, tiến xa hơn trong sự nghiệp với các khóa học trực tuyến chất lượng.";

function fallbackSiteUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";
  const siteUrl =
    host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)
      ? new URL(`${protocol}://${host}`)
      : fallbackSiteUrl();
  const socialImage = new URL("/og.png", siteUrl);

  return {
    metadataBase: siteUrl,
    title: {
      default: SITE_TITLE,
      template: `%s | ${SITE_TITLE}`,
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url: siteUrl,
      siteName: SITE_TITLE,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: socialImage,
          width: 1731,
          height: 909,
          alt: "E-Learning — Học kỹ năng mới, tiến xa hơn trong sự nghiệp",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [socialImage],
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
  const user = await getCurrentUser();
  const userHeaderData = user
    ? await Promise.all([getInitialCart(user.id), getNotificationSnapshot(user.id)])
    : null;
  const initialCart = userHeaderData?.[0] ?? [];
  const notificationSnapshot = userHeaderData?.[1];

  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
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
