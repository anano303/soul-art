import { fetchWithAuth } from "@/lib/fetch-with-auth";

// User interface for seller reference
interface SellerUser {
  _id: string;
  name: string;
  email: string;
  storeName?: string;
}

// Order interface for transaction reference
interface OrderReference {
  _id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface SellerBalance {
  _id: string;
  seller: SellerUser | string;
  totalBalance: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceTransaction {
  _id: string;
  seller: SellerUser | string;
  order: OrderReference | string;
  amount: number;
  type: string;
  description: string;
  commissionPercentage?: number;
  commissionAmount?: number;
  deliveryCommissionAmount?: number;
  productPrice?: number;
  finalAmount?: number;
  createdAt: string;
}

export interface PaginatedTransactions {
  transactions: BalanceTransaction[];
  total: number;
  totalPages: number;
}

// Get seller balance
export async function getSellerBalance(): Promise<SellerBalance | null> {
  try {
    const response = await fetchWithAuth("/balance/seller");
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch balance");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching seller balance:", error);
    throw error;
  }
}

// Get seller transactions
export async function getSellerTransactions(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedTransactions> {
  try {
    const response = await fetchWithAuth(
      `/balance/seller/transactions?page=${page}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching seller transactions:", error);
    throw error;
  }
}

// Request withdrawal
export async function requestWithdrawal(
  amount: number
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetchWithAuth("/balance/withdrawal/request", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to request withdrawal");
    }

    return response.json();
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    throw error;
  }
}

// Admin APIs
export async function getAllSellerBalances(
  page: number = 1,
  limit: number = 10
): Promise<{ balances: SellerBalance[]; total: number; totalPages: number }> {
  try {
    const response = await fetchWithAuth(
      `/balance/admin/all?page=${page}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch seller balances");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching seller balances:", error);
    throw error;
  }
}

export async function getSellerBalanceByAdmin(
  sellerId: string
): Promise<SellerBalance | null> {
  try {
    const response = await fetchWithAuth(`/balance/admin/seller/${sellerId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch seller balance");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching seller balance:", error);
    throw error;
  }
}
