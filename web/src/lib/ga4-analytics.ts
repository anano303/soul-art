/**
 * Google Analytics 4 (GA4) Tracking Library
 * Comprehensive analytics tracking for SoulArt platform
 */

// Extend window type for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Send events to GA4
 */
export const ga4Event = (
  eventName: string,
  parameters?: Record<string, unknown>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, parameters);
  }
};

/**
 * Track page views
 */
export const ga4PageView = (url: string, title?: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title,
    });
  }
};

// ============================================
// 1. PAGE VIEW TRACKING
// ============================================

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  ga4Event("page_view", {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
    page_referrer: document.referrer,
  });
};

// ============================================
// 2. HOMEPAGE EVENTS
// ============================================

export const trackHomepageEvent = (
  action: string,
  details?: Record<string, unknown>
) => {
  ga4Event("homepage_interaction", {
    action,
    ...details,
  });
};

// Search events
export const trackSearch = (searchTerm: string, resultCount?: number) => {
  ga4Event("search", {
    search_term: searchTerm,
    search_location: "homepage",
    result_count: resultCount,
  });
};

// Navigation events
export const trackNavigation = (
  from: string,
  to: string,
  elementType: string,
  elementLabel?: string
) => {
  ga4Event("navigation", {
    navigation_from: from,
    navigation_to: to,
    element_type: elementType,
    element_label: elementLabel,
  });
};

// Button/Link clicks
export const trackButtonClick = (
  buttonName: string,
  location: string,
  additionalData?: Record<string, unknown>
) => {
  ga4Event("button_click", {
    button_name: buttonName,
    button_location: location,
    ...additionalData,
  });
};

// Artist profile views
export const trackArtistProfileView = (
  artistSlug: string,
  source: "image" | "search" | "link" | "product" | "other",
  additionalData?: Record<string, unknown>
) => {
  ga4Event("artist_profile_view", {
    artist_slug: artistSlug,
    view_source: source,
    ...additionalData,
  });
};

// Product card interactions
export const trackProductInteraction = (
  productId: string,
  action: "view" | "click" | "add_to_cart" | "buy_now",
  source?: string,
  additionalData?: Record<string, unknown>
) => {
  ga4Event("product_interaction", {
    product_id: productId,
    interaction_action: action,
    interaction_source: source,
    ...additionalData,
  });
};

// ============================================
// 3. USER JOURNEY TRACKING
// ============================================

export const trackUserJourney = (
  step: string,
  stepNumber: number,
  additionalData?: Record<string, unknown>
) => {
  ga4Event("user_journey_step", {
    journey_step: step,
    step_number: stepNumber,
    ...additionalData,
  });
};

