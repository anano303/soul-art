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
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch products for sitemap", response.status);
      return [];
    }

    const data = await response.json();
    // Check different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.products)) {
      return data.products;
    } else if (data && Array.isArray(data.items)) {
      return data.items;
    }

    console.warn("Unexpected products response format:", data);
    return [];
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
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch categories for sitemap", response.status);
      return [];
    }

    const data = await response.json();
    // Check different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.categories)) {
      return data.categories;
    } else if (data && Array.isArray(data.items)) {
      return data.items;
    }

    console.warn("Unexpected categories response format:", data);
    return [];
  } catch (error) {
    console.error("Error fetching categories for sitemap:", error);
    return [];
  }
}

// ფორუმის პოსტების მოტანა
async function getForumPosts() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
    const response = await fetch(`${apiUrl}/forums?page=1&take=1000`, {
      next: { revalidate: 3600 }, // 1 საათი cache
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch forum posts for sitemap", response.status);
      return [];
    }

    const data = await response.json();
    // Check if data is array or has items property
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.items)) {
      return data.items;
    } else if (data && Array.isArray(data.forums)) {
      return data.forums;
    }

    console.warn("Unexpected forum posts response format:", data);
    return [];
  } catch (error) {
    console.error("Error fetching forum posts for sitemap:", error);
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
      url: `${baseUrl}/forum`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
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

  try {
    // პროდუქტების გვერდები
    const products = await getProducts();
    const productPages = products
      .filter((product: any) => product && product._id) // Filter valid products
      .map(
        (product: { _id: string; updatedAt?: string; createdAt?: string }) => ({
          url: `${baseUrl}/products/${product._id}`,
          lastModified: new Date(
            product.updatedAt || product.createdAt || new Date()
          ),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })
      );

    // კატეგორიების გვერდები
    const categories = await getCategories();
    const categoryPages = categories
      .filter((category: any) => category && category._id) // Filter valid categories
      .map(
        (category: {
          _id: string;
          updatedAt?: string;
          createdAt?: string;
        }) => ({
          url: `${baseUrl}/shop?category=${category._id}`,
          lastModified: new Date(
            category.updatedAt || category.createdAt || new Date()
          ),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })
      );

    // ფორუმის პოსტების გვერდები
    const forumPosts = await getForumPosts();
    const forumPages = forumPosts
      .filter((post: any) => post && post._id) // Filter valid posts
      .map((post: { _id: string; createdAt?: string }) => ({
        url: `${baseUrl}/forum/${post._id}`,
        lastModified: new Date(post.createdAt || new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    return [...staticPages, ...productPages, ...categoryPages, ...forumPages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return at least static pages if dynamic content fails
    return staticPages;
  }
}
