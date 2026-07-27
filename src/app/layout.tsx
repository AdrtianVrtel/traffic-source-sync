import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@ant-design/v5-patch-for-react-19";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Traffic Source Sync",
  description: "Interný nástroj na synchronizáciu PostHog dát",
};
import { RefineProvider } from "@/providers/refine-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <Suspense fallback={null}>
            <RefineProvider>{children}</RefineProvider>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}
