import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LenisProvider } from "@/components/providers/LenisProvder";
import { ThreeBackground } from "@/components/animations/ThreeBackground";
import { AppLoader } from "@/components/animations/AppLoader";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TestPilot AI — Single-file code repair & verification",
    template: "%s · TestPilot AI",
  },
  description:
    "AI-powered single-file code debugging, repair, and verification. Diagnose root causes, view diffs, and see honestly-reported test results.",
  // Add your favicon/icons here
  icons: {
    icon: "/meta-logo.png",
    shortcut: "/meta-logo.png",
    apple: "/meta-logo.png",
  },
  // Open Graph metadata for social sharing (LinkedIn, Discord, etc.)
  openGraph: {
    title: "TestPilot AI — Autonomous Code Repair",
    description: "One file. One fix. Verified. AI-powered single-file code debugging and sandbox verification.",
    url: "https://testpilot.ai", // Replace with your actual domain when deployed
    siteName: "TestPilot AI",
    images: [
      {
        url: "/og-home.png", // This file needs to be in your public/ folder
        width: 1200,
        height: 630,
        alt: "TestPilot AI - Autonomous Code Repair",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  // Twitter metadata
  twitter: {
    card: "summary_large_image",
    title: "TestPilot AI — Autonomous Code Repair",
    description: "One file. One fix. Verified.",
    images: ["/og-home.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-foreground">
        <ThemeProvider>
          <LenisProvider>
            <AppLoader />
            <ThreeBackground />
            <Navbar />
            <main className="flex-1 relative z-10 pt-24">{children}</main>{" "}
            <Footer />
          </LenisProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}