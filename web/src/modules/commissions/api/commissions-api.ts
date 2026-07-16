import { fetchWithAuth } from "@/lib/fetch-with-auth";

export type CommissionType =
  | "portrait"
  | "caricature"
  | "copy"
  | "pet"
  | "digital"
  | "other";

export type CommissionStatus =
  | "open"
  | "selecting"
  | "paid"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export interface CommissionOfferView {
  _id: string;
  artistId?: string;
  artistSlug?: string | null;
  artistName: string;
  price: number;
  deliveryPrice: number;
  totalPrice: number;
  estimatedDays: number;
  message?: string;
  rating?: number;
  reviewsCount?: number;
  completedCommissions?: number;
  completionRate?: number | null;
  avgResponseHours?: number;
}

export interface Commission {
  _id: string;
  type: CommissionType;
  referenceImages: string[];
  description: string;
  size: string;
  material?: string;
  budget?: number;
  desiredDueDate?: string;
  status: CommissionStatus;
  offersDeadline: string;
  selectionDeadline: string;
  offers?: CommissionOfferView[];
  selectedOffer?: {
    artistName?: string;
    price: number;
    deliveryPrice: number;
    estimatedDays: number;
    totalPrice: number;
  };
  shippingDetails?: {
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phoneNumber?: string;
  };
  isPaid?: boolean;
  createdAt: string;
}

export interface SelectResult {
  commissionId: string;
  orderId: string;
  externalOrderId: string;
  title: string;
  artworkPrice: number;
  deliveryFee: number;
  totalPayment: number;
}

// SoulArt commission on custom orders (single payment AND installment).
export const COMMISSION_RATE_PERCENT = 15;

export async function createCommission(form: FormData): Promise<Commission> {
  const res = await fetchWithAuth("/commissions", {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function getMyCommissions(): Promise<Commission[]> {
  const res = await fetchWithAuth("/commissions/mine");
  return res.json();
}

export async function getCommission(id: string): Promise<Commission> {
  const res = await fetchWithAuth(`/commissions/${id}`);
  return res.json();
}

export async function getAvailableCommissions(): Promise<Commission[]> {
  const res = await fetchWithAuth("/commissions/available");
  return res.json();
}

export interface MyOfferView {
  _id: string;
  type: CommissionType;
  size: string;
  status: CommissionStatus;
  isPaid?: boolean;
  referenceImages: string[];
  myOffer: {
    price: number;
    deliveryPrice: number;
    estimatedDays: number;
    message?: string;
  } | null;
  selected: boolean;
  createdAt: string;
}

export async function getMyOffers(): Promise<MyOfferView[]> {
  const res = await fetchWithAuth("/commissions/my-offers");
  return res.json();
}

export async function submitOffer(
  id: string,
  dto: {
    price: number;
    deliveryPrice: number;
    estimatedDays: number;
    message?: string;
  }
): Promise<{ success: boolean }> {
  const res = await fetchWithAuth(`/commissions/${id}/offer`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
  return res.json();
}

export async function selectOffer(
  id: string,
  offerId: string
): Promise<SelectResult> {
  const res = await fetchWithAuth(`/commissions/${id}/select`, {
    method: "POST",
    body: JSON.stringify({ offerId }),
  });
  return res.json();
}

// Single payment — kicks off BOG and returns the redirect URL.
export async function createCommissionPayment(
  data: SelectResult
): Promise<{ redirectUrl: string }> {
  const res = await fetchWithAuth("/payments/bog/commission/create", {
    method: "POST",
    body: JSON.stringify({
      commissionId: data.commissionId,
      externalOrderId: data.externalOrderId,
      title: data.title,
      artworkPrice: data.artworkPrice,
      deliveryFee: data.deliveryFee,
      totalPayment: data.totalPayment,
    }),
  });
  return res.json();
}

// Installment payment — reuses the existing Credo flow with the created order.
export async function createCommissionInstallment(
  data: SelectResult
): Promise<{ success: boolean; redirectUrl: string; orderCode: string }> {
  const res = await fetchWithAuth("/payments/credo/installment/create", {
    method: "POST",
    body: JSON.stringify({
      orderId: data.orderId,
      products: [
        {
          id: data.commissionId,
          title: data.title,
          amount: 1,
          price: data.totalPayment, // GEL; artwork + delivery
        },
      ],
    }),
  });
  return res.json();
}

export async function confirmReceived(id: string): Promise<Commission> {
  const res = await fetchWithAuth(`/commissions/${id}/confirm-received`, {
    method: "PUT",
  });
  return res.json();
}

export async function getAdminCommissions(
  status?: string
): Promise<{ items: unknown[]; total: number; page: number; pages: number }> {
  const q = status ? `?status=${status}` : "";
  const res = await fetchWithAuth(`/commissions/admin${q}`);
  return res.json();
}

export async function completeCommission(id: string): Promise<Commission> {
  const res = await fetchWithAuth(`/commissions/${id}/complete`, {
    method: "PUT",
  });
  return res.json();
}

export const COMMISSION_TYPE_LABELS: Record<
  CommissionType,
  { ge: string; en: string }
> = {
  portrait: { ge: "პორტრეტი", en: "Portrait" },
  caricature: { ge: "კარიკატურა", en: "Caricature" },
  copy: { ge: "ნახატის ასლი", en: "Painting copy" },
  pet: { ge: "შინაური ცხოველი", en: "Pet portrait" },
  digital: { ge: "ციფრული ილუსტრაცია", en: "Digital illustration" },
  other: { ge: "სხვა", en: "Other" },
};
