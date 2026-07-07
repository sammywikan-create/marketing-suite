import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PasswordGate from "@/components/PasswordGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1A237E",
};

export const metadata: Metadata = {
  title: "Marketing Suite — Aplikasi Manajemen Marketing",
  description: "Aplikasi manajemen marketing lengkap: Dashboard, Content Tracker, Campaign Log, KOL Tracker, Budget & ROI, AIDA Funnel, dan lainnya.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marketing Suite",
  },
};

import UpdateBanner from "@/components/UpdateBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full"><PasswordGate>{children}</PasswordGate><UpdateBanner /></body>
    </html>
  );
}
