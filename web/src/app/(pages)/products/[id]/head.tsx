import { Metadata } from "next";

interface HeadProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: HeadProps): Promise<Metadata> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/${params.id}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        title: "Product Not Found | SoulArt",
        description: "The requested product could not be found.",
      };
    }

    const product = await response.json();

    const title = `${product.name} - ${product.brand} | SoulArt`;

    let description =
      product.description?.slice(0, 160) ||
      `${product.name} by ${product.brand}`;
    if (product.hashtags && product.hashtags.length > 0) {
      const hashtagText = product.hashtags
        .map((tag: string) => `#${tag}`)
        .join(" ");
      description = `${description} ${hashtagText}`.slice(0, 160);
    }

    const categoryKeywords = [];
    if (
      typeof product.mainCategory === "object" &&
      product.mainCategory?.name
    ) {
      categoryKeywords.push(product.mainCategory.name);
    }
    if (typeof product.subCategory === "object" && product.subCategory?.name) {
      categoryKeywords.push(product.subCategory.name);
    }

    const keywords = [
      product.name,
      product.brand,
      ...categoryKeywords,
      ...(product.hashtags || []),
      "საზაფხულო",
      "მაისური",
      "SoulArt",
    ].join(", ");

    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        images:
          product.images?.length > 0
            ? [
                {
                  url: product.images[0],
                  width: 1200,
                  height: 630,
                  alt: product.name,
                },
              ]
            : [],
        type: "website",
        locale: "ka_GE",
        siteName: "soulart",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: product.images?.length > 0 ? [product.images[0]] : [],
      },
      alternates: {
        canonical: `https://soulart.ge/products/${params.id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Product | SoulArt",
      description: "Discover unique artworks on SoulArt",
    };
  }
}
