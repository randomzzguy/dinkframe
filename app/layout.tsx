import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
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
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
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
  themeColor: "#f7f8f1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
