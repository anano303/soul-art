"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export function CacheRefreshManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "seller")) {
      return;
    }

    // Function to refresh admin data
    const refreshAdminData = () => {
      console.log("🔄 Auto-refreshing admin data...");

      // Invalidate admin-specific queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      if (user.role === "admin") {
        queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      }

      setLastRefresh(new Date());
    };

    // Initial refresh
    refreshAdminData();

    // Set up intervals for different data types
    const intervals: NodeJS.Timeout[] = [];

    // Critical data (pending products, withdrawals) - every 30 seconds
    if (user.role === "admin") {
      intervals.push(
        setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
          queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
        }, 30 * 1000)
      );
    }

    // User data and products - every 1 minute
    intervals.push(
      setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }, 60 * 1000)
    );

    // Full data refresh every 5 minutes
    intervals.push(setInterval(refreshAdminData, 5 * 60 * 1000));

    // Cleanup intervals on unmount
    return () => {
      intervals.forEach((interval) => clearInterval(interval));
    };
  }, [user, queryClient]);

  // Refresh on window focus for admin users
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "seller")) {
      return;
    }

    const handleFocus = () => {
      const timeSinceLastRefresh = Date.now() - lastRefresh.getTime();

      // Only refresh if it's been more than 30 seconds since last refresh
      if (timeSinceLastRefresh > 30 * 1000) {
        console.log("🔄 Window focused - refreshing admin data...");

        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });

        if (user.role === "admin") {
          queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
        }

        setLastRefresh(new Date());
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, queryClient, lastRefresh]);

  return null; // This component doesn't render anything
}
