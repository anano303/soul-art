import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { Product } from "@/types";

export async function updateProductHomeSections(
  productId: string,
  homeSections: string[]
): Promise<Product | null> {
  try {
    const response = await fetchWithAuth(
      `/products/${productId}/home-sections`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ homeSections }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update product home sections");
    }

    return response.json();
  } catch (error) {
    console.error("Error updating product home sections:", error);
    return null;
  }
}
