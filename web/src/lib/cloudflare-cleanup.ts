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

    // Filter out React DevTools recommendation message
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(" ");
      if (
        message.includes("Download the React DevTools") ||
        message.includes("react-devtools")
      ) {
        return; // Skip React DevTools messages
      }
      originalConsoleLog.apply(console, args);
    };
  }
}
