import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { Product } from "@/types";

export async function updateProductVisibility(
  productId: string,
  hideFromStore: boolean
): Promise<Product | null> {
  try {
    const response = await fetchWithAuth(`/products/${productId}/visibility`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hideFromStore }),
    });

    if (!response.ok) {
      throw new Error("Failed to update product visibility");
    }

    return response.json();
  } catch (error) {
    console.error("Error updating product visibility:", error);
    return null;
  }
}
