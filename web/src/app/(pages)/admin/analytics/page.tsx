import { Metadata } from "next";
import AnalyticsDashboard from "@/components/analytics-dashboard/analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics Dashboard | SoulArt Admin",
  description:
    "Vercel Analytics Dashboard - ვიზიტორები, ტრაფიკი, Performance მეტრიკები",
};

export default function AnalyticsPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <AnalyticsDashboard />
    </div>
  );
}
