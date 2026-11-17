import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
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
  title: { default: "FLOCK OFF", template: "%s · FLOCK OFF" },
  description: "Independent streetwear brand from Tunis.",
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
