import { cache } from "react";

// Shared, request-deduplicated product fetch.
// React's cache() ensures that even though generateMetadata, the layout and the
// page each call getProduct() for the same id within one request, the API is
// hit only ONCE (instead of 3×).
export const getProduct = cache(async (id: string) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
});
