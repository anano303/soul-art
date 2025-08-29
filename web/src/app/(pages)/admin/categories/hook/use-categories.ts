import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { ErrorHandler } from "@/lib/error-handler";
import { memoryCache } from "@/lib/cache";

// Types for categories
export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: string;
  name: string;
  nameEn?: string;
  categoryId: string | Category;
  ageGroups: string[];
  sizes: string[];
  colors: string[];
  description?: string;
  descriptionEn?: string;
  isActive: boolean;
}

export interface CategoryCreateInput {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  isActive?: boolean;
}

export interface CategoryUpdateInput {
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  isActive?: boolean;
}

export interface SubCategoryCreateInput {
  name: string;
  nameEn?: string;
  categoryId: string;
  description?: string;
  descriptionEn?: string;
  ageGroups?: string[];
  sizes?: string[];
  colors?: string[];
  isActive?: boolean;
}

export interface SubCategoryUpdateInput {
  name?: string;
  nameEn?: string;
  categoryId?: string;
  description?: string;
  descriptionEn?: string;
  ageGroups?: string[];
  sizes?: string[];
  colors?: string[];
  isActive?: boolean;
}

export interface AttributeInput {
  value?: string;
  name?: string;
  nameEn?: string;
}

// Error interface to properly type error responses
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
}

// Extended Error interface for query errors
interface ExtendedError extends Error {
  status?: number;
  backendData?: unknown;
  requestUrl?: string;
}

// Fetch categories
export const useCategories = (includeInactive = false) => {
  return useQuery<Category[], Error>({
    queryKey: ["categories", { includeInactive }],
    queryFn: async () => {
      try {
        const cacheKey = `categories-${includeInactive}`;
        
        // Try cache first
        const cached = memoryCache.get(cacheKey);
        if (cached) {
          return cached;
        }

        const response = await apiClient.get(
          `/categories?includeInactive=${includeInactive}`
        );
        
        // Cache for 5 minutes
        memoryCache.set(cacheKey, response.data, 5 * 60 * 1000);
        return response.data;
      } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - increased from 1 second since we have cache
    refetchOnMount: "always", // Always refetch when the component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2, // Retry failed requests up to 2 times
  });
};

// Fetch a single category
export const useCategory = (id: string) => {
  return useQuery<Category>({
    queryKey: ["categories", id],
    queryFn: async () => {
      const response = await apiClient.get(`/categories/${id}`);
      return response.data;
    },
    enabled: !!id && id !== "undefined" && id !== "null",
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create a new category
export const useCreateCategory = (errorMessage?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryCreateInput) => {
      const response = await apiClient.post("/categories", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      // Clear cache when categories are modified
      memoryCache.clear(); // Clear all cache since categories affect many things
      toast.success("კატეგორია წარმატებით დაემატა");
    },
    onError: (error: unknown) => {
      ErrorHandler.showToast(error, errorMessage || "კატეგორიის დამატება ვერ მოხერხდა");
    },
  });
};

// Update a category
export const useUpdateCategory = (errorMessage?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: CategoryUpdateInput;
    }) => {
      const response = await apiClient.put(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", variables.id] });
      // Clear cache when categories are modified
      memoryCache.clear();
      toast.success("კატეგორია წარმატებით განახლდა");
    },
    onError: (error: unknown) => {
      ErrorHandler.showToast(error, errorMessage || "კატეგორიის განახლება ვერ მოხერხდა");
    },
  });
};

// Delete a category
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      // Clear cache when categories are modified
      memoryCache.clear();
      toast.success("კატეგორია წარმატებით წაიშალა");
    },
    onError: (error: unknown) => {
      ErrorHandler.showToast(error, "კატეგორიის წაშლა ვერ მოხერხდა");
    },
  });
};

