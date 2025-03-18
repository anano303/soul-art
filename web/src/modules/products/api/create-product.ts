"use server";

import { ProductFormData, productSchema } from "../validation/product";
import { revalidatePath } from "next/cache";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export interface ProductResponseState {
  data?: {
    title: string;
    description: string;
  };
  error?: {
    title: string;
    description: string;
  };
}

export async function createProduct(
  data: ProductFormData,
  formState: ProductResponseState,
  formData: FormData
): Promise<ProductResponseState> {
  const { ...restData } = data; // 'images' აღარ გამოიყენება, ამიტომ ვაშორებთ ამ ცვლადს
  const validationSchema = productSchema.omit({ images: true });
  const result = validationSchema.safeParse(restData);

  if (!result.success) {
    return {
      error: {
        title: "Validation Error",
        description: result.error.message,
      },
    };
  }

  if (!formData.getAll("images").length) {
    return {
      error: {
        title: "Validation Error",
        description: "At least one image is required",
      },
    };
  }

  try {
    const response = await fetchWithAuth("/products", {
      method: "POST",
      body: formData, // ჩვენ უკვე ვგზავნით formData-ს, რომელიც შეიცავს სურათებს
    });
    console.log(
      "Final API Request URL:",
      `${process.env.NEXT_PUBLIC_API_URL}/products`
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        error: {
          title: "Error",
          description: error.message || "Failed to create product",
        },
      };
    }

    revalidatePath("/admin/products");

    return {
      data: {
        title: "Success",
        description: "Product created successfully",
      },
    };
  } catch (error: unknown) {
    let errorMessage = "Failed to create product";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      error: {
        title: "Error",
        description: errorMessage,
      },
    };
  }
}
