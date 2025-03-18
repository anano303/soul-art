import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { PaginatedResponse, User } from "@/types";

export async function getUsers(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<User>> {
  try {
    const response = await fetchWithAuth(`/users?page=${page}&limit=${limit}`);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}
