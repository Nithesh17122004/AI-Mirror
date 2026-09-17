import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { Cta } from "@/components/cta";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Texvalley I-RIS — ${siteConfig.slogan}`,
  description: siteConfig.supporting,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Cta />
    </>
  );
}
