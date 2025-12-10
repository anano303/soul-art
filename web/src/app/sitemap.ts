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

// არტისტების მოტანა
async function getArtists() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
    const response = await fetch(`${apiUrl}/artists?limit=500`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch artists for sitemap", response.status);
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.items)) {
      return data.items;
    }

    console.warn("Unexpected artists response format:", data);
    return [];
  } catch (error) {
    console.error("Error fetching artists for sitemap:", error);
    return [];
  }
}

// ბლოგ პოსტების მოტანა
async function getBlogPosts() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.soulart.ge/v1";
    const response = await fetch(`${apiUrl}/blog?publishedOnly=true`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch blog posts for sitemap", response.status);
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    if (data && Array.isArray(data.posts)) {
      return data.posts;
    }

    console.warn("Unexpected blog posts response format:", data);
    return [];
  } catch (error) {
    console.error("Error fetching blog posts for sitemap:", error);
    return [];
  }
}

// ქვეკატეგორიების მოტანა
async function getSubCategories() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.soulart.ge/v1";
    const response = await fetch(`${apiUrl}/subcategories`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch subcategories for sitemap",
        response.status
      );
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.items)) {
      return data.items;
    }

    console.warn("Unexpected subcategories response format:", data);
    return [];
  } catch (error) {
    console.error("Error fetching subcategories for sitemap:", error);
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
    {
      url: `${baseUrl}/auction`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/referral-info`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/reset-password`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/sellers-register`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  try {
    const [
      products,
      categories,
      forumPosts,
      artists,
      blogPosts,
      subCategories,
    ] = await Promise.all([
      getProducts(),
      getCategories(),
      getForumPosts(),
      getArtists(),
      getBlogPosts(),
      getSubCategories(),
    ]);

    // პროდუქტების გვერდები
    const productPages = products
      .filter((product: any) => product && product._id)
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
    const categoryPages = categories
      .filter((category: any) => category && category._id)
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

    // არტისტების გვერდები - მაღალი პრიორიტეტი და ხშირი განახლება
    const artistPages = artists
      .map((artist: any) => {
        const slug =
          artist?.slug || artist?.artistSlug || artist?.id || artist?._id;

        if (!slug) {
          return null;
        }

        const lastModifiedValue =
          artist?.updatedAt || artist?.createdAt || new Date();

        return {
          url: `${baseUrl}/@${slug}`,
          lastModified: new Date(lastModifiedValue),
          changeFrequency: "daily" as const,
          priority: 0.9,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    // ფორუმის პოსტების გვერდები
    const forumPages = forumPosts
      .filter((post: any) => post && post._id)
      .map((post: { _id: string; createdAt?: string }) => ({
        url: `${baseUrl}/forum/${post._id}`,
        lastModified: new Date(post.createdAt || new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    // ბლოგ პოსტების გვერდები
    const blogPages = blogPosts
      .filter((post: any) => post && post._id)
      .map((post: { _id: string; updatedAt?: string; createdAt?: string }) => ({
        url: `${baseUrl}/blog/${post._id}`,
        lastModified: new Date(post.updatedAt || post.createdAt || new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.75,
      }));

    // ქვეკატეგორიების გვერდები (მაღაზიაში ფილტრაციისთვის)
    const subCategoryPages = subCategories
      .filter(
        (subCat: any) => subCat && (subCat._id || subCat.id) && subCat.name
      )
      .map(
        (subCat: {
          _id?: string;
          id?: string;
          name: string;
          categoryId?: string;
        }) => ({
          url: `${baseUrl}/shop?subCategory=${subCat._id || subCat.id}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })
      );

    return [
      ...staticPages,
      ...productPages,
      ...categoryPages,
      ...subCategoryPages,
      ...artistPages,
      ...forumPages,
      ...blogPages,
    ];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return at least static pages if dynamic content fails
    return staticPages;
  }
}
