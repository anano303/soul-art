import { fetchWithAuth } from "@/lib/fetch-with-auth";

export async function deleteUser(userId: string) {
  try {
    await fetchWithAuth(`/users/${userId}`, {
      method: "DELETE",
    });

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}
