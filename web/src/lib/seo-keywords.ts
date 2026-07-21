import { cache } from "react";

export const BASE_KEYWORDS: string[] = [
  "ხელნაკეთი",
  "ნახატები",
  "ხელოვნება",
  "ნამუშევრები",
  "მაღაზია",
  "პირველი ონლაინ პლატფორმა",
  "Georgia",
  "handmade items",
  "პირველი ნახატების ონლაინ პლატფორმა",
  "პირველი ხელნაკეთი ნივთების ონლაინ პლატფორმა",
  "first online platform for paintings",
  "first online platform for handmade items",
  "Soulart",
  "სოულარტ",
  "სოულარტი",
  "სოულართი",
  "სოულართ",
  "soul art",
  "soulart",
  "soul",
  "soul-art",
  "საქართველო",
  "handmade",
  "paintings",
  "artworks",
  "art",
  "store",
  "crafts",
  "gallery",
];

/**
 * Homepage keywords — a short, scoped set (brand + top categories only).
 * Deliberately NOT the full GLOBAL_KEYWORDS list (that reads as keyword
 * stuffing). Mirrors the scoped approach used on /shop and /@username.
 */
export const HOME_KEYWORDS: string[] = [
  "Soulart",
  "soulart.ge",
  "ნახატები",
  "ხელნაკეთი ნივთები",
  "ქართველი მხატვრები",
  "ქართული ხელოვნება",
  "ხელოვნების ონლაინ მაღაზია",
  "ნახატების ყიდვა", // "buying paintings" — ტრანზაქციული intent
  "ორიგინალი ნახატები", // "original paintings" — ხშირად საძებნია
  "ქართული სუვენირი", // handmade-ის ხშირი ალტერნატიული საძიებო ტერმინი
  "handmade items",
  "paintings",
  "Georgian art marketplace",
  "art marketplace Georgia",
  "buy Georgian art",
  "original paintings online",
];

export const ADDITIONAL_KEYWORDS: string[] = [
  "ნახატები",
  "ქართველი მხატვრების ნახატები",
  "საჩუქრები",
  "საჩუქრად ნახატები",
  "საჩუქრად ხელნაკეთი ნივთები",
  "ნახატიები ონლაინ",
  "ხელნაკეთი ნივთები ონლაინ",
  "ქართველი მხატვრები",
  "ქართული ხელოვნება",
  "ნახატი",
  "ხელნაკეთი",
  "ნახატების საიტი",
  "ხელნაკეთი ნივთების საიტი",
  "ნახატების მაღაზია",
  "ხელნაკეთი ნივთების მაღაზია",
  "ხელოვანები",
  "ქართული ხელოვნება ონლაინ",
  "ნახატების ვებგვერდი",
  "ხელნაკეთი ნივთების ვებგვერდი",
  "ყველა ქართველი მხატვრის ნახატები",
  "ყველა ქართველი ხელოვანის ხელნაკეთი ნივთები",
  "ქართველი მხატვრების ნამუშევრები",
  "ქართველი ხელოვანების ნამუშევრები",
  "Soulart ბლოგი",
  "Soulart ინტერვიუები",
  "Soulart ქართველი მხატვრები",
  "Soulart.ge",
  "ხელნაკეთი ნივთები",
  "იყიდება ნახატები",
  "იყიდება ხელნაკეთი ნივთები",
  "ხელოვნების პლატფორმა",
  "ხელოვანების მხარდაჭერა",
  "Soulart ისტორია",
  "ხელოვანებისთვის",
  "ფასდაკლებები",
  "ხელოვნების ბაზარი",
  "ნახატების კოლექცია",
  "ხელოვნების გალერეა",
  "ხელოვანების საზოგადოება",
  "იყიდება ხელოვნების ნიმუშები",
  "ხელოვნების ღონისძიებები",
  "ხელოვნების გამოფენები",
  "ჩვენი ისტორია",
  "იყიდება ნახატები ონლაინ",
  "იყიდება ხელნაკეთი ნივთები ონლაინ",
  "ხელოვნების პლატფორმა საქართველოში",
  "ხელოვანების მხარდაჭერა ონლაინ",
  "დამფუძნებლები",
  "მისია",
  "ხედვა",
  "ლევან ბეროშვილი",
  "ანი ბეროშვილი",
  "about us",
  "our story",
  "mission",
  "vision",
  "Georgian art",
  "Georgian artists",
  "paintings for sale",
  "handmade for sale",
  "art marketplace",
  "art community",
  "buy art online",
  "buy handmade online",
  "art platform",
  "support artists",
  "Soulart history",
  "Georgian platform",
  "handmade",
];