// Session tracking
export const startUserSession = () => {
  const sessionId = `session_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  sessionStorage.setItem("ga4_session_id", sessionId);

  ga4Event("session_start", {
    session_id: sessionId,
    entry_page: window.location.pathname,
  });

  return sessionId;
};

export const endUserSession = () => {
  const sessionId = sessionStorage.getItem("ga4_session_id");

  if (sessionId) {
    ga4Event("session_end", {
      session_id: sessionId,
      exit_page: window.location.pathname,
    });

    sessionStorage.removeItem("ga4_session_id");
  }
};

// Track page transitions
export const trackPageTransition = (fromPage: string, toPage: string) => {
  const sessionId = sessionStorage.getItem("ga4_session_id");

  ga4Event("page_transition", {
    session_id: sessionId,
    from_page: fromPage,
    to_page: toPage,
  });
};

// ============================================
// 4. PURCHASE FUNNEL TRACKING
// ============================================

export type PurchaseFunnelStep =
  | "add_to_cart"
  | "view_cart"
  | "begin_checkout"
  | "checkout_login"
  | "add_shipping_info"
  | "view_summary"
  | "click_purchase"
  | "purchase_complete";

export const trackPurchaseFunnel = (
  step: PurchaseFunnelStep,
  data: {
    productId?: string;
    productName?: string;
    price?: number;
    quantity?: number;
    cartTotal?: number;
    orderId?: string;
    [key: string]: unknown;
  }
) => {
  const sessionId = sessionStorage.getItem("ga4_session_id");

  // Track the specific funnel step
  ga4Event(`funnel_${step}`, {
    session_id: sessionId,
    ...data,
  });

  // Also track generic funnel progress
  ga4Event("purchase_funnel_progress", {
    session_id: sessionId,
    funnel_step: step,
    ...data,
  });
};

// Step 1: Add to Cart
export const trackAddToCart = (
  productId: string,
  productName: string,
  price: number,
  quantity: number = 1
) => {
  trackPurchaseFunnel("add_to_cart", {
    productId,
    productName,
    price,
    quantity,
    value: price * quantity,
  });
};

// Step 2: View Cart
export const trackViewCart = (cartTotal: number, itemCount: number) => {
  trackPurchaseFunnel("view_cart", {
    cartTotal,
    itemCount,
    value: cartTotal,
  });
};

// Step 3: Begin Checkout
export const trackBeginCheckout = (cartTotal: number, items: unknown[]) => {
  trackPurchaseFunnel("begin_checkout", {
    cartTotal,
    itemCount: items.length,
    value: cartTotal,
    items,
  });
};

// Step 4: Checkout Login (only tracked during checkout flow)
export const trackCheckoutLogin = (isNewUser: boolean = false) => {
  trackPurchaseFunnel("checkout_login", {
    is_new_user: isNewUser,
    login_context: "checkout",
  });
};

// Step 5: Add Shipping Info
export const trackAddShippingInfo = (shippingMethod?: string) => {
  trackPurchaseFunnel("add_shipping_info", {
    shippingMethod,
  });
};

// Step 6: View Summary
export const trackViewSummary = (orderTotal: number) => {
  trackPurchaseFunnel("view_summary", {
    orderTotal,
    value: orderTotal,
  });
};

// Step 7: Click Purchase Button
export const trackClickPurchase = (orderTotal: number) => {
  trackPurchaseFunnel("click_purchase", {
    orderTotal,
    value: orderTotal,
  });
};

// Step 8: Purchase Complete
export const trackPurchaseComplete = (
  orderId: string,
  orderTotal: number,
  items: unknown[]
) => {
  trackPurchaseFunnel("purchase_complete", {
    orderId,
    orderTotal,
    itemCount: items.length,
    value: orderTotal,
    items,
  });

  // Also send GA4's built-in purchase event
  ga4Event("purchase", {
    transaction_id: orderId,
    value: orderTotal,
    currency: "GEL",
    items,
  });
};

// ============================================
// 5. ERROR & API MONITORING
// ============================================

export const trackError = (
  errorType: "page_error" | "api_error" | "network_error" | "other",
  errorMessage: string,
  errorStack?: string,
  additionalData?: Record<string, unknown>
) => {
  ga4Event("error_occurred", {
    error_type: errorType,
    error_message: errorMessage,
    error_stack: errorStack,
    page_path: window.location.pathname,
    ...additionalData,
  });
};

export const trackAPICall = (
  endpoint: string,
  method: string,
  status: number,
  duration: number,
  success: boolean
) => {
  ga4Event("api_call", {
    api_endpoint: endpoint,
    api_method: method,
    api_status: status,
    api_duration_ms: duration,
    api_success: success,
  });
};

// Track 404 errors
export const track404Error = (attemptedPath: string) => {
  trackError("page_error", "404 - Page Not Found", undefined, {
    attempted_path: attemptedPath,
  });
};

// Track network errors
export const trackNetworkError = (url: string, errorMessage: string) => {
  trackError("network_error", errorMessage, undefined, {
    failed_url: url,
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const trackTiming = (
  category: string,
  variable: string,
  value: number,
  label?: string
) => {
  ga4Event("timing_complete", {
    timing_category: category,
    timing_variable: variable,
    timing_value: value,
    timing_label: label,
  });
};

export const setUserProperties = (properties: Record<string, unknown>) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("set", "user_properties", properties);
  }
};

export const setUserId = (userId: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      user_id: userId,
    });
  }
};
