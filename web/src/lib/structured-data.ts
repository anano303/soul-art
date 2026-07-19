export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SoulArt",
  alternateName: "ნახატები და ხელნაკეთი ნივთები",
  url: "https://soulart.ge",
  logo: "https://soulart.ge/logo.png",
  description: "ნახატები, ხელნაკეთი ნივთები და დეკორი",
  address: {
    "@type": "PostalAddress",
    streetAddress: "თქვენი მისამართი", // შეცვალეთ რეალური მისამართით
    addressLocality: "თბილისი",
    addressRegion: "თბილისი",
    addressCountry: "GE",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+995-551-00-00-59", // შეცვალეთ რეალური ნომრით
    contactType: "customer service",
    availableLanguage: ["Georgian", "English"],
  },
  sameAs: [
    "https://www.facebook.com/profile.php?id=61574985443236", // შეცვალეთ რეალური სოციალური ქსელებით
    "https://www.instagram.com/SoulArt.ge",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SoulArt",
  alternateName: "SoulArt - ხელნაკეთი ნივთები და ნახატები",
  url: "https://soulart.ge",
  description: "ხელნაკეთი ნივთები და ნახატები",
  inLanguage: ["ka", "en"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://soulart.ge/search/{search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export const storeSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "SoulArt",
  description: "ხელნაკეთი ნივთები და ნახატები",
  url: "https://soulart.ge",
  telephone: "+995-551-000-059", // შეცვალეთ რეალური ნომრით
  address: {
    "@type": "PostalAddress",
    streetAddress: "თქვენი მისამართი", // შეცვალეთ რეალური მისამართით
    addressLocality: "თბილისი",
    addressRegion: "თბილისი",
    postalCode: "0100", // შეცვალეთ რეალური postal code-ით
    addressCountry: "GE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "41.7151",
    longitude: "44.8271",
  },
  openingHours: "Mo-Su 09:00-18:00", // შეცვალეთ რეალური საათებით
  priceRange: "$$",
};

/**
 * schema.org/Product JSON-LD for a product detail page. Only emits fields that
 * are actually populated (no empty strings/nulls). Availability maps to the
 * real stock status.
 */
export function buildProductJsonLd(input: {
  name: string;
  description?: string | null;
  images?: string[] | null;
  sku?: string | null;
  brand?: string | null;
  price: number;
  inStock: boolean;
  url: string;
}) {
  const images = (input.images || []).filter(Boolean);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "GEL",
      price: input.price,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  if (images.length) schema.image = images;
  if (input.description) schema.description = input.description;
  if (input.sku) schema.sku = input.sku;
  if (input.brand) schema.brand = { "@type": "Brand", name: input.brand };
  return schema;
}

/**
 * schema.org/Person (individual artist) or /Organization (store/brand) JSON-LD
 * for an /@username profile page. Only emits populated fields.
 */
export function buildArtistJsonLd(input: {
  name: string;
  url: string;
  image?: string | null;
  description?: string | null;
  isStore?: boolean;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.isStore ? "Organization" : "Person",
    name: input.name,
    url: input.url,
  };
  if (input.image) schema.image = input.image;
  if (input.description) schema.description = input.description;
  return schema;
}
