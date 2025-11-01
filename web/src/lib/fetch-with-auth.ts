import { clearUserData, refreshTokens } from "./auth";
import { trackAPICall, trackNetworkError } from "./ga4-analytics";

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
  try {
    let response = await makeRequest();

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401) {
      try {
        // Attempt to refresh the token via HTTP-only cookies
        await refreshTokens();

        // Retry the original request
        response = await makeRequest();
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
      try {
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error(`[fetchWithAuth] Error response:`, errorData);

          // Special handling for specific error messages
          if (
            errorData.message === "Invalid order ID." &&
            url.includes("/orders")
          ) {
            // For orders endpoints with this specific error, we'll pass it through
            // without treating it as an error - the component will handle it
            throw new Error("Invalid order ID - user likely has no orders yet");
          }

          if (errorData.message) {
            throw new Error(
              typeof errorData.message === "string"
                ? errorData.message
                : Array.isArray(errorData.message)
                ? errorData.message.join(", ")
                : JSON.stringify(errorData.message)
            );
          } else if (errorData.error) {
            throw new Error(errorData.error);
          }
        } else {
          // Not JSON response
          const textError = await response.text();
          console.error(
            `[fetchWithAuth] Non-JSON error response: ${textError}`
          );
          throw new Error(`შეცდომა: ${response.status} ${response.statusText}`);
        }
      } catch (parseError) {
        console.error(
          `[fetchWithAuth] Failed to parse error response:`,
          parseError
        );
        // If we can't parse the response, use the HTTP status
        throw new Error(`შეცდომა: ${response.status} ${response.statusText}`);
      }

      // Fallback error if we couldn't extract a more specific message
      throw new Error("მოთხოვნის შესრულება ვერ მოხერხდა");
    }

    return response;
  } catch (error) {
    console.error(`[fetchWithAuth] error:`, error);
    
    // Track network error
    trackNetworkError(url, error instanceof Error ? error.message : "Unknown error");
    
    // Re-throw the error for handling by the caller
    throw error;
  }
}
