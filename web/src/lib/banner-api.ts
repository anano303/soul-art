import { getActiveBanners } from "@/modules/admin/api/banner";
import { Banner } from "@/types/banner";

export async function fetchActiveBanners(): Promise<Banner[]> {
  try {
    const result = await getActiveBanners();
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching active banners:", error);
    return [];
  }
}
