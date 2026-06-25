import { isInStock } from "@/lib/stock";
import { generateBreadcrumbSchema } from "@/lib/product-schema";
import { getProduct } from "@/lib/get-product";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

// NOTE: generateMetadata lives in page.tsx (it needs searchParams to read
// ?lang=en). This layout only injects the JSON-LD structured data.
export default async function ProductLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const product = await getProduct(id);

  // Parse dimensions
  let parsedDimensions: {
    width?: number;
    height?: number;
    depth?: number;
  } | null = null;
  if (product?.dimensions) {
    try {
      parsedDimensions =
        typeof product.dimensions === "string"
          ? JSON.parse(product.dimensions)
          : product.dimensions;
    } catch {
      parsedDimensions = null;
    }
  }

  // JSON-LD Structured Data for Google Rich Snippets (სრული ინფორმაცია)
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        // ინგლისური სახელიც დავამატოთ alternateName-ში
        ...(product.nameEn && { alternateName: product.nameEn }),
        description: product.description || product.summary || "",
        image: product.images?.length > 0 ? product.images : ["/logo.png"],
        brand: {
          "@type": "Brand",
          name: product.brand || "SoulArt",
        },
        // კატეგორიები
        category:
          [
            product.mainCategory?.name,
            product.category?.name,
            product.subCategory?.name,
          ]
            .filter(Boolean)
            .join(" > ") || "ხელნაკეთი ნივთები",
        // ზომები (dimensions)
        ...(parsedDimensions &&
          (parsedDimensions.width || parsedDimensions.height) && {
            size: `${parsedDimensions.width || ""}x${
              parsedDimensions.height || ""
            }${parsedDimensions.depth ? `x${parsedDimensions.depth}` : ""} სმ`,
            width: parsedDimensions.width
              ? {
                  "@type": "QuantitativeValue",
                  value: parsedDimensions.width,
                  unitCode: "CMT",
                }
              : undefined,
            height: parsedDimensions.height
              ? {
                  "@type": "QuantitativeValue",
                  value: parsedDimensions.height,
                  unitCode: "CMT",
                }
              : undefined,
            depth: parsedDimensions.depth
              ? {
                  "@type": "QuantitativeValue",
                  value: parsedDimensions.depth,
                  unitCode: "CMT",
                }
              : undefined,
          }),
        // ტანსაცმლის ზომები
        ...(product.sizes?.length > 0 && {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "ზომები",
              value: product.sizes.join(", "),
            },
          ],
        }),
        // ფერები
        ...(product.colors?.length > 0 && { color: product.colors.join(", ") }),
        // მასალები
        ...(product.materials?.length > 0 && {
          material: product.materials.join(", "),
        }),
        // Hashtags როგორც keywords
        ...(product.hashtags?.length > 0 && {
          keywords: product.hashtags.join(", "),
        }),
        // ფასი და შეთავაზება
        offers: {
          "@type": "Offer",
          url: `https://soulart.ge/products/${id}`,
          priceCurrency: "GEL",
          price: product.discountedPrice || product.price,
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          availability: isInStock(product)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: "SoulArt",
            url: "https://soulart.ge",
          },
        },
        // მწარმოებელი/გამყიდველი
        manufacturer: {
          "@type": "Organization",
          name: product.brand || "SoulArt",
        },
        // SKU (პროდუქტის ID)
        sku: product._id,
        // რეიტინგი თუ აქვს
        ...(product.numReviews > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating || 5,
            reviewCount: product.numReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      }
    : null;

  const breadcrumbLd = product
    ? generateBreadcrumbSchema(product, id)
    : null;

  return (
    <>
      {/* Plain <script> tags so the JSON-LD is in the initial server HTML
          (next/script injects client-side, which Google may not see). */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      {children}
    </>
  );
}
