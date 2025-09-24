import { NextRequest, NextResponse } from "next/server";
import { sendOrderStatusNotification } from "../route";

// შეკვეთის სტატუსის შეტყობინების API
export async function POST(request: NextRequest) {
  try {
    const { order } = await request.json();

    if (!order || !order.id || !order.status) {
      return NextResponse.json(
        {
          success: false,
          message: "შეკვეთის ინფორმაცია არასრულია",
        },
        { status: 400 }
      );
    }

    console.log(
      "📦 შეკვეთის სტატუსის შეტყობინების გაგზავნა:",
      order.id,
      order.status
    );

    const result = await sendOrderStatusNotification({
      id: order.id,
      status: order.status,
      customerEmail: order.customerEmail,
    });

    return NextResponse.json({
      success: true,
      message: `შეკვეთის სტატუსის შეტყობინება გაიგზავნა ${result.successful} მომხმარებელზე`,
      stats: {
        sent: result.successful,
        failed: result.failed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("❌ შეკვეთის სტატუსის შეტყობინების შეცდომა:", error);
    return NextResponse.json(
      {
        success: false,
        message: "სერვერის შეცდომა",
      },
      { status: 500 }
    );
  }
}

// ტესტური შეკვეთის სტატუსის შეტყობინება
export async function GET() {
  try {
    const testOrder = {
      id: "ORDER-" + Date.now(),
      status: "shipped",
      customerEmail: "test@soulart.ge",
    };

    const result = await sendOrderStatusNotification(testOrder);

    return NextResponse.json({
      success: true,
      message: "ტესტური შეკვეთის სტატუსის შეტყობინება გაიგზავნა",
      stats: {
        sent: result.successful,
        failed: result.failed,
      },
    });
  } catch (error) {
    console.error("❌ ტესტური შეტყობინების შეცდომა:", error);
    return NextResponse.json(
      {
        success: false,
        message: "სერვერის შეცდომა",
      },
      { status: 500 }
    );
  }
}
