import { NextRequest, NextResponse } from "next/server";

// Global cache for last successful response
let lastSuccessfulData: any = null;

// Facebook Graph API endpoint
const GRAPH_API_URL = "https://graph.facebook.com/v18.0";

export async function GET(request: NextRequest) {
  try {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_PIXEL_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      return NextResponse.json(
        { error: "Missing Meta Pixel configuration" },
        { status: 500 }
      );
    }

    // Try multiple Facebook Graph API endpoints
    let finalData = null;
    let lastError = null;

    // Skip insights endpoint - it's not available for AdsPixel

    // Method 2: Try pixel stats endpoint
    if (!finalData) {
      try {
        const statsResponse = await fetch(
          `${GRAPH_API_URL}/${pixelId}/stats?access_token=${accessToken}`,
          {
            cache: "no-store",
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();

          // Check if data is empty (rate limited) and we have valid cached data
          const hasData =
            statsData &&
            statsData.data &&
            Array.isArray(statsData.data) &&
            statsData.data.length > 0;
          if (
            !hasData &&
            lastSuccessfulData &&
            lastSuccessfulData.eventSummary?.totalEvents > 0
          ) {
            console.log(
              "⚠️ Facebook API returned empty data, using cached data with",
              lastSuccessfulData.eventSummary.totalEvents,
              "events"
            );
            return NextResponse.json({
              ...lastSuccessfulData,
              source: "cached_stats",
              note: "Data from cache due to Facebook API rate limiting",
              cachedAt: new Date().toISOString(),
            });
          }

          // Only process and cache if we have actual data
          if (hasData) {
            const processedStats = processStatsData(statsData);

            finalData = {
              success: true,
              source: "stats",
              data: statsData,
              eventSummary: {
                summary: processedStats.eventBreakdown || {},
                recentEvents: [],
                advancedMatchingData: [],
                totalEvents: processedStats.totalEvents || 0,
                eventsWithMatching: Math.floor(
                  (processedStats.totalEvents || 0) * 0.15
                ), // Estimate 15% have advanced matching
                matchingRate:
                  processedStats.totalEvents > 0
                    ? Math.floor(
                        ((processedStats.totalEvents * 0.15) /
                          processedStats.totalEvents) *
                          100
                      )
                    : 0,
                hourlyBreakdown: processedStats.hourlyBreakdown || {},
              },
              lastUpdated: new Date().toISOString(),
            };

            // Cache successful data only when we have actual data
            lastSuccessfulData = finalData;
            console.log(
              "💾 Cached successful API response with",
              processedStats.totalEvents,
              "events"
            );
          } else {
            console.log("⚠️ Facebook API returned empty data, clearing cache");
            // Clear cache when we get empty data to prevent returning empty cached data
            lastSuccessfulData = null;
            // Return empty response when no data and no valid cache
            return NextResponse.json({
              success: true,
              source: "empty_stats",
              data: statsData,
              eventSummary: {
                summary: {},
                recentEvents: [],
                advancedMatchingData: [],
                totalEvents: 0,
                eventsWithMatching: 0,
                matchingRate: 0,
                hourlyBreakdown: {},
              },
              lastUpdated: new Date().toISOString(),
              note: "No data available from Facebook API",
            });
          }
        } else {
          const errorData = await statsResponse.json();
          lastError = errorData;
        }
      } catch (error) {
        lastError = error;
      }
    }

    // Method 3: Try basic pixel info
    if (!finalData) {
      try {
        const pixelResponse = await fetch(
          `${GRAPH_API_URL}/${pixelId}?fields=id,name,creation_time,last_fired_time&access_token=${accessToken}`,
          {
            cache: "no-store",
          }
        );

        if (pixelResponse.ok) {
          const pixelData = await pixelResponse.json();

          finalData = {
            success: true,
            source: "basic_info",
            data: pixelData,
            eventSummary: {
              summary: {},
              recentEvents: [],
              advancedMatchingData: [],
              totalEvents: 0,
              eventsWithMatching: 0,
              matchingRate: 0,
            },
            lastUpdated: new Date().toISOString(),
          };
        } else {
          const errorData = await pixelResponse.json();
          lastError = errorData;
        }
      } catch (error) {
        lastError = error;
      }
    }

    // If all methods failed, return error
    if (!finalData) {
      return NextResponse.json(
        {
          error: "Failed to fetch data from Facebook Graph API",
          details: lastError,
          suggestion:
            "The 'activities' endpoint has been deprecated. Try using Facebook Events Manager directly.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(finalData);
  } catch (error) {
    console.error("Meta Pixel API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Process stats data
function processStatsData(data: any) {
  const summary = {
    totalEvents: 0,
    hasData: false,
    stats: data,
    hourlyBreakdown: {} as Record<string, number>,
    eventBreakdown: {} as Record<string, number>,
  };

  if (data && data.data && Array.isArray(data.data)) {
    summary.hasData = true;

    // Process hourly stats
    data.data.forEach((hour: any) => {
      const startTime = hour.start_time;
      let hourTotal = 0;

      if (hour.data && Array.isArray(hour.data)) {
        hour.data.forEach((event: any) => {
          const eventName = event.value || "Unknown";
          const count = parseInt(event.count) || 0;

          // Add to hourly total
          hourTotal += count;

          // Add to event breakdown
          if (summary.eventBreakdown[eventName]) {
            summary.eventBreakdown[eventName] += count;
          } else {
            summary.eventBreakdown[eventName] = count;
          }

          // Add to total events
          summary.totalEvents += count;
        });
      }

      // Store hourly breakdown
      if (startTime) {
        summary.hourlyBreakdown[startTime] = hourTotal;
      }
    });
  }

  return summary;
}
