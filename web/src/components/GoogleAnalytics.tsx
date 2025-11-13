"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      const { message, filename, lineno, colno, error } = event;

      console.group("🔥 JavaScript Error Detected");
      console.error("Type:", error?.name || "Error");
      console.error("Message:", message);
      console.error("File:", filename);
      console.error("Line:", lineno, "Column:", colno);
      console.error("Page:", window.location.pathname);
      if (error?.stack) {
        console.error("Stack:", error.stack);
      }
      console.groupEnd();

      // Track to GA4
      console.log("📤 Sending to GA4...");
      console.log("gtag available?", typeof window.gtag);

      if (window.gtag) {
        const errorData = {
          error_type: error?.name || "Error",
          error_message: message,
          error_stack: error?.stack || `${filename}:${lineno}:${colno}`,
          page_path: window.location.pathname,
        };
        console.log("📦 GA4 Event Data:", errorData);
        window.gtag("event", "error_occurred", errorData);
        console.log("✅ GA4 event sent!");
      } else {
        console.warn("❌ gtag not available yet");
      }
    };

    // Unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason);

      console.group("🔥 Promise Rejection");
      console.error("Message:", message);
      console.error("Page:", window.location.pathname);
      console.groupEnd();

      if (window.gtag) {
        window.gtag("event", "error_occurred", {
          error_type: "PromiseRejection",
          error_message: message,
          page_path: window.location.pathname,
        });
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // Test helper function - intentionally generates errors for testing
    (window as any).testError = (type = "TypeError") => {
      console.log("🧪 Generating test error...");
      setTimeout(() => {
        if (type === "TypeError") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj: any = null;
          obj.property = "test";
        } else if (type === "Reference") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log((window as any).undefinedVariable);
        } else {
          throw new Error("Test error from testError() function");
        }
      }, 0);
    };

    console.info(
      '💡 Test error tracking: testError() or testError("Reference")'
    );

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (!GA_MEASUREMENT_ID) {
    console.warn("[GA4] Measurement ID not configured");
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: true,
              debug_mode: ${process.env.NODE_ENV === "development"}
            });
            console.log('[GA4] Initialized with measurement ID: ${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}
