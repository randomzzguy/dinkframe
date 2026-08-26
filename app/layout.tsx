import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "DINKFRAME — Premium Pickleball Posters",
    template: "%s — DINKFRAME",
  },
  description:
    "Premium, tournament-specific poster design for pickleball athletes.",
  applicationName: "DINKFRAME",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DINKFRAME — Your Game. Our Frame.",
    description: "Premium custom visuals for pickleball athletes.",
    type: "website",
    siteName: "DINKFRAME",
    images: [
      {
        url: "/og.png",
        width: 1734,
        height: 907,
        alt: "DINKFRAME — Your Game. Our Frame.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DINKFRAME — Your Game. Our Frame.",
    description: "Premium custom visuals for pickleball athletes.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#d8ff36",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
