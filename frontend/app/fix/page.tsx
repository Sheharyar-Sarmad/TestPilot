// frontend/app/fix/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { FixClient } from "@/components/layout/FixClient";

export const metadata: Metadata = {
  title: "Fix Code", // Will render as "Fix Code · TestPilot AI" due to layout.tsx template
  description: "Submit your Python, JavaScript, or TypeScript code for AI-powered diagnosis, automated repair, and sandbox verification.",
  openGraph: {
    title: "TestPilot AI — Fix Your Code",
    description: "One file. One fix. Verified. Submit your code for autonomous AI repair and real-time verification.",
    url: "https://testpilot-chi.vercel.app/fix", // Replace with your actual domain when deployed
    siteName: "TestPilot AI",
    images: [
      {
        url: "/og-fix.png",
        width: 1200,
        height: 630,
        alt: "TestPilot AI - Fix Your Code",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TestPilot AI — Fix Your Code",
    description: "One file. One fix. Verified. Submit your code for autonomous AI repair.",
    images: ["/og-fix.png"],
  },
};

export default function FixPage() {
  return (
    <Suspense fallback={null}>
      <FixClient />
    </Suspense>
  );
}