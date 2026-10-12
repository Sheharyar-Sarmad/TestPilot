import HeroSection from "@/components/layout/HeroSection";
import { HowItWorksSection } from "@/components/layout/HowItWorksSection";
import { PreviewSection } from "@/components/layout/PreviewSection";
import { ComparisonSection } from "@/components/layout/ComparisonSection";
import { SecuritySection } from "@/components/layout/SecuritySection";
import { FAQSection } from "@/components/layout/FAQSection";
import { CTASection } from "@/components/layout/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <PreviewSection />
      <ComparisonSection /> {/* ← add here */}
      <SecuritySection />
      <FAQSection />
      <CTASection />
    </>
  );
}
