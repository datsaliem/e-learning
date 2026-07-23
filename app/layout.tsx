import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/features/auth/queries";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { CartProvider } from "@/features/cart/components/cart-provider";
import { getInitialCart } from "@/features/cart/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "E-Learning",
    template: "%s | E-Learning",
  },
  description: "Nền tảng học trực tuyến E-Learning",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const initialCart = user ? await getInitialCart(user.id) : [];

  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider userId={user?.id ?? null} initialItems={initialCart}>
          <SiteHeader
            user={user ? { name: user.fullName ?? user.email, email: user.email } : undefined}
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
