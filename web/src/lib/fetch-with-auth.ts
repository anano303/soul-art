export async function fetchWithAuth(url: string, config: RequestInit = {}) {
  const { headers, ...rest } = config;

  if (typeof window === "undefined") {
    throw new Error("fetchWithAuth must be used in client components only");
  }

  const makeRequest = async () => {
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });
  };

  let response = await makeRequest();

  if (response.status === 401) {
    // ✅ გავარკვიოთ, არსებობს თუ არა refresh token (მაგ: localStorage-ში ან cookie-ში)
    const hasRefreshToken = document.cookie.includes("refreshToken"); // ან შენი refresh token ლოგიკა

    if (!hasRefreshToken) {
      return response; // ❌ თუ refresh token არ არსებობს, უბრალოდ ვაბრუნებთ 401 response-ს
    }

    try {
      const refreshResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (refreshResponse.ok) {
        response = await makeRequest(); // 🔄 ტოკენი განახლდა? თავიდან ვუშვებთ request-ს
      } else {
        return response; // ❌ თუ refresh ვერ მოხერხდა, ისევ ვაბრუნებთ 401-ს
      }
    } catch (error) {
      console.error("Authentication refresh failed:", error);
      return response; // ❌ არ გადავამისამართოთ login-ზე
    }
  }

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.message || "Request failed");
    } catch {
      throw new Error("Request failed");
    }
  }

  return response;
}
