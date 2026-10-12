import HeroSectionAbout from "@/components/layout/HeroSectionAbout";
import ProblemSection from "@/components/layout/ProblemSection";
import WorkflowSection from "@/components/layout/WorkflowSection";
import ArchitectureDiagramSection from "@/components/layout/ArchitectureDiagramSection";
import ArchitectureSection from "@/components/layout/ArchitectureSection";
import SecuritySectionAbout from "@/components/layout/SecuritySectionAbout";
import TechStackSection from "@/components/layout/TechStackSection";
import DeveloperSection from "@/components/layout/DeveloperSection";
import PrivacySection from "@/components/layout/PrivacySection";
import type { Metadata } from "next";

// Add this metadata export to override the default layout metadata
export const metadata: Metadata = {
  title: "About", // This will be used as "About · TestPilot AI" due to the template in layout.tsx
  description: "Learn about the architecture, agentic workflow, and engineering behind TestPilot AI.",
  openGraph: {
    title: "About TestPilot AI — System Architecture",
    description: "Deep dive into the multi-agent LangGraph workflow and distributed system architecture.",
    url: "https://testpilot.ai/about", // Replace with your actual domain
    siteName: "TestPilot AI",
    images: [
      {
        url: "/og-about.png",
        width: 1200,
        height: 630,
        alt: "About TestPilot AI - System Architecture",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About TestPilot AI — System Architecture",
    description: "Deep dive into the multi-agent LangGraph workflow and distributed system architecture.",
    images: ["/og-about.png"],
  },
};

export default function AboutPage() {
  return (
    // No background here, so the global Three.js background stays visible.
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-28 px-4 pb-28 pt-32 sm:px-6 lg:px-8">
        <HeroSectionAbout />
        <ProblemSection />
        <WorkflowSection />
        <ArchitectureDiagramSection />
        <ArchitectureSection />
        <SecuritySectionAbout />
        <TechStackSection />
        <DeveloperSection />
        <PrivacySection />
      </div>
    </main>
  );
}