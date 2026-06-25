import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { t } from "@/lib/i18n";
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
  title: t.siteTitle,
  description: t.siteDescription,
  openGraph: {
    title: t.siteTitle,
    description: t.siteDescription,
    locale: "es_VE",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00247d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--ve-blue-dark)] text-white">
        {children}
      </body>
    </html>
  );
}