export const GLOBAL_KEYWORDS: string[] = Array.from(
  new Set([...BASE_KEYWORDS, ...ADDITIONAL_KEYWORDS]),
);

const NON_WORD_REGEX = /[^\p{L}\p{N}\s-]+/gu;
const WORD_SPLIT_REGEX = /[\s,.;:!?()\[\]{}"“”'«»<>/|]+/gu;

const normalizeKeyword = (
  keyword: string | null | undefined,
): string | null => {
  if (!keyword) {
    return null;
  }

  const cleaned = keyword
    .replace(NON_WORD_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.length === 1 && !/\p{N}/u.test(cleaned)) {
    return null;
  }

  return cleaned;
};

const registerKeyword = (map: Map<string, string>, keyword?: string | null) => {
  const sanitized = normalizeKeyword(keyword);
  if (!sanitized) {
    return;
  }

  const key = sanitized.toLowerCase();
  if (!map.has(key)) {
    map.set(key, sanitized);
  }
};

const registerKeywordsFromArray = (
  map: Map<string, string>,
  values?: Array<string | null | undefined> | null,
) => {
  values?.forEach((value) => registerKeyword(map, value));
};

const registerKeywordsFromText = (
  map: Map<string, string>,
  text?: string | null,
) => {
  extractKeywordsFromText(text).forEach((keyword) =>
    registerKeyword(map, keyword),
  );
};

const registerKeywordFromImage = (
  map: Map<string, string>,
  imageUrl?: string | null,
) => {
  if (!imageUrl) {
    return;
  }

  try {
    const url = new URL(imageUrl, "https://placeholder.local");
    const fileName = url.pathname.split("/").pop();
    if (fileName) {
      const baseName = fileName.replace(/\.[^/.]+$/, " ");
      registerKeyword(map, baseName);
    }
  } catch {
    const fileName = imageUrl.split("/").pop();
    if (fileName) {
      const baseName = fileName.replace(/\.[^/.]+$/, " ");
      registerKeyword(map, baseName);
    }
  }
};

const registerKeywordFromNumber = (
  map: Map<string, string>,
  value?: number | null,
  prefix?: string,
) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return;
  }

  const formatted = prefix ? `${prefix} ${value}` : `${value}`;
  registerKeyword(map, formatted);
};

const registerBooleanKeyword = (
  map: Map<string, string>,
  value?: boolean | null,
  trueLabels?: string[],
  falseLabels?: string[],
) => {
  if (value === undefined || value === null) {
    return;
  }

  const labels = value ? trueLabels : falseLabels;
  labels?.forEach((label) => registerKeyword(map, label));
};

const registerYearFromDate = (
  map: Map<string, string>,
  date?: string | null,
) => {
  if (!date) {
    return;
  }

  const parsed = new Date(date);
  const year = parsed.getFullYear();
  if (!Number.isNaN(year)) {
    registerKeyword(map, `${year}`);
  }
};

const shouldSkipKeywordAggregation = (): boolean => {
  const phase = process.env.NEXT_PHASE;
  if (phase === "phase-production-build" || phase === "phase-export") {
    return true;
  }

  return process.env.SKIP_SEO_KEYWORD_AGGREGATION === "true";
};

export const sanitizeKeyword = normalizeKeyword;

export const extractKeywordsFromText = (text?: string | null): string[] => {
  if (!text) {
    return [];
  }

  const map = new Map<string, string>();
  text.split(WORD_SPLIT_REGEX).forEach((segment) => {
    registerKeyword(map, segment);
  });

  return Array.from(map.values());
};

