export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SoulArt",
  alternateName: "ნახატები და ხელნაკეთი ნივთები",
  url: "https://SoulArt.ge",
  logo: "https://SoulArt.ge/logo.png",
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
  url: "https://SoulArt.ge",
  description: "ხელნაკეთი ნივთები და ნახატები",
  inLanguage: ["ka", "en"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://SoulArt.ge/search/{search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export const storeSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "SoulArt",
  description: "ხელნაკეთი ნივთები და ნახატები",
  url: "https://SoulArt.ge",
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
