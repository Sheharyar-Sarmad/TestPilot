// frontend/app/fix/[processid]/result/page.tsx
import type { Metadata } from "next";
import { ResultClient } from "./result-client";

// THE FIX: Opt out of prerendering
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ processid: string }>;
}): Promise<Metadata> {
  const { processid } = await params;
  const shortId = processid ? processid.slice(0, 8) : "Unknown";
  return {
    title: `Result Of Code File`,
    description: "View the AI-generated diagnosis, corrected code, diff, and sandbox verification results.",
    openGraph: {
      title: `TestPilot AI — Repair Result (${shortId})`,
      description: "AI diagnosis, corrected code, diff, and verification results.",
      url: `https://testpilot-chi.vercel.app/fix/${processid}/result`,
      siteName: "TestPilot AI",
      images: [{ url: "/og-result.png", width: 1200, height: 630, alt: "TestPilot AI - Code Repair Result" }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `TestPilot AI — Repair Result (${shortId})`,
      description: "AI diagnosis, corrected code, diff, and verification results.",
      images: ["/og-result.png"],
    },
  };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ processid: string }>;
}) {
  const { processid } = await params;
  return <ResultClient processId={processid} />;
}