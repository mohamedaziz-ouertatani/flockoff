import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Condensed display face for the wordmark and headings.
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${SITE_NAME} · Streetwear from Tunis`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_TN",
    title: `${SITE_NAME} · Streetwear from Tunis`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables must live on <html>: globals.css applies `font-sans` to html, and a
    // variable defined on <body> would be unresolved there (falling back to a serif).
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${anton.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
