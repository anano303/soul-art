// "use server";

// import { fetchWithAuth } from "@/lib/fetch-with-auth";
// import type { Product } from "@/types";

// export async function getTopProducts(): Promise<Product[]> {
//   try {
//     // ვითხოვთ 20 პროდუქტს და დავსორტავთ რეიტინგით
//     const searchParams = new URLSearchParams({
//       page: "1",
//       limit: "20",
//       sort: "-rating" // მინუსი ნიშნავს დესცენდინგ სორტირებას
//     });

//     const response = await fetchWithAuth(
//       `/products?${searchParams.toString()}`
//     );

//     if (!response.ok) {
//       throw new Error("Failed to fetch top products");
//     }

//     const data = await response.json();
//     // ვიღებთ მხოლოდ პირველ 7 პროდუქტს
//     return data.items.slice(0, 7);
//   } catch (error) {
//     console.error("Error fetching top products:", error);
//     return [];
//   }
// }
