import { useQuery } from "@tanstack/react-query";
import { getSellerBalanceByAdmin } from "@/modules/balance/api/balance-api";

export function useSellerBalance(sellerId: string | null) {
  return useQuery({
    queryKey: ["admin-seller-balance", sellerId],
    queryFn: () =>
      sellerId ? getSellerBalanceByAdmin(sellerId) : Promise.resolve(null),
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
