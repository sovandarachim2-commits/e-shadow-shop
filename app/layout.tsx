import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toasts } from "@/components/toasts";

export const metadata: Metadata = {
  title: "Shadow Commerce",
  description: "Premium modern e-commerce store"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main>{children}</main>
          <Footer />
          <Toasts />
        </Providers>
      </body>
    </html>
  );
}
