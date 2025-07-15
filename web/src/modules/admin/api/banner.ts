import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Banner, CreateBannerData } from "@/types/banner";
import { getAccessToken } from "@/lib/auth";

export async function getBanners(): Promise<{
  success: boolean;
  data?: Banner[];
  error?: string;
}> {
  try {
    const response = await fetchWithAuth(`/banners`);

    if (!response.ok) {
      return { success: false, error: "Failed to fetch banners" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching banners:", error);
    return { success: false, error: "Network error" };
  }
}

export async function getActiveBanners(): Promise<{
  success: boolean;
  data?: Banner[];
  error?: string;
}> {
  try {
    const response = await fetchWithAuth(`/banners/active`);

    if (!response.ok) {
      return { success: false, error: "Failed to fetch active banners" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching active banners:", error);
    return { success: false, error: "Network error" };
  }
}

export async function createBanner(
  bannerData: CreateBannerData,
  image?: File
): Promise<{ success: boolean; data?: Banner; error?: string }> {
  try {
    const formData = new FormData();

    // Add banner data
    Object.entries(bannerData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    // Add image if provided
    if (image) {
      formData.append("images", image);
    }

    // Use native fetch for FormData to avoid Content-Type issues
    const accessToken = getAccessToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/banners`, {
      method: "POST",
      body: formData,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        // Don't set Content-Type - browser will set it automatically for FormData
      },
      credentials: "include",
      mode: "cors",
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Failed to create banner",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error creating banner:", error);
    return { success: false, error: "Network error" };
  }
}

export async function updateBanner(
  id: string,
  bannerData: Partial<CreateBannerData>,
  image?: File
): Promise<{ success: boolean; data?: Banner; error?: string }> {
  try {
    const formData = new FormData();

    // Add banner data
    Object.entries(bannerData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    // Add image if provided
    if (image) {
      formData.append("images", image);
    }

    // Use native fetch for FormData to avoid Content-Type issues
    const accessToken = getAccessToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/banners/${id}`,
      {
        method: "PATCH",
        body: formData,
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          // Don't set Content-Type - browser will set it automatically for FormData
        },
        credentials: "include",
        mode: "cors",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Failed to update banner",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error updating banner:", error);
    return { success: false, error: "Network error" };
  }
}

export async function deleteBanner(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithAuth(`/banners/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Failed to delete banner",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting banner:", error);
    return { success: false, error: "Network error" };
  }
}
