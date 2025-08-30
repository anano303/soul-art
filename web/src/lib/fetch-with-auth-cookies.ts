import { refreshTokens, clearUserData } from "./auth-cookies";

export async function fetchWithAuth(url: string, config: RequestInit = {}) {
  const { headers, ...rest } = config;

  if (typeof window === "undefined") {
    throw new Error("fetchWithAuth must be used in client components only");
  }

  const makeRequest = async () => {
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      ...rest,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
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
        if (typeof window !== "undefined" && 
            !window.location.pathname.includes("/login") && 
            !window.location.pathname.includes("/register")) {
          window.location.href = "/login";
        }
        
        throw new Error("Session expired. Please login again.");
      }
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Session expired")) {
      throw error;
    }
    throw new Error("Network request failed");
  }
}
