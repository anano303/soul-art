import { NextRequest, NextResponse } from "next/server";

// Real-time user activity tracking endpoint
// This will log user activities with personal info for admin dashboard

interface UserActivity {
  id: string;
  userName: string;
  email?: string;
  phone?: string;
  eventType: string;
  url: string;
  timestamp: string;
  userAgent: string;
  ip: string;
  device: string;
  location?: string;
}

// In-memory storage for demo (in production use database)
let userActivities: UserActivity[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, email, phone, eventType, url, additionalData } = body;

    // Get user info from request headers
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";

    // Detect device type
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const device = isMobile ? "Mobile" : "Desktop";

    // Create activity record
    const activity: UserActivity = {
      id: Date.now().toString(),
      userName: userName || "Anonymous",
      email: email || null,
      phone: phone || null,
      eventType: eventType || "PageView",
      url: url || "/",
      timestamp: new Date().toISOString(),
      userAgent,
      ip: ip.split(",")[0], // Take first IP if multiple
      device,
      location: additionalData?.location || null,
    };

    // Add to activities (keep last 100)
    userActivities.unshift(activity);
    if (userActivities.length > 100) {
      userActivities = userActivities.slice(0, 100);
    }

    // Also send to Meta Pixel if configured
    // This enhances Facebook's tracking with our user data
    console.log("🎯 User Activity Tracked:", {
      user: activity.userName,
      event: activity.eventType,
      url: activity.url,
      device: activity.device,
    });

    return NextResponse.json({
      success: true,
      message: "Activity tracked successfully",
      activityId: activity.id,
    });
  } catch (error) {
    console.error("❌ Error tracking user activity:", error);
    return NextResponse.json(
      { error: "Failed to track activity" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return recent activities for admin dashboard
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const activities = userActivities.slice(0, limit);

    // Process activities for dashboard
    const summary = {
      totalActivities: userActivities.length,
      uniqueUsers: new Set(userActivities.map((a) => a.userName)).size,
      recentUsers: activities.map((activity) => ({
        name: activity.userName,
        email: activity.email,
        phone: activity.phone,
        eventType: activity.eventType,
        url: activity.url,
        timestamp: activity.timestamp,
        device: activity.device,
        ip: activity.ip,
        hasAdvancedMatching: !!(activity.email || activity.phone),
      })),
      eventBreakdown: userActivities.reduce((acc, activity) => {
        acc[activity.eventType] = (acc[activity.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      deviceBreakdown: userActivities.reduce((acc, activity) => {
        acc[activity.device] = (acc[activity.device] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      success: true,
      activities,
      summary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching user activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
