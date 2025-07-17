import { MetadataRoute } from "next";

// API-დან პროდუქტების მოტანა
async function getProducts() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
    const response = await fetch(
      `${apiUrl}/products?limit=1000&status=active`,
      {
        next: { revalidate: 3600 }, // 1 საათი cache
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch products for sitemap");
      return [];
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error("Error fetching products for sitemap:", error);
    return [];
  }
}

// კატეგორიების მოტანა
async function getCategories() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
    const response = await fetch(`${apiUrl}/categories?includeInactive=false`, {
      next: { revalidate: 3600 }, // 1 საათი cache
    });

    if (!response.ok) {
      console.error("Failed to fetch categories for sitemap");
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching categories for sitemap:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_PRODUCTION_URL || "https://soulart.ge";

  // ძირითადი გვერდები
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ];

  // პროდუქტების გვერდები
  const products = await getProducts();
  const productPages = products.map(
    (product: { _id: string; updatedAt?: string; createdAt: string }) => ({
      url: `${baseUrl}/products/${product._id}`,
      lastModified: new Date(product.updatedAt || product.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  // კატეგორიების გვერდები
  const categories = await getCategories();
  const categoryPages = categories.map(
    (category: { _id: string; updatedAt?: string; createdAt: string }) => ({
      url: `${baseUrl}/shop?category=${category._id}`,
      lastModified: new Date(category.updatedAt || category.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  return [...staticPages, ...productPages, ...categoryPages];
}
