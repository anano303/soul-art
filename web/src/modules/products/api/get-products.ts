"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { PaginatedResponse, Product } from "@/types";

export async function getProducts(
  page: number = 1,
  limit: number = 10,
  keyword?: string,
  brand?: string
): Promise<PaginatedResponse<Product>> {
  try {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (keyword) {
      searchParams.append('keyword', keyword);
    }
    
    if (brand) {
      searchParams.append('brand', brand);
    }

    const response = await fetchWithAuth(`/products?${searchParams.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch products');
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      items: [],
      total: 0,
      page: 1,
      pages: 1
    };
  }
}