// Fetch subcategories
export const useSubCategories = (
  categoryId?: string,
  includeInactive = false
) => {
  return useQuery<SubCategory[], Error>({
    // Specify Error type for queryError
    queryKey: ["subcategories", { categoryId, includeInactive }],
    queryFn: async () => {
      if (!categoryId) {
        console.warn(
          "[useSubCategories] categoryId is missing. API call will be skipped by 'enabled' flag or return empty if forced."
        );
        // 'enabled' flag should prevent this, but as a safeguard:
        return [];
      } // Validate category ID format - should be a MongoDB ObjectId (24 hex characters)
      if (
        typeof categoryId !== "string" ||
        !categoryId.match(/^[0-9a-fA-F]{24}$/)
      ) {
        throw new Error(`Invalid category ID format: ${categoryId}`);
      }

      const params = new URLSearchParams();
      params.append("categoryId", categoryId);
      if (includeInactive) {
        params.append("includeInactive", "true");
      }
      const url = `/subcategories?${params.toString()}`;
      console.log(`[useSubCategories] Attempting to fetch from URL: ${url}`);

      try {
        const response = await apiClient.get<SubCategory[]>(url);
        console.log(
          `[useSubCategories] Successfully fetched subcategories. Status: ${response.status}, Count: ${response.data.length}`
        );
        if (response.data.length > 0) {
          console.log(
            "[useSubCategories] First subcategory data:",
            JSON.stringify(response.data[0])
          );
        }
        return response.data;
      } catch (error: unknown) {
        const err = error as ApiError; // Type assertion
        const errorStatus = err.response?.status;
        const backendMessage = err.response?.data?.message;

        let displayMessage = "Failed to fetch subcategories."; // Default message
        if (backendMessage) {
          displayMessage = backendMessage; // Use message from backend if available
        } else if (error instanceof Error && error.message) {
          // Fallback to original error message if backend message is not present
          displayMessage = error.message;
        }

        console.error(
          `[useSubCategories] Error fetching subcategories. URL: ${url}, Status: ${
            errorStatus || "N/A"
          }, Message: "${displayMessage}"`
        );

        // Create a new error object that will be thrown for React Query
        // This error object will be available in query.error in the component
        const queryError = new Error(displayMessage) as ExtendedError;

        // Attach more context as custom properties to the error object
        // This can be useful for debugging in the component using the hook
        queryError.status = errorStatus;
        queryError.backendData = err.response?.data;
        queryError.requestUrl = url;

        throw queryError; // Rethrow the augmented error for React Query to handle
      }
    },
    enabled: !!categoryId, // Query will only run if categoryId is truthy
    retry: 1, // Retry once on failure
    // staleTime: 5 * 60 * 1000, // Optional: Data is fresh for 5 minutes
    // cacheTime: 10 * 60 * 1000, // Optional: Cache data for 10 minutes
  });
};

// Fetch a single subcategory
export const useSubCategory = (id: string) => {
  return useQuery<SubCategory>({
    queryKey: ["subcategories", id],
    queryFn: async () => {
      const response = await apiClient.get(`/subcategories/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Create a new subcategory
export const useCreateSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubCategoryCreateInput) => {
      // Ensure categoryId is included and valid
      if (!data.categoryId) {
        console.error("Missing categoryId when creating subcategory");
        throw new Error("categoryId is required when creating a subcategory");
      }

      console.log("Creating subcategory with data:", {
        name: data.name,
        categoryId: data.categoryId,
        description: data.description,
        ageGroups: data.ageGroups,
        sizes: data.sizes,
        colors: data.colors,
        isActive: data.isActive,
      });

      const response = await apiClient.post("/subcategories", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      // Invalidate the specific category's subcategories
      if (variables.categoryId) {
        queryClient.invalidateQueries({
          queryKey: ["subcategories", { categoryId: variables.categoryId }],
        });
      }
      toast.success("ქვეკატეგორია წარმატებით დაემატა");
    },
    onError: (error: unknown) => {
      console.error("Error creating subcategory:", error);
      ErrorHandler.showToast(error, "ქვეკატეგორიის დამატება ვერ მოხერხდა");
    },
  });
};

// Update a subcategory
export const useUpdateSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: SubCategoryUpdateInput;
    }) => {
      const response = await apiClient.put(`/subcategories/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({
        queryKey: ["subcategories", variables.id],
      });
      toast.success("ქვეკატეგორია წარმატებით განახლდა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message || "ქვეკატეგორიის განახლება ვერ მოხერხდა"
      );
    },
  });
};

// Delete a subcategory
export const useDeleteSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/subcategories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("ქვეკატეგორია წარმატებით წაიშალა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message || "ქვეკატეგორიის წაშლა ვერ მოხერხდა"
      );
    },
  });
};

// Fetch all attributes (colors, sizes, age groups) - returns simple strings for backward compatibility
export const useAttributes = () => {
  return useQuery<{
    colors: string[];
    sizes: string[];
    ageGroups: string[];
  }>({
    queryKey: ["attributes"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/categories/attributes/all");
        return response.data;
      } catch (error) {
        console.error("Error fetching attributes:", error);
        throw new Error("Failed to fetch attributes");
      }
    },
  });
};

// Fetch all attributes with full objects (includes translations)
export const useAttributesWithTranslations = () => {
  return useQuery<{
    colors: Color[];
    sizes: string[];
    ageGroups: AgeGroupItem[];
  }>({
    queryKey: ["attributesWithTranslations"],
    queryFn: async () => {
      try {
        const [colorsResponse, sizesResponse, ageGroupsResponse] =
          await Promise.all([
            apiClient.get("/categories/attributes/colors"),
            apiClient.get("/categories/attributes/sizes"),
            apiClient.get("/categories/attributes/age-groups"),
          ]);

        return {
          colors: colorsResponse.data,
          sizes: sizesResponse.data,
          ageGroups: ageGroupsResponse.data,
        };
      } catch (error) {
        console.error("Error fetching attributes with translations:", error);
        throw new Error("Failed to fetch attributes with translations");
      }
    },
  });
};

