import type { Metadata } from "next";
import { Video } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Live Try-On" };

export default function LivePage() {
  return (
    <PlaceholderPage
      icon={Video}
      feature={{
        badge: "Being prepared",
        title: "Live Try-On",
        description:
          "A real-time mirror experience for Texvalley stores — stand in front of the display and see garments follow your movement.",
        expectations: [
          "In-store camera mirror (no home camera needed in Phase 1)",
          "Gesture-friendly product switching",
          "Staff-assisted session controls",
        ],
      }}
    />
  );
}
