import { ArtistProductSummary } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.soulart.ge/v1";

export interface PaginatedProductsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  items: ArtistProductSummary[];
}

export async function fetchArtistProducts(
  identifier: string,
  page: number = 1,
  limit: number = 12,
  includeOwner: boolean = false
): Promise<PaginatedProductsResponse> {
  const response = await fetch(
    `${API_BASE}/artists/${encodeURIComponent(identifier)}/products?page=${page}&limit=${limit}&includeOwner=${includeOwner}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load artist products");
  }

  return response.json();
}
