// frontend/app/fix/[processid]/page.tsx
import type { Metadata } from "next";
import { ProcessClient } from "./process-client";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ processid: string }>;
}): Promise<Metadata> {
  const { processid } = await params;
  const shortId = processid ? processid.slice(0, 8) : "Unknown";
  return {
    title: `Processing ${shortId}`,
    description: "Real-time AI code analysis and autonomous repair in progress.",
    openGraph: {
      title: `TestPilot AI — Processing Code (${shortId})`,
      description: "Real-time AI code analysis and autonomous repair in progress.",
      url: `https://testpilot.vercel.app/fix/${processid}`,
      siteName: "TestPilot AI",
      images: [{ url: "/og-process.png", width: 1200, height: 630, alt: "TestPilot AI - Processing Code" }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `TestPilot AI — Processing Code (${shortId})`,
      description: "Real-time AI code analysis and autonomous repair in progress.",
      images: ["/og-process.png"],
    },
  };
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ processid: string }>;
}) {
  const { processid } = await params;
  return <ProcessClient processId={processid} />;
}