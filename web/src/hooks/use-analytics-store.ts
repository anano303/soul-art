import { useState, useCallback } from "react";

export interface AnalyticsData {
  pageViews: number;
  visitors: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ page: string; views: number }>;
  topSources: Array<{ source: string; visitors: number }>;
  errors?: {
    total: number;
    byType: Array<{ type: string; count: number }>;
  };
}

export interface DetailedErrorData {
  total: number;
  summary: Array<{
    type: string;
    count: number;
    uniqueErrors: number;
    details: Array<{
      message: string;
      endpoint: string;
      status: string;
      page: string;
      count: number;
    }>;
  }>;
  topFailingEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    category: string;
  }>;
  period: string;
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

  const [detailedErrors, setDetailedErrors] =
    useState<DetailedErrorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data from backend
  const fetchAnalytics = useCallback(async (days: number = 7) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/analytics/ga4?days=${days}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const analyticsData = await response.json();

      // Transform data to match our interface
      setData({
        pageViews:
          analyticsData.pageViews?.reduce(
            (sum: number, p: any) => sum + p.views,
            0
          ) || 0,
        visitors: analyticsData.pageViews?.length || 0,
        sessions:
          analyticsData.userJourneys?.reduce(
            (sum: number, j: any) => sum + j.count,
            0
          ) || 0,
        bounceRate: 0,
        avgSessionDuration: analyticsData.userJourneys?.[0]?.avgTime || 0,
        topPages: analyticsData.pageViews?.slice(0, 5) || [],
        topSources: [],
        errors: {
          total:
            analyticsData.errors?.reduce(
              (sum: number, e: any) => sum + e.count,
              0
            ) || 0,
          byType: analyticsData.errors || [],
        },
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      setError("Failed to fetch analytics data");
      setIsLoading(false);
    }
  }, []);

  // Fetch detailed errors
  const fetchDetailedErrors = useCallback(
    async (errorType?: string, days: number = 7) => {
      try {
        setIsLoadingErrors(true);

        const url = new URL(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/analytics/ga4/errors`
        );
        url.searchParams.append("days", days.toString());
        if (errorType) {
          url.searchParams.append("errorType", errorType);
        }

        const response = await fetch(url.toString(), {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch detailed errors");
        }

        const errorsData = await response.json();
        setDetailedErrors(errorsData);
        setIsLoadingErrors(false);
      } catch (error) {
        console.error("Detailed errors fetch error:", error);
        setIsLoadingErrors(false);
      }
    },
    []
  );

  return {
    data,
    detailedErrors,
    isLoading,
    isLoadingErrors,
    error,
    fetchAnalytics,
    fetchDetailedErrors,
  };
};
