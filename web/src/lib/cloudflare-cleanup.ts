// Utility to clean up Cloudflare cookies that cause domain mismatch in development
export const cleanupCloudflareCookies = () => {
  if (
    process.env.NODE_ENV === "development" &&
    typeof document !== "undefined"
  ) {
    const cloudflareCookies = ["__cf_bm", "__cfruid", "cf_clearance"];

    cloudflareCookies.forEach((cookieName) => {
      // Try to delete from all possible domains
      const domains = [
        "localhost",
        ".localhost",
        window.location.hostname,
        `.${window.location.hostname}`,
      ];

      domains.forEach((domain) => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      });
    });
  }
};

// Auto-cleanup on module load in development
if (process.env.NODE_ENV === "development") {
  cleanupCloudflareCookies();

  // Set up periodic cleanup
  const cleanup = () => cleanupCloudflareCookies();

  if (typeof window !== "undefined") {
    // Clean up when page loads
    window.addEventListener("load", cleanup);

    // Clean up periodically
    setInterval(cleanup, 10000); // Every 10 seconds

    // Filter out React DevTools recommendation message and auth errors
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args) => {
      const message = args.join(" ");
      if (
        message.includes("Download the React DevTools") ||
        message.includes("react-devtools") ||
        message.includes("User profile updated")
      ) {
        return; // Skip React DevTools and user profile messages
      }
      originalConsoleLog.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(" ");
      if (
        message.includes("_ga_") ||
        message.includes("__cf_bm") ||
        message.includes("cookie") ||
        message.includes("expires") ||
        message.includes("overwritten") ||
        message.includes("rejected for invalid domain") ||
        message.includes("Partitioned") ||
        message.includes("access_token") ||
        message.includes("refresh_token") ||
        message.includes("preloaded with link preload") ||
        message.includes("preload tag") ||
        message.includes("logo-white") ||
        message.includes("_next/static/media")
      ) {
        return; // Skip cookie and preload warnings in development
      }
      originalConsoleWarn.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(" ");
      if (
        message.includes("401") ||
        message.includes("Session expired") ||
        message.includes("auth/refresh")
      ) {
        // Convert expected auth errors to debug messages
        console.debug("🔐 Auth check:", message);
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }
}
