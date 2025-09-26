import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/components/VercelAnalytics";

// Page View Tracking Hook
export const usePageView = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams ? `?${searchParams.toString()}` : "");

    trackEvent("Page View", {
      page: pathname,
      url: url,
      referrer: document.referrer || "direct",
    });
  }, [pathname, searchParams]);
};

// User Behavior Tracking Hook
export const useUserBehavior = () => {
  useEffect(() => {
    // Track scroll depth
    let maxScroll = 0;

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
          100
      );

      if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
        maxScroll = scrollPercent;
        trackEvent("Scroll Depth", {
          percentage: scrollPercent,
        });
      }
    };

    // Track time on page
    const startTime = Date.now();

    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      trackEvent("Time on Page", {
        duration_seconds: timeSpent,
        page: window.location.pathname,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
};
