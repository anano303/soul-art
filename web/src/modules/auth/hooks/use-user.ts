import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export function useUser() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetchWithAuth("/auth/profile", {
        credentials: "include",
      });
      return response.json();
    },
    placeholderData: () => queryClient.getQueryData(["user"]),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error, // ❗ თუ შეცდომაა, მაინც არ ნიშნავს, რომ არ არის ავტორიზებული
    error,
    isFetching,
  };
}
