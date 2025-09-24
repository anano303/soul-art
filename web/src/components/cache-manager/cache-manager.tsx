"use client";

import { useState } from "react";
import { useCacheStatus } from "@/hooks/useCacheStatus";
import "./cache-manager.css";

interface CacheManagerProps {
  showButton?: boolean;
  position?: "fixed" | "relative";
  size?: "small" | "medium" | "large";
}

export function CacheManager({
  showButton = true,
  position = "fixed",
  size = "medium",
}: CacheManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    isStale,
    hasUpdates,
    lastUpdate,
    refreshCache: cacheRefresh,
  } = useCacheStatus();

  const refreshCache = async () => {
    if (!("serviceWorker" in navigator)) {
      alert("თქვენი ბრაუზერი არ იძლევა cache-ის მართვის საშუალებას");
      return;
    }

    setIsRefreshing(true);
    try {
      // Use the hook's refresh function first
      const success = await cacheRefresh();

      if (success) {
        // Wait a bit for user feedback
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Force refresh the page to get fresh content
        window.location.reload();
      } else {
        throw new Error("Cache refresh failed");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Cache-ის გასუფთავებისას მოხდა შეცდომა");
      setIsRefreshing(false);
    }
  };

  if (!showButton) return null;

  return (
    <div className={`cache-manager ${position} ${size}`}>
      <button
        className={`cache-refresh-btn ${size}`}
        onClick={refreshCache}
        disabled={isRefreshing}
        title="ახალი მონაცემების მისაღებად გაასუფთავეთ Cache"
      >
        <span className={`refresh-icon ${isRefreshing ? "spinning" : ""}`}>
          🔄
        </span>
        {size !== "small" && (
          <span className="refresh-text">
            {isRefreshing ? "განახლება..." : "Cache განახლება"}
          </span>
        )}
      </button>

      {lastUpdate && size !== "small" && (
        <div className="last-refresh">
          ბოლო განახლება: {lastUpdate.toLocaleTimeString("ka-GE")}
        </div>
      )}

      {(isStale || hasUpdates) && (
        <div className="cache-status-indicator">
          {hasUpdates ? "🔵 ახალი მონაცემები" : "🟡 მონაცემები მოძველდა"}
        </div>
      )}
    </div>
  );
}
