import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import { isSiteClosed } from "@/lib/site-closed";
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

const closed = isSiteClosed();

export const metadata: Metadata = closed
  ? {
      title: "Sitio cerrado — Terremoto Venezuela 2026",
      description:
        "Este sitio ha sido cerrado. Consulte Comando Con Vzla para información actualizada.",
      robots: { index: false, follow: false },
    }
  : {
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
  viewportFit: "cover",
  themeColor: "#ffffff",
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
      <body
        className={`flex min-h-dvh flex-col bg-white text-slate-700 ${closed ? "overflow-y-auto" : "h-dvh overflow-hidden"}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
