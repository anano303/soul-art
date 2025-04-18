import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: Role;
  password?: string;
}

export async function updateUser(userId: string, data: UpdateUserData) {
  try {
    console.log("Updating user with data:", data);

    const response = await fetchWithAuth(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update user: ${errorText}`);
    }

    const updatedUser = await response.json();

    return {
      success: true,
      user: updatedUser,
      message: "User updated successfully",
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}
