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

    // Override all console methods for comprehensive filtering
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;

    // Function to check if message should be filtered
    const shouldFilter = (message: string) => {
      const filterKeywords = [
        // React DevTools
        "Download the React DevTools",
        "react-devtools",
        
        // User Profile
        "User profile updated",
        
        // LCP Warnings
        "Largest Contentful Paint",
        "LCP",
        "priority property",
        "above the fold",
        
        // Cookies
        "_ga_",
        "__cf_bm",
        "__cfruid", 
        "cf_clearance",
        "cookie",
        "expires",
        "overwritten",
        "rejected for invalid domain",
        "Partitioned",
        "access_token",
        "refresh_token",
        
        // Preload/CSS
        "preloaded with link preload",
        "preload tag",
        "_next/static/css",
        "_next/static/media",
        ".css",
        "preloaded using link preload",
        "appropriate `as` value",
        "window's load event",
        
        // Images
        "logo-white",
        "warn-once.ts",
        "width or height modified",
        "aspect ratio",
        "S3",
        "amazonaws.com"
      ];
      
      return filterKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    };

    console.log = (...args) => {
      const message = args.join(" ");
      if (shouldFilter(message)) return;
      originalConsoleLog.apply(console, args);
    };
    
    console.warn = (...args) => {
      const message = args.join(" ");
      if (shouldFilter(message)) return;
      originalConsoleWarn.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(" ");
      if (shouldFilter(message)) return;
      originalConsoleError.apply(console, args);
    };
    
    console.info = (...args) => {
      const message = args.join(" ");
      if (shouldFilter(message)) return;
      originalConsoleInfo.apply(console, args);
    };
    
    console.debug = (...args) => {
      const message = args.join(" ");
      if (shouldFilter(message)) return;
      originalConsoleDebug.apply(console, args);
    };

    // Also try to intercept browser's native resource warnings
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (type === 'error' || type === 'warning') {
        // Filter resource loading errors/warnings
        const wrappedListener = function(this: any, event: any) {
          if (event.message && shouldFilter(event.message)) {
            event.preventDefault?.();
            return false;
          }
          if (typeof listener === 'function') {
            return listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            return listener.handleEvent(event);
          }
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      if (listener) {
        return originalAddEventListener.call(this, type, listener, options);
      }
    };
  }
}