// Color interface
export interface Color {
  _id?: string;
  id?: string;
  name: string;
  nameEn?: string;
  hexCode?: string;
  description?: string;
  isActive?: boolean;
}

// AgeGroup interface
export interface AgeGroupItem {
  _id?: string;
  id?: string;
  name: string;
  nameEn?: string;
  ageRange?: string;
  description?: string;
  isActive?: boolean;
}

// Colors
export const useColors = () => {
  return useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      const response = await apiClient.get("/categories/attributes/colors");
      return response.data;
    },
  });
};

export const useCreateColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AttributeInput) => {
      // Convert to the format expected by the backend
      const colorData = {
        name: data.value,
        nameEn: data.nameEn,
      };
      const response = await apiClient.post(
        "/categories/attributes/colors",
        colorData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ფერი წარმატებით დაემატა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || "ფერის დამატება ვერ მოხერხდა");
    },
  });
};

export const useUpdateColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      color,
      data,
    }: {
      color: string;
      data: AttributeInput;
    }) => {
      // Convert to the format expected by the backend
      const colorData = {
        name: data.value,
        nameEn: data.nameEn,
      };
      const response = await apiClient.put(
        `/categories/attributes/colors/${color}`,
        colorData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ფერი წარმატებით განახლდა");
    },
    onError: (error: unknown) => {
      ErrorHandler.showToast(error, "ფერის განახლება ვერ მოხერხდა");
    },
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (color: string) => {
      const response = await apiClient.delete(
        `/categories/attributes/colors/${color}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ფერი წარმატებით წაიშალა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || "ფერის წაშლა ვერ მოხერხდა");
    },
  });
};

// Sizes
export const useSizes = () => {
  return useQuery<string[]>({
    queryKey: ["sizes"],
    queryFn: async () => {
      const response = await apiClient.get("/categories/attributes/sizes");
      return response.data;
    },
  });
};

export const useCreateSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AttributeInput) => {
      const response = await apiClient.post(
        "/categories/attributes/sizes",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ზომა წარმატებით დაემატა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || "ზომის დამატება ვერ მოხერხდა");
    },
  });
};

export const useUpdateSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      size,
      data,
    }: {
      size: string;
      data: AttributeInput;
    }) => {
      const response = await apiClient.put(
        `/categories/attributes/sizes/${size}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ზომა წარმატებით განახლდა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message || "ზომის განახლება ვერ მოხერხდა"
      );
    },
  });
};

export const useDeleteSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (size: string) => {
      const response = await apiClient.delete(
        `/categories/attributes/sizes/${size}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ზომა წარმატებით წაიშალა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || "ზომის წაშლა ვერ მოხერხდა");
    },
  });
};

// Age Groups
export const useAgeGroups = () => {
  return useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      const response = await apiClient.get("/categories/attributes/age-groups");
      return response.data;
    },
  });
};

export const useCreateAgeGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AttributeInput) => {
      // Ensure we only send valid, non-undefined values
      const ageGroupData: { name: string; nameEn?: string } = {
        name: data.value || data.name || "",
      };

      // Only add nameEn if it exists and is not empty
      if (data.nameEn && data.nameEn.trim() !== "") {
        ageGroupData.nameEn = data.nameEn.trim();
      }

      const response = await apiClient.post(
        "/categories/attributes/age-groups",
        ageGroupData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ageGroups"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ასაკობრივი ჯგუფი წარმატებით დაემატა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message || "ასაკობრივი ჯგუფის დამატება ვერ მოხერხდა"
      );
    },
  });
};

export const useUpdateAgeGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ageGroup,
      data,
    }: {
      ageGroup: string;
      data: AttributeInput;
    }) => {
      // Ensure we only send valid, non-undefined values
      const ageGroupData: { name?: string; nameEn?: string } = {};

      // Only add name if it exists and is not empty
      if (data.value || data.name) {
        ageGroupData.name = (data.value || data.name || "").trim();
      } // Only add nameEn if it exists and is not empty
      if (data.nameEn && data.nameEn.trim() !== "") {
        ageGroupData.nameEn = data.nameEn.trim();
      }

      const response = await apiClient.put(
        `/categories/attributes/age-groups/${ageGroup}`,
        ageGroupData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ageGroups"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ასაკობრივი ჯგუფი წარმატებით განახლდა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message ||
          "ასაკობრივი ჯგუფის განახლება ვერ მოხერხდა"
      );
    },
  });
};

export const useDeleteAgeGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ageGroup: string) => {
      const response = await apiClient.delete(
        `/categories/attributes/age-groups/${ageGroup}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ageGroups"] });
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("ასაკობრივი ჯგუფი წარმატებით წაიშალა");
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message || "ასაკობრივი ჯგუფის წაშლა ვერ მოხერხდა"
      );
    },
  });
};
