import { useState, useCallback } from "react";

export interface AnalyticsData {
  pageViews: number;
  visitors: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ page: string; views: number }>;
  topSources: Array<{ source: string; visitors: number }>;
}

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    pageViews: 0,
    visitors: 0,
    sessions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    topPages: [],
    topSources: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch mock analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock data for demonstration
      // Production-ში ეს უნდა შეიცვალოს Vercel Analytics API calls-ით
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setData({
        pageViews: Math.floor(Math.random() * 10000),
        visitors: Math.floor(Math.random() * 5000),
        sessions: Math.floor(Math.random() * 3000),
        bounceRate: Math.floor(Math.random() * 100),
        avgSessionDuration: Math.floor(Math.random() * 300),
        topPages: [
          { page: "/", views: Math.floor(Math.random() * 1000) },
          { page: "/shop", views: Math.floor(Math.random() * 800) },
          { page: "/products", views: Math.floor(Math.random() * 600) },
          { page: "/about", views: Math.floor(Math.random() * 400) },
          { page: "/contact", views: Math.floor(Math.random() * 200) },
        ],
        topSources: [
          { source: "Google", visitors: Math.floor(Math.random() * 1000) },
          { source: "Facebook", visitors: Math.floor(Math.random() * 500) },
          { source: "Direct", visitors: Math.floor(Math.random() * 800) },
          { source: "Instagram", visitors: Math.floor(Math.random() * 300) },
        ],
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      setError("Failed to fetch analytics data");
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchAnalytics,
  };
};