export const mergeKeywordSets = (
  ...keywordSets: Array<string[] | undefined | null>
): string[] => {
  const map = new Map<string, string>();
  keywordSets.forEach((set) => {
    set?.forEach((keyword) => registerKeyword(map, keyword));
  });
  return Array.from(map.values());
};

type MaybeCategory =
  | string
  | {
      name?: string | null;
      title?: string | null;
    };

type ProductKeywordSource = {
  name?: string | null;
  nameEn?: string | null;
  brand?: string | null;
  brandLogo?: string | null;
  category?: MaybeCategory;
  subCategory?: MaybeCategory;
  mainCategory?: MaybeCategory;
  hashtags?: string[] | null;
  description?: string | null;
  descriptionEn?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  materials?: string[] | null;
  materialsEn?: string[] | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  ageGroups?: string[] | null;
  images?: string[] | null;
  variants?: Array<{
    name?: string | null;
    sku?: string | null;
    optionValues?: Array<{ value?: string | null }> | null;
  }> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
  videoDescription?: string | null;
  youtubeVideoId?: string | null;
  youtubeVideoUrl?: string | null;
  youtubeEmbedUrl?: string | null;
  categoryStructure?: {
    main?: string | null;
    sub?: string | null;
    ageGroup?: string | null;
  } | null;
  deliveryType?: string | null;
  minDeliveryDays?: number | null;
  maxDeliveryDays?: number | null;
  discountPercentage?: number | null;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
  dimensions?: {
    width?: number | null;
    height?: number | null;
    depth?: number | null;
  } | null;
  isOriginal?: boolean | null;
  reviews?: Array<{
    name?: string | null;
    nameEn?: string | null;
    comment?: string | null;
  }> | null;
  viewCount?: number | null;
  rating?: number | null;
  numReviews?: number | null;
  price?: number | null;
  countInStock?: number | null;
  user?: {
    name?: string | null;
    storeName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    artistSlug?: string | null;
    artistLocation?: string | null;
    storeLogo?: string | null;
    artistBio?: Record<string, string | null | undefined> | null;
    artistHighlights?: string[] | null;
    artistGallery?: string[] | null;
    artistSocials?: Record<string, string | null | undefined> | null;
    artistOpenForCommissions?: boolean | null;
    followersCount?: number | null;
    followingCount?: number | null;
    ownerFirstName?: string | null;
    ownerLastName?: string | null;
    identificationNumber?: string | null;
    accountNumber?: string | null;
    seller?: {
      storeName?: string | null;
      storeLogo?: string | null;
      ownerFirstName?: string | null;
      ownerLastName?: string | null;
      phoneNumber?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

export const collectProductKeywords = (
  product?: ProductKeywordSource | null,
): string[] => {
  if (!product) {
    return [];
  }

  const map = new Map<string, string>();

  registerKeyword(map, product.name);
  registerKeyword(map, product.nameEn);
  registerKeyword(map, product.brand);
  registerKeyword(map, product.seoTitle);
  registerKeyword(map, product.slug);

  registerKeywordsFromText(map, product.description);
  registerKeywordsFromText(map, product.descriptionEn);
  registerKeywordsFromText(map, product.summary);
  registerKeywordsFromText(map, product.summaryEn);
  registerKeywordsFromText(map, product.videoDescription);
  registerKeywordsFromText(map, product.seoDescription);

  resolveCategoryKeywords(product.category).forEach((value) =>
    registerKeyword(map, value),
  );
  resolveCategoryKeywords(product.subCategory).forEach((value) =>
    registerKeyword(map, value),
  );
  resolveCategoryKeywords(product.mainCategory).forEach((value) =>
    registerKeyword(map, value),
  );

  const normalizedHashtags = product.hashtags?.map((tag) =>
    typeof tag === "string" ? tag.replace(/^#+/, "") : tag,
  );
  registerKeywordsFromArray(map, normalizedHashtags ?? undefined);
  registerKeywordsFromArray(map, product.materials ?? undefined);
  registerKeywordsFromArray(map, product.colors ?? undefined);
  registerKeywordsFromArray(map, product.sizes ?? undefined);
  registerKeywordsFromArray(map, product.ageGroups ?? undefined);

  // NOTE: intentionally NOT registering image filenames (S3 hashes), numeric
  // values (price/stock/views/dimensions/discount/delivery), or any PII
  // (email/phone/account number/ID/owner names). Those are not genuine search
  // keywords and previously leaked private seller data into <meta keywords>.

  product.variants?.forEach((variant) => {
    registerKeyword(map, variant?.name);
    variant?.optionValues?.forEach((option) =>
      registerKeyword(map, option?.value),
    );
  });

  registerBooleanKeyword(map, product.isOriginal, ["original"], ["copy"]);

  // Only the seller's public artist identity — name/store/location/highlights.
  if (product.user) {
    registerKeyword(map, product.user.name);
    registerKeyword(map, product.user.storeName);
    registerKeyword(map, product.user.artistSlug);
    registerKeyword(map, product.user.artistLocation);
    registerKeywordsFromArray(map, product.user.artistHighlights ?? undefined);
  }

  product.reviews?.forEach((review) => {
    registerKeywordsFromText(map, review?.comment ?? undefined);
  });

  return Array.from(map.values());
};

const resolveCategoryKeywords = (category?: MaybeCategory): string[] => {
  if (!category) {
    return [];
  }

  if (typeof category === "string") {
    return [category];
  }

  return [category.name, category.title].filter((value): value is string =>
    Boolean(value),
  );
};

const PRODUCT_FETCH_LIMIT = 50;
const PRODUCT_MAX_PAGES = 1;

const fetchProductKeywordsInternal = cache(async (): Promise<string[]> => {
  if (shouldSkipKeywordAggregation()) {
    return [];
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return [];
  }

  try {
    const map = new Map<string, string>();
    let page = 1;

    while (page <= PRODUCT_MAX_PAGES) {
      const url = `${apiBase}/products?page=${page}&limit=${PRODUCT_FETCH_LIMIT}&sort=createdAt&direction=desc&populate=user&select=name,nameEn,brand,brandLogo,description,descriptionEn,summary,summaryEn,category,subCategory,mainCategory,hashtags,materials,colors,sizes,ageGroups,images,variants,seoTitle,seoDescription,slug,videoDescription,youtubeVideoId,youtubeVideoUrl,youtubeEmbedUrl,categoryStructure,deliveryType,minDeliveryDays,maxDeliveryDays,discountPercentage,discountStartDate,discountEndDate,dimensions,isOriginal,reviews,viewCount,rating,numReviews,price,countInStock,user`;

      let response: Response;
      try {
        response = await fetch(url, {
          next: { revalidate: 3600 },
        });
      } catch (fetchError) {
        // Network error - API might be unavailable during build or SSR
        console.warn(
          "Network error fetching product keywords, skipping:",
          fetchError instanceof Error ? fetchError.message : fetchError,
        );
        break;
      }

      if (!response.ok) {
        console.warn("Failed to fetch product keywords", response.status);
        break;
      }

      const data = await response.json();
      const items: ProductKeywordSource[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
            ? data
            : [];

      if (!items.length) {
        break;
      }

      items.forEach((item) => {
        // Public, search-relevant fields only. No image hashes, numeric values,
        // youtube/url ids, or seller PII (those previously leaked into meta).
        registerKeyword(map, item.name);
        registerKeyword(map, item.nameEn);
        registerKeyword(map, item.brand);
        registerKeyword(map, item.seoTitle);
        registerKeywordsFromText(map, item.seoDescription);
        registerKeywordsFromText(map, item.description);
        registerKeywordsFromText(map, item.descriptionEn);
        registerKeywordsFromText(map, item.summary);
        registerKeywordsFromText(map, item.summaryEn);

        registerKeywordsFromArray(map, item.materials);
        registerKeywordsFromArray(map, item.colors);
        registerKeywordsFromArray(map, item.sizes);
        registerKeywordsFromArray(map, item.ageGroups);

        resolveCategoryKeywords(item.category).forEach((value) =>
          registerKeyword(map, value),
        );
        resolveCategoryKeywords(item.subCategory).forEach((value) =>
          registerKeyword(map, value),
        );
        resolveCategoryKeywords(item.mainCategory).forEach((value) =>
          registerKeyword(map, value),
        );

        if (item.categoryStructure) {
          registerKeyword(map, item.categoryStructure.main);
          registerKeyword(map, item.categoryStructure.sub);
          registerKeyword(map, item.categoryStructure.ageGroup);
        }

        registerBooleanKeyword(map, item.isOriginal, [
          "ორიგინალი ნამუშევარი",
          "original artwork",
        ]);

        if (Array.isArray(item.hashtags)) {
          item.hashtags.forEach((tag) => {
            if (typeof tag === "string") {
              registerKeyword(map, tag.replace(/^#+/, ""));
            }
          });
        }

        if (Array.isArray(item.variants)) {
          item.variants.forEach((variant) => {
            registerKeyword(map, variant.name);
            variant.optionValues?.forEach((option) =>
              registerKeyword(map, option?.value),
            );
          });
        }

        if (item.user) {
          registerKeyword(map, item.user.name);
          registerKeyword(map, item.user.storeName);
          registerKeyword(map, item.user.artistSlug);
          registerKeywordsFromText(map, item.user.artistLocation);
          registerKeywordsFromArray(map, item.user.artistHighlights ?? []);
        }
      });

      if (items.length < PRODUCT_FETCH_LIMIT) {
        break;
      }

      page += 1;
    }

    return Array.from(map.values());
  } catch (error) {
    console.error("Error fetching product keywords", error);
    return [];
  }
});

export const getProductKeywords = async (): Promise<string[]> => {
  return await fetchProductKeywordsInternal();
};

type ArtistKeywordSource = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  storeName?: string | null;
  slug?: string | null;
  artistSlug?: string | null;
  artistDisciplines?: string[] | null;
  artistLocation?: string | null;
  artistHighlights?: string[] | null;
  artistSocials?: Record<string, string | null | undefined> | null;
  artistGallery?: string[] | null;
  artistBio?: Record<string, string | null | undefined> | null;
  bio?: string | null;
  artistCoverImage?: string | null;
  storeLogo?: string | null;
  artistOpenForCommissions?: boolean | null;
  followersCount?: number | null;
  followingCount?: number | null;
};

const ARTIST_FETCH_LIMIT = 50;
const ARTIST_MAX_PAGES = 1;

const fetchArtistKeywordsInternal = cache(async (): Promise<string[]> => {
  if (shouldSkipKeywordAggregation()) {
    return [];
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return [];
  }

  try {
    const map = new Map<string, string>();
    let page = 1;

    while (page <= ARTIST_MAX_PAGES) {
      const url = `${apiBase}/artists?limit=${ARTIST_FETCH_LIMIT}&page=${page}`;

      let response: Response;
      try {
        response = await fetch(url, {
          next: { revalidate: 3600 },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
      } catch (fetchError) {
        console.warn(
          "Network error fetching artist keywords, skipping:",
          fetchError instanceof Error ? fetchError.message : fetchError,
        );
        break;
      }

      if (!response.ok) {
        console.warn("Failed to fetch artist keywords", response.status);
        break;
      }

      const data = await response.json();
      const items: ArtistKeywordSource[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

      if (!items.length) {
        break;
      }

      items.forEach((artist) => {
        registerKeyword(map, artist.name);
        registerKeyword(map, artist.firstName);
        registerKeyword(map, artist.lastName);
        registerKeyword(map, artist.storeName);
        registerKeyword(map, artist.slug);
        registerKeyword(map, artist.artistSlug);
        registerKeywordsFromText(map, artist.artistLocation);
        registerKeywordsFromArray(map, artist.artistDisciplines ?? []);
        registerKeywordsFromArray(map, artist.artistHighlights ?? []);
        registerKeywordsFromText(map, artist.bio);

        registerBooleanKeyword(
          map,
          artist.artistOpenForCommissions,
          ["commissions open", "საკომისიო ღიაა"],
          ["commissions closed", "საკომისიო დახურულია"],
        );

        if (artist.artistBio) {
          Object.values(artist.artistBio).forEach((value) =>
            registerKeywordsFromText(map, value ?? undefined),
          );
        }
      });

      if (items.length < ARTIST_FETCH_LIMIT) {
        break;
      }

      page += 1;
    }

    return Array.from(map.values());
  } catch (error) {
    console.error("Error fetching artist keywords", error);
    return [];
  }
});

export const getArtistKeywords = async (): Promise<string[]> => {
  return await fetchArtistKeywordsInternal();
};

type ForumKeywordSource = {
  content?: string | null;
  title?: string | null;
  tags?: string[] | null;
  user?: {
    name?: string | null;
    username?: string | null;
  } | null;
  comments?: Array<{
    content?: string | null;
    user?: {
      name?: string | null;
    } | null;
  }> | null;
  image?: string | null;
  createdAt?: string | null;
  likes?: number | null;
};

const FORUM_FETCH_TAKE = 50;
const FORUM_MAX_PAGES = 1;

const fetchForumKeywordsInternal = cache(async (): Promise<string[]> => {
  if (shouldSkipKeywordAggregation()) {
    return [];
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return [];
  }

  try {
    const map = new Map<string, string>();
    let page = 1;

    while (page <= FORUM_MAX_PAGES) {
      const url = `${apiBase}/forums?page=${page}&take=${FORUM_FETCH_TAKE}`;

      let response: Response;
      try {
        response = await fetch(url, {
          next: { revalidate: 1800 },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
      } catch (fetchError) {
        console.warn(
          "Network error fetching forum keywords, skipping:",
          fetchError instanceof Error ? fetchError.message : fetchError,
        );
        break;
      }

      if (!response.ok) {
        console.warn("Failed to fetch forum keywords", response.status);
        break;
      }

      const data = await response.json();
      const items: ForumKeywordSource[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.forums)
          ? data.forums
          : Array.isArray(data)
            ? data
            : [];

      if (!items.length) {
        break;
      }

      items.forEach((forum) => {
        registerKeywordsFromText(map, forum.title);
        registerKeywordsFromText(map, forum.content);
        registerKeywordsFromArray(map, forum.tags ?? []);
        registerKeyword(map, forum.user?.name);
        registerKeyword(map, forum.user?.username);

        forum.comments?.forEach((comment) => {
          registerKeywordsFromText(map, comment.content);
          registerKeyword(map, comment.user?.name);
        });

        registerKeywordFromImage(map, forum.image);
        registerYearFromDate(map, forum.createdAt);
        registerKeywordFromNumber(map, forum.likes, "likes");
      });

      if (items.length < FORUM_FETCH_TAKE) {
        break;
      }

      page += 1;
    }

    return Array.from(map.values());
  } catch (error) {
    console.error("Error fetching forum keywords", error);
    return [];
  }
});

export const getForumKeywords = async (): Promise<string[]> => {
  return await fetchForumKeywordsInternal();
};

type CategoryKeywordSource = {
  name?: string | null;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean | null;
};

const CATEGORY_FETCH_LIMIT = 100;
const CATEGORY_MAX_PAGES = 1;

const fetchCategoryKeywordsInternal = cache(async (): Promise<string[]> => {
  if (shouldSkipKeywordAggregation()) {
    return [];
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return [];
  }

  try {
    const map = new Map<string, string>();
    let page = 1;

    while (page <= CATEGORY_MAX_PAGES) {
      const url = `${apiBase}/categories?page=${page}&limit=${CATEGORY_FETCH_LIMIT}&includeInactive=true`;

      let response: Response;
      try {
        response = await fetch(url, {
          next: { revalidate: 3600 },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
      } catch (fetchError) {
        console.warn(
          "Network error fetching category keywords, skipping:",
          fetchError instanceof Error ? fetchError.message : fetchError,
        );
        break;
      }

      if (!response.ok) {
        console.warn("Failed to fetch category keywords", response.status);
        break;
      }

      const data = await response.json();
      const items: CategoryKeywordSource[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.categories)
          ? data.categories
          : Array.isArray(data)
            ? data
            : [];

      if (!items.length) {
        break;
      }

      items.forEach((category) => {
        registerKeyword(map, category.name);
        registerKeyword(map, category.nameEn);
        registerKeywordsFromText(map, category.description);
      });

      if (items.length < CATEGORY_FETCH_LIMIT) {
        break;
      }

      page += 1;
    }

    return Array.from(map.values());
  } catch (error) {
    console.error("Error fetching category keywords", error);
    return [];
  }
});

export const getCategoryKeywords = async (): Promise<string[]> => {
  return await fetchCategoryKeywordsInternal();
};

type SubCategoryKeywordSource = {
  name?: string | null;
  nameEn?: string | null;
  ageGroups?: string[] | null;
  sizes?: string[] | null;
  colors?: string[] | null;
  description?: string | null;
};

const SUBCATEGORY_FETCH_LIMIT = 100;
const SUBCATEGORY_MAX_PAGES = 1;

const fetchSubCategoryKeywordsInternal = cache(async (): Promise<string[]> => {
  if (shouldSkipKeywordAggregation()) {
    return [];
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return [];
  }

  try {
    const map = new Map<string, string>();
    let page = 1;

    while (page <= SUBCATEGORY_MAX_PAGES) {
      const url = `${apiBase}/subcategories?page=${page}&limit=${SUBCATEGORY_FETCH_LIMIT}&includeInactive=true`;

      let response: Response;
      try {
        response = await fetch(url, {
          next: { revalidate: 3600 },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
      } catch (fetchError) {
        console.warn(
          "Network error fetching subcategory keywords, skipping:",
          fetchError instanceof Error ? fetchError.message : fetchError,
        );
        break;
      }

      if (!response.ok) {
        console.warn("Failed to fetch subcategory keywords", response.status);
        break;
      }

      const data = await response.json();
      const items: SubCategoryKeywordSource[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.subcategories)
          ? data.subcategories
          : Array.isArray(data)
            ? data
            : [];

      if (!items.length) {
        break;
      }

      items.forEach((subcategory) => {
        registerKeyword(map, subcategory.name);
        registerKeyword(map, subcategory.nameEn);
        registerKeywordsFromArray(map, subcategory.ageGroups ?? []);
        registerKeywordsFromArray(map, subcategory.sizes ?? []);
        registerKeywordsFromArray(map, subcategory.colors ?? []);
        registerKeywordsFromText(map, subcategory.description);
      });

      if (items.length < SUBCATEGORY_FETCH_LIMIT) {
        break;
      }

      page += 1;
    }

    return Array.from(map.values());
  } catch (error) {
    console.error("Error fetching subcategory keywords", error);
    return [];
  }
});

export const getSubCategoryKeywords = async (): Promise<string[]> => {
  return await fetchSubCategoryKeywordsInternal();
};

type BannerKeywordSource = {
  title?: string | null;
  titleEn?: string | null;
  buttonText?: string | null;
  buttonTextEn?: string | null;
  buttonLink?: string | null;
  imageUrl?: string | null;
};

const fetchBannerKeywordsInternal = cache(async (): Promise<string[]> => {
  if (shouldSkipKeywordAggregation()) {
    return [];
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return [];
  }

  try {
    const url = `${apiBase}/banners/active`;

    let response: Response;
    try {
      response = await fetch(url, {
        next: { revalidate: 900 },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      console.warn(
        "Network error fetching banner keywords, skipping:",
        fetchError instanceof Error ? fetchError.message : fetchError,
      );
      return [];
    }

    if (!response.ok) {
      console.warn("Failed to fetch banner keywords", response.status);
      return [];
    }

    const data = await response.json();
    const items: BannerKeywordSource[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

    const map = new Map<string, string>();

    items.forEach((banner) => {
      registerKeyword(map, banner.title);
      registerKeyword(map, banner.titleEn);
      registerKeyword(map, banner.buttonText);
      registerKeyword(map, banner.buttonTextEn);
      registerKeywordsFromText(map, banner.buttonLink);
      registerKeywordFromImage(map, banner.imageUrl);
    });

    return Array.from(map.values());
  } catch (error) {
    console.error("Error fetching banner keywords", error);
    return [];
  }
});

export const getBannerKeywords = async (): Promise<string[]> => {
  return await fetchBannerKeywordsInternal();
};
