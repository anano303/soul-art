export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MyHunter",
  alternateName: "მაიჰანტერი",
  url: "https://myhunter.ge",
  logo: "https://myhunter.ge/logo.png",
  description: "საუკეთესო სანადირო და სათევზაო აღჭურვილობა საქართველოში",
  address: {
    "@type": "PostalAddress",
    streetAddress: "თქვენი მისამართი", // შეცვალეთ რეალური მისამართით
    addressLocality: "თბილისი",
    addressRegion: "თბილისი",
    addressCountry: "GE",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+995-XXX-XXX-XXX", // შეცვალეთ რეალური ნომრით
    contactType: "customer service",
    availableLanguage: ["Georgian", "English"],
  },
  sameAs: [
    "https://www.facebook.com/myhunter.ge", // შეცვალეთ რეალური სოციალური ქსელებით
    "https://www.instagram.com/myhunter.ge",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MyHunter",
  alternateName: "მაიჰანტერი",
  url: "https://myhunter.ge",
  description: "სანადირო და სათევზაო აღჭურვილობის ონლაინ მაღაზია",
  inLanguage: ["ka", "en"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://myhunter.ge/search/{search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export const storeSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "MyHunter",
  description: "სანადირო და სათევზაო აღჭურვილობის მაღაზია",
  url: "https://myhunter.ge",
  telephone: "+995-XXX-XXX-XXX", // შეცვალეთ რეალური ნომრით
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
