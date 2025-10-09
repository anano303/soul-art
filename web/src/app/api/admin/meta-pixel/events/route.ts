import { NextRequest, NextResponse } from "next/server";

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

    console.log("Trying Facebook Graph API for Pixel:", pixelId);

    // Try multiple Facebook Graph API endpoints
    let finalData = null;
    let lastError = null;

    // Skip insights endpoint - it's not available for AdsPixel
    console.log("Skipping insights endpoint (not available for AdsPixel)...");

    // Method 2: Try pixel stats endpoint
    if (!finalData) {
      try {
        console.log("Attempting stats endpoint...");
        const statsResponse = await fetch(
          `${GRAPH_API_URL}/${pixelId}/stats?access_token=${accessToken}`,
          {
            cache: "no-store",
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log("Stats success:", statsData);

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
              eventsWithMatching: 0,
              matchingRate: 0,
              hourlyBreakdown: processedStats.hourlyBreakdown || {},
            },
            lastUpdated: new Date().toISOString(),
          };
        } else {
          const errorData = await statsResponse.json();
          console.log("Stats failed:", errorData);
          lastError = errorData;
        }
      } catch (error) {
        console.log("Stats endpoint error:", error);
        lastError = error;
      }
    }

    // Method 3: Try basic pixel info
    if (!finalData) {
      try {
        console.log("Attempting basic pixel info...");
        const pixelResponse = await fetch(
          `${GRAPH_API_URL}/${pixelId}?fields=id,name,creation_time,last_fired_time&access_token=${accessToken}`,
          {
            cache: "no-store",
          }
        );

        if (pixelResponse.ok) {
          const pixelData = await pixelResponse.json();
          console.log("Basic pixel info success:", pixelData);

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
          console.log("Basic pixel info failed:", errorData);
          lastError = errorData;
        }
      } catch (error) {
        console.log("Basic pixel info error:", error);
        lastError = error;
      }
    }

    // If all methods failed, return error
    if (!finalData) {
      console.error("All Facebook API methods failed. Last error:", lastError);
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

// Process insights data
function processInsightsData(data: any) {
  const summary = {
    totalEvents: 0,
    deviceBreakdown: {} as Record<string, number>,
    hasData: false,
  };

  if (data?.data && Array.isArray(data.data)) {
    summary.hasData = data.data.length > 0;

    data.data.forEach((insight: any) => {
      if (insight.impressions) {
        summary.totalEvents += parseInt(insight.impressions) || 0;
      }

      if (insight.device_platform) {
        summary.deviceBreakdown[insight.device_platform] =
          insight.impressions || 0;
      }
    });
  }

  return summary;
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

// Process basic pixel data
function processBasicPixelData(data: any) {
  const summary = {
    pixelId: data.id || "N/A",
    pixelName: data.name || "Pixel",
    creationTime: data.creation_time || null,
    lastFiredTime: data.last_fired_time || null,
    hasData: !!data.id,
    isActive: !!data.last_fired_time,
  };

  return summary;
}
