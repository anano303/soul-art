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

    // Try multiple Facebook Graph API endpoints for events/stats
    let eventsData = null;
    let eventsResponse;
    
    // Method 1: Try server_events endpoint
    try {
      eventsResponse = await fetch(
        `${GRAPH_API_URL}/${pixelId}/server_events?access_token=${accessToken}&limit=100`,
        {
          cache: "no-store",
        }
      );
      
      if (eventsResponse.ok) {
        eventsData = await eventsResponse.json();
      }
    } catch (error) {
      console.log("server_events endpoint not available");
    }

    // Method 2: If server_events failed, try events endpoint
    if (!eventsData) {
      try {
        eventsResponse = await fetch(
          `${GRAPH_API_URL}/${pixelId}/events?access_token=${accessToken}&limit=100`,
          {
            cache: "no-store",
          }
        );
        
        if (eventsResponse.ok) {
          eventsData = await eventsResponse.json();
        }
      } catch (error) {
        console.log("events endpoint not available");
      }
    }

    // Method 3: If both failed, try insights
    if (!eventsData) {
      eventsResponse = await fetch(
        `${GRAPH_API_URL}/${pixelId}/insights?access_token=${accessToken}&breakdowns=device_platform,placement&date_preset=today`,
        {
          cache: "no-store",
        }
      );
    }

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.json();
      console.error("Facebook API Error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch events from Facebook", details: errorData },
        { status: eventsResponse.status }
      );
    }

    const eventsData = await eventsResponse.json();

    // Fetch stats/insights if available
    let statsData = null;
    try {
      const statsResponse = await fetch(
        `${GRAPH_API_URL}/${pixelId}/stats?access_token=${accessToken}`,
        {
          cache: "no-store",
        }
      );

      if (statsResponse.ok) {
        statsData = await statsResponse.json();
      }
    } catch (error) {
      console.warn("Stats endpoint not available:", error);
    }

    // Process events to get summary
    const eventSummary = processEvents(eventsData.data || []);

    return NextResponse.json({
      success: true,
      events: eventsData.data || [],
      eventSummary,
      stats: statsData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Meta Pixel API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// Process events to create summary
function processEvents(events: any[]) {
  const summary: Record<string, number> = {
    PageView: 0,
    ViewContent: 0,
    AddToCart: 0,
    InitiateCheckout: 0,
    Purchase: 0,
    Search: 0,
    SubscribedButtonClick: 0,
    Lead: 0,
    CompleteRegistration: 0,
  };

  const recentEvents: any[] = [];
  const advancedMatchingData: any[] = [];

  events.forEach((event) => {
    // Count events by type
    const eventName = event.event_name || event.event || "Unknown";
    if (summary.hasOwnProperty(eventName)) {
      summary[eventName]++;
    } else {
      summary[eventName] = 1;
    }

    // Store recent events with details
    if (recentEvents.length < 20) {
      recentEvents.push({
        name: eventName,
        timestamp: event.event_time || event.timestamp,
        url: event.event_source_url || "",
        browser: event.user_data?.client_user_agent || "",
        ip: event.user_data?.client_ip_address ? "***.***.***.**" : "", // Masked for privacy
        email: event.user_data?.em ? "***@***.***" : "", // Masked
        phone: event.user_data?.ph ? "***-***-****" : "", // Masked
        hasAdvancedMatching:
          !!event.user_data?.em ||
          !!event.user_data?.ph ||
          !!event.user_data?.fn,
      });
    }

    // Collect advanced matching parameters
    if (event.user_data) {
      const hasMatching = {
        email: !!event.user_data.em,
        phone: !!event.user_data.ph,
        firstName: !!event.user_data.fn,
        lastName: !!event.user_data.ln,
        city: !!event.user_data.ct,
        state: !!event.user_data.st,
        zip: !!event.user_data.zp,
        country: !!event.user_data.country,
        externalId: !!event.user_data.external_id,
      };

      const matchingCount = Object.values(hasMatching).filter(Boolean).length;
      if (matchingCount > 0) {
        advancedMatchingData.push({
          eventName,
          matchingCount,
          parameters: Object.keys(hasMatching).filter(
            (key) => hasMatching[key as keyof typeof hasMatching]
          ),
        });
      }
    }
  });

  return {
    summary,
    recentEvents,
    advancedMatchingData,
    totalEvents: events.length,
    eventsWithMatching: advancedMatchingData.length,
    matchingRate:
      events.length > 0
        ? Math.round((advancedMatchingData.length / events.length) * 100)
        : 0,
  };
}
