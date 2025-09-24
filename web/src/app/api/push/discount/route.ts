import { NextRequest, NextResponse } from "next/server";
import { sendDiscountNotification } from "../route";

// ფასდაკლების შეტყობინების API
export async function POST(request: NextRequest) {
  try {
    const { discount } = await request.json();

    if (!discount || !discount.title || !discount.percentage) {
      return NextResponse.json(
        {
          success: false,
          message: "ფასდაკლების ინფორმაცია არასრულია",
        },
        { status: 400 }
      );
    }

    console.log("💰 ფასდაკლების შეტყობინების გაგზავნა:", discount.title);

    const result = await sendDiscountNotification({
      title: discount.title,
      percentage: discount.percentage,
      category: discount.category,
    });

    return NextResponse.json({
      success: true,
      message: `ფასდაკლების შეტყობინება გაიგზავნა ${result.successful} მომხმარებელზე`,
      stats: {
        sent: result.successful,
        failed: result.failed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("❌ ფასდაკლების შეტყობინების შეცდომა:", error);
    return NextResponse.json(
      {
        success: false,
        message: "სერვერის შეცდომა",
      },
      { status: 500 }
    );
  }
}

// ტესტური ფასდაკლების შეტყობინება
export async function GET() {
  try {
    const testDiscount = {
      title: "სპეციალური ფასდაკლება",
      percentage: 25,
      category: "ნახატები",
    };

    const result = await sendDiscountNotification(testDiscount);

    return NextResponse.json({
      success: true,
      message: "ტესტური ფასდაკლების შეტყობინება გაიგზავნა",
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
