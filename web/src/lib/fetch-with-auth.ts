import { clearUserData, refreshTokens } from "./auth";
import { trackAPICall, trackNetworkError } from "./ga4-analytics";

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithAuth(url: string, config: RequestInit = {}) {
  const { headers, ...rest } = config;

  if (typeof window === "undefined") {
    throw new Error("fetchWithAuth must be used in client components only");
  }

  const startTime = performance.now();
  const method = (rest.method || "GET").toUpperCase();

  const makeRequest = async () => {
    // Prepare headers - don't set Content-Type for FormData (browser will set it automatically with boundary)
    const requestHeaders: Record<string, string> = { ...headers } as Record<
      string,
      string
    >;

    // Only add Content-Type if body is not FormData
    if (!(rest.body instanceof FormData)) {
      requestHeaders["Content-Type"] = "application/json";
    }

    // With HTTP-only cookies, no need for Authorization header
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      ...rest,
      headers: requestHeaders,
      credentials: "include", // Always include cookies
      mode: "cors",
    });
  };

  // Retry wrapper for network errors
  const makeRequestWithRetry = async (retries = 0): Promise<Response> => {
    try {
      return await makeRequest();
    } catch (error) {
      // Only retry on network errors (Failed to fetch), not on other errors
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch") &&
        retries < MAX_RETRIES
      ) {
        console.warn(
          `[fetchWithAuth] Network error, retrying (${
            retries + 1
          }/${MAX_RETRIES})...`
        );
        await delay(RETRY_DELAY * (retries + 1)); // Exponential backoff
        return makeRequestWithRetry(retries + 1);
      }
      throw error;
    }
  };

  try {
    let response = await makeRequestWithRetry();

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401) {
      try {
        // Attempt to refresh the token via HTTP-only cookies
        await refreshTokens();

        // Retry the original request
        response = await makeRequestWithRetry();
      } catch {
        // Refresh failed, clear user data and redirect to login
        clearUserData();

        // Check if we're not already on a public page
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }

        throw new Error("სესია ვადაგასულია, გთხოვთ თავიდან შეხვიდეთ");
      }
    }

    const duration = performance.now() - startTime;
    const success = response.ok;

    // Track API call in GA4
    trackAPICall(url, method, response.status, duration, success);

    // For 204 No Content, return the response as is
    if (response.status === 204) {
      return response;
    }

    // Handle non-successful responses (not 2xx)
    if (!response.ok) {
      // Try to parse error details from the response
      let errorMessage = "Unknown error";
      let errorDetails: Record<string, unknown> = {};

      try {
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error(`[fetchWithAuth] Error response:`, errorData);

          errorDetails = {
            error_data: JSON.stringify(errorData),
            status_code: response.status,
            status_text: response.statusText,
          };

          // Special handling for specific error messages
          if (
            errorData.message === "Invalid order ID." &&
            url.includes("/orders")
          ) {
            // For orders endpoints with this specific error, we'll pass it through
            // without treating it as an error - the component will handle it
            errorMessage = "Invalid order ID - user likely has no orders yet";
            throw new Error(errorMessage);
          }

          if (errorData.message) {
            errorMessage =
              typeof errorData.message === "string"
                ? errorData.message
                : Array.isArray(errorData.message)
                ? errorData.message.join(", ")
                : JSON.stringify(errorData.message);
            throw new Error(errorMessage);
          } else if (errorData.error) {
            errorMessage = errorData.error;
            throw new Error(errorMessage);
          }
        } else {
          // Not JSON response
          const textError = await response.text();
          console.error(
            `[fetchWithAuth] Non-JSON error response: ${textError}`
          );
          errorMessage = `შეცდომა: ${response.status} ${response.statusText}`;
          errorDetails = {
            text_error: textError,
            status_code: response.status,
            status_text: response.statusText,
          };
          throw new Error(errorMessage);
        }
      } catch (parseError) {
        console.error(
          `[fetchWithAuth] Failed to parse error response:`,
          parseError
        );
        // If we can't parse the response, use the HTTP status
        errorMessage = `შეცდომა: ${response.status} ${response.statusText}`;
        errorDetails = {
          parse_error:
            parseError instanceof Error
              ? parseError.message
              : "Failed to parse",
          status_code: response.status,
          status_text: response.statusText,
        };
        throw new Error(errorMessage);
      }

      // Fallback error if we couldn't extract a more specific message
      errorMessage = "მოთხოვნის შესრულება ვერ მოხერხდა";
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    console.error(`[fetchWithAuth] error:`, error);

    // Determine error type based on error and response status
    let errorType:
      | "api_error"
      | "network_error"
      | "auth_error"
      | "validation_error" = "network_error";
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if response exists (API error) or not (network error)
    if (error instanceof Error && errorMessage.includes("Failed to fetch")) {
      errorType = "network_error";
    } else if (
      errorMessage.includes("სესია ვადაგასულია") ||
      errorMessage.includes("unauthorized")
    ) {
      errorType = "auth_error";
    } else if (
      errorMessage.includes("Invalid") ||
      errorMessage.includes("validation")
    ) {
      errorType = "validation_error";
    } else {
      errorType = "api_error";
    }

    // Track detailed error with proper categorization
    trackNetworkError(url, errorMessage, {
      error_type: errorType,
      api_endpoint: url,
      api_method: method,
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw the error for handling by the caller
    throw error;
  }
}
