import { Metadata } from "next";
import { Suspense } from "react";
import GA4Dashboard from "@/components/ga4-dashboard/ga4-dashboard";

export const metadata: Metadata = {
  title: "Analytics Dashboard | SoulArt Admin",
  description:
    "Comprehensive Analytics - Google Analytics 4, Vercel Analytics, Performance მეტრიკები",
};

export default function AnalyticsPage() {
  return (
    <div>
      <Suspense
        fallback={
          <div style={{ padding: "40px", textAlign: "center" }}>
            იტვირთება...
          </div>
        }
      >
        <GA4Dashboard />
      </Suspense>
    </div>
  );
}
