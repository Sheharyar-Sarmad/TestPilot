// frontend/app/not-found.tsx
import type { Metadata } from "next";
import NotFoundClient from "@/components/layout/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved.",
  openGraph: {
    title: "TestPilot AI — 404 Not Found",
    description: "The route you are trying to access does not exist in the current filesystem.",
    url: "https://testpilot.vercel.app/404", // Replace with your actual domain
    siteName: "TestPilot AI",
    images: [
      {
        url: "/og-notfound.png",
        width: 1200,
        height: 630,
        alt: "TestPilot AI - 404 Page Not Found",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TestPilot AI — 404 Not Found",
    description: "The route you are trying to access does not exist.",
    images: ["/og-notfound.png"],
  },
  robots: {
    index: false, // Don't index 404 pages in search engines
    follow: false,
  },
};

export default function NotFound() {
  return <NotFoundClient />;
}