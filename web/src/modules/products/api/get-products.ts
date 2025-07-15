"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { Product } from "@/types";

export interface ProductsResponse {
  items?: Product[];
  products?: Product[];
  total: number;
  page: number;
  pages: number;
}

export async function getProducts(
  page = 1,
  limit = 10,
  params?: Record<string, string>
): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...params,
  });

  const response = await fetchWithAuth(`/products?${searchParams.toString()}`);
  const data = await response.json();

  // Ensure consistent response structure
  return {
    items: data.items || data.products || [],
    products: data.items || data.products || [],
    total: data.total || 0,
    page: data.page || 1,
    pages: data.pages || 1,
  };
}
