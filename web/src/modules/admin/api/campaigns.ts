import { fetchWithAuth } from "@/lib/fetch-with-auth";

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "scheduled" | "ended" | "paused";
  startDate: string;
  endDate: string;
  appliesTo: ("influencer_referrals" | "all_visitors")[];
  onlyProductsWithPermission: boolean;
  discountSource: "product_referral_discount" | "artist_default" | "override";
  maxDiscountPercent: number;
  useMaxAsOverride: boolean;
  badgeText?: string;
  badgeTextGe?: string;
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  appliesTo?: ("influencer_referrals" | "all_visitors")[];
  onlyProductsWithPermission?: boolean;
  discountSource?: "product_referral_discount" | "artist_default" | "override";
  maxDiscountPercent?: number;
  useMaxAsOverride?: boolean;
  badgeText?: string;
  badgeTextGe?: string;
}

export async function getCampaigns(status?: string): Promise<Campaign[]> {
  const params = status ? `?status=${status}` : "";
  const response = await fetchWithAuth(`/campaigns${params}`);
  return response.json();
}

export async function getCampaign(id: string): Promise<Campaign> {
  const response = await fetchWithAuth(`/campaigns/${id}`);
  return response.json();
}

export async function getActiveCampaign(): Promise<{
  campaign: Campaign | null;
}> {
  const response = await fetchWithAuth("/campaigns/active");
  return response.json();
}

export async function createCampaign(
  data: CreateCampaignDto
): Promise<Campaign> {
  const response = await fetchWithAuth("/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateCampaign(
  id: string,
  data: Partial<CreateCampaignDto>
): Promise<Campaign> {
  const response = await fetchWithAuth(`/campaigns/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  await fetchWithAuth(`/campaigns/${id}`, { method: "DELETE" });
}

export async function activateCampaign(id: string): Promise<Campaign> {
  const response = await fetchWithAuth(`/campaigns/${id}/activate`, {
    method: "POST",
  });
  return response.json();
}

export async function deactivateCampaign(id: string): Promise<Campaign> {
  const response = await fetchWithAuth(`/campaigns/${id}/deactivate`, {
    method: "POST",
  });
  return response.json();
}

export async function endCampaign(id: string): Promise<Campaign> {
  const response = await fetchWithAuth(`/campaigns/${id}/end`, {
    method: "POST",
  });
  return response.json();
}
