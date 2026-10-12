// frontend/app/fix/[processid]/page.tsx
import type { Metadata } from "next";
import { ProcessClient } from "./process-client";

// Use generateMetadata for dynamic routes
export async function generateMetadata({
  params,
}: {
  params: Promise<{ processid: string }>;
}): Promise<Metadata> {
  const { processid } = await params;

  // We slice the ID to keep the title clean (e.g., "b1fd5cfb...")
  const shortId = processid ? processid.slice(0, 8) : "Unknown";

  return {
    title: `Processing ${shortId}`, // Will render as "Processing b1fd5cfb · TestPilot AI"
    description: "Real-time AI code analysis and autonomous repair in progress.",
    openGraph: {
      title: `TestPilot AI — Processing Code (${shortId})`,
      description: "Real-time AI code analysis and autonomous repair in progress.",
      url: `https://testpilot.ai/fix/${processid}`, // Replace with your actual domain
      siteName: "TestPilot AI",
      images: [
        {
          url: "/og-process.png",
          width: 1200,
          height: 630,
          alt: "TestPilot AI - Processing Code",
        },
      ],
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