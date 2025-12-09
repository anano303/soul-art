import { apiClient } from "@/lib/axios";

// ტიპები
export interface ProductResult {
  _id: string;
  name: string;
  nameEn?: string;
  price: number;
  discountPrice?: number;
  category: string;
  brand?: string;
  images: string[];
  slug?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
  products?: ProductResult[];
  suggestFacebook?: boolean;
}

export interface CategoryInfo {
  name: string;
  isActive: boolean;
}

export interface BlogInfo {
  title: string;
  slug?: string;
}

export interface StoreStats {
  totalProducts: number;
  categories: string[];
  blogs: number;
}

export interface BannerInfo {
  title?: string;
  imageUrl: string;
  link?: string;
}

// Chat API კლასი
export const chatApi = {
  // მთავარი ჩატი
  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    const { data } = await apiClient.post<ChatResponse>("/chat", {
      messages,
      searchProducts: true,
    });
    return data;
  },

  // Quick replies
  async getQuickReplies(): Promise<string[]> {
    const { data } = await apiClient.get<{ replies: string[] }>(
      "/chat/quick-replies"
    );
    return data.replies;
  },

  // პროდუქტების ძებნა
  async searchProducts(
    query: string,
    maxPrice?: number,
    minPrice?: number
  ): Promise<ProductResult[]> {
    const { data } = await apiClient.post<{ products: ProductResult[] }>(
      "/chat/search-products",
      { query, maxPrice, minPrice }
    );
    return data.products;
  },

  // კატეგორიები
  async getCategories(): Promise<CategoryInfo[]> {
    const { data } = await apiClient.get<{ categories: CategoryInfo[] }>(
      "/chat/categories"
    );
    return data.categories;
  },

  // ბლოგები
  async getBlogs(limit = 5): Promise<BlogInfo[]> {
    const { data } = await apiClient.get<{ blogs: BlogInfo[] }>(
      `/chat/blogs?limit=${limit}`
    );
    return data.blogs;
  },

  // მაღაზიის სტატისტიკა
  async getStoreStats(): Promise<StoreStats> {
    const { data } = await apiClient.get<StoreStats>("/chat/stats");
    return data;
  },

  // ბანერები
  async getBanners(): Promise<BannerInfo[]> {
    const { data } = await apiClient.get<{ banners: BannerInfo[] }>(
      "/chat/banners"
    );
    return data.banners;
  },

  // კატეგორიით პროდუქტები
  async getProductsByCategory(
    category: string,
    limit = 5
  ): Promise<ProductResult[]> {
    const { data } = await apiClient.get<{ products: ProductResult[] }>(
      `/chat/products/category?category=${encodeURIComponent(
        category
      )}&limit=${limit}`
    );
    return data.products;
  },

  // ფასდაკლებული პროდუქტები
  async getDiscountedProducts(limit = 5): Promise<ProductResult[]> {
    const { data } = await apiClient.get<{ products: ProductResult[] }>(
      `/chat/products/discounted?limit=${limit}`
    );
    return data.products;
  },

  // ახალი პროდუქტები
  async getNewProducts(limit = 5): Promise<ProductResult[]> {
    const { data } = await apiClient.get<{ products: ProductResult[] }>(
      `/chat/products/new?limit=${limit}`
    );
    return data.products;
  },
};

export default chatApi;
