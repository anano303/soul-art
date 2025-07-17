import { Product } from "@/types";

export function generateProductSchema(product: Product, productId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_PRODUCTION_URL || "https://soulart.ge";

  // ჰეშთეგების მომზადება SEO-სთვის
  const hashtagKeywords =
    product.hashtags?.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)) ||
    [];
  const keywordString = hashtagKeywords.join(" ");

  // კატეგორიის სახელის მიღება
  const categoryName =
    typeof product.mainCategory === "object"
      ? product.mainCategory?.name
      : product.mainCategory || "სანადირო აღჭურვილობა";

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description
      ? `${product.description} ${keywordString}`.trim()
      : `${product.name} by ${product.brand} ${keywordString}`.trim(),
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    image: product.images?.length > 0 ? product.images : ["/logo.png"],
    sku: product._id,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/products/${productId}`,
      priceCurrency: "GEL",
      price: product.price,
      priceValidUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      availability:
        product.countInStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "SoulArt",
        url: baseUrl,
      },
    },
    aggregateRating:
      product.rating && product.numReviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.numReviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    category: categoryName,
    keywords: [
      product.name,
      product.brand,
      categoryName,
      ...(product.hashtags || []),
      "ნახატები",
      "ხელნაკეთი ნივთები",
      "ხელნაკეთი",
      "SoulArt",
      "სოულარტი",
    ].join(", "),
    additionalProperty: [
      // ჰეშთეგები როგორც თვისებები
      ...(product.hashtags?.map((tag: string) => ({
        "@type": "PropertyValue",
        name: "hashtag",
        value: tag.startsWith("#") ? tag : `#${tag}`,
      })) || []),
      // სხვა თვისებები
      {
        "@type": "PropertyValue",
        name: "brand",
        value: product.brand,
      },
      {
        "@type": "PropertyValue",
        name: "category",
        value: categoryName,
      },
    ],
    manufacturer: {
      "@type": "Organization",
      name: product.brand,
    },
    url: `${baseUrl}/products/${productId}`,
  };
}

export function generateBreadcrumbSchema(product: Product, productId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_PRODUCTION_URL || "https://soulart.ge";

  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "მთავარი",
      item: baseUrl,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "მაღაზია",
      item: `${baseUrl}/shop`,
    },
  ];

  // კატეგორიის სწორი ტიპის შემოწმება
  const categoryName =
    typeof product.mainCategory === "object"
      ? product.mainCategory?.name
      : product.mainCategory;

  const categoryId =
    typeof product.mainCategory === "object"
      ? product.mainCategory?._id || product.mainCategory?.id
      : product.mainCategory;

  if (categoryName) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: categoryName,
      item: `${baseUrl}/shop?category=${categoryId}`,
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: product.name,
    item: `${baseUrl}/products/${productId}`,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}
