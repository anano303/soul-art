import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { PaginatedResponse, User } from "@/types";

export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string,
  sortBy?: string,
  sortOrder?: string,
  activeFilter?: string
): Promise<PaginatedResponse<User>> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search && search.trim().length > 0) {
      params.set("search", search.trim());
    }

    if (role && role !== "all") {
      params.set("role", role);
    }

    if (sortBy) {
      params.set("sortBy", sortBy);
    }

    if (sortOrder) {
      params.set("sortOrder", sortOrder);
    }

    if (activeFilter && activeFilter !== "all") {
      params.set("activeFilter", activeFilter);
    }

    const response = await fetchWithAuth(`/users?${params.toString()}`);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}
