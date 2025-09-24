import { NextRequest, NextResponse } from "next/server";
import { sendNewProductNotification } from "../route";

// ახალი პროდუქტის შეტყობინების API
export async function POST(request: NextRequest) {
  try {
    const { product } = await request.json();

    if (!product || !product.id || !product.title) {
      return NextResponse.json(
        {
          success: false,
          message: "პროდუქტის ინფორმაცია არასრულია",
        },
        { status: 400 }
      );
    }

    console.log("📦 ახალი პროდუქტის შეტყობინების გაგზავნა:", product.title);

    const result = await sendNewProductNotification({
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
    });

    return NextResponse.json({
      success: true,
      message: `ახალი პროდუქტის შეტყობინება გაიგზავნა ${result.successful} მომხმარებელზე`,
      stats: {
        sent: result.successful,
        failed: result.failed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("❌ ახალი პროდუქტის შეტყობინების შეცდომა:", error);
    return NextResponse.json(
      {
        success: false,
        message: "სერვერის შეცდომა",
      },
      { status: 500 }
    );
  }
}

// ტესტური ახალი პროდუქტის შეტყობინება
export async function GET() {
  try {
    const testProduct = {
      id: "test-product-" + Date.now(),
      title: "ახალი ტესტური ნამუშევარი",
      imageUrl: "/van-gogh.jpg",
    };

    const result = await sendNewProductNotification(testProduct);

    return NextResponse.json({
      success: true,
      message: "ტესტური ახალი პროდუქტის შეტყობინება გაიგზავნა",
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
