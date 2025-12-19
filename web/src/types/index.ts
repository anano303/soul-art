import { Role } from "./role";

export interface ArtistSocialLinks {
  instagram?: string;
  facebook?: string;
  behance?: string;
  dribbble?: string;
  website?: string;
  tiktok?: string;
  youtube?: string;
  pinterest?: string;
}

export interface ArtistProfile {
  id: string;
  name: string;
  storeName: string;
  artistSlug: string | null;
  artistBio: Record<string, string>;
  artistCoverImage?: string | null;
  artistDisciplines: string[];
  artistLocation?: string | null;
  artistOpenForCommissions: boolean;
  artistSocials: ArtistSocialLinks;
  artistHighlights: string[];
  artistGallery: string[];
  storeLogo?: string | null;
  followersCount?: number;
  followingCount?: number;
  artistRating?: number;
  artistReviewsCount?: number;
  artistDirectRating?: number;
  artistDirectReviewsCount?: number;
}

export interface PortfolioImageSummary {
  url: string;
  order: number;
  metadata?: Record<string, string>;
}

export interface PortfolioPostSummary {
  id: string;
  productId:
    | string
    | null
    | {
        _id: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        countInStock?: number;
        variants?: Array<{ stock?: number }>;
      };
  caption?: string | null;
  tags: string[];
  images: PortfolioImageSummary[];
  likesCount: number;
  commentsCount: number;
  hideBuyButton?: boolean; // Optional, derived from product if populated
  isSold?: boolean; // Optional, derived from product if populated
  isFeatured?: boolean; // Whether the post is marked as featured
  publishedAt?: string | null;
}

export interface ArtistProductSummary {
  id: string;
  name: string;
  price: number;
  images: string[];
  brand?: string | null;
  brandLogo?: string | null;
  rating?: number;
  numReviews?: number;
  description?: string;
  discountPercentage?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
  countInStock?: number;
  variants?: { stock?: number; size?: string; color?: string; ageGroup?: string }[];
  deliveryType?: "SELLER" | "SoulArt";
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  createdAt?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
}

export interface ArtistProfileResponse {
  artist: ArtistProfile;
  products: {
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasMore?: boolean;
    items: ArtistProductSummary[];
  };
  portfolio: {
    total: number;
    posts: PortfolioPostSummary[];
  };
}

// Adding category types for better organization
export enum MainCategory {
  PAINTINGS = "PAINTINGS",
  HANDMADE = "HANDMADE",
  CLOTHING = "CLOTHING",
  ACCESSORIES = "ACCESSORIES",
  FOOTWEAR = "FOOTWEAR",
  SWIMWEAR = "SWIMWEAR",
}

export enum AgeGroup {
  ADULTS = "ADULTS",
  KIDS = "KIDS",
}

// Standardized category interfaces
export interface Category {
  id: string;
  _id?: string;
  name: string;
  nameEn?: string;
  description?: string;
  isActive: boolean;
}

export interface SubCategory {
  id: string;
  _id?: string;
  name: string;
  nameEn?: string;
  categoryId: string;
  ageGroups: string[];
  sizes: string[];
  colors: string[];
  isActive: boolean;
}

export interface CategoryStructure {
  main: string;
  sub: string;
  ageGroup?: AgeGroup;
}

export interface ProductVariant {
  ageGroup?: string;
  size?: string;
  color?: string;
  stock: number;
}

export interface Color {
  _id: string;
  name: string;
  nameEn?: string;
  isActive: boolean;
}

export interface AgeGroupItem {
  _id: string;
  name: string;
  nameEn?: string;
  ageRange?: string;
  description?: string;
  isActive: boolean;
}
export interface Product {
  _id: string;
  user: User;
  name: string;
  nameEn?: string;
  images: string[];
  description: string;
  descriptionEn?: string;
  brand: string;
  brandLogo: string;
  category: string | { name: string; _id?: string; id?: string };
  subCategory?: string | { name: string; _id?: string; id?: string };
  mainCategory?: string | { name: string; _id?: string; id?: string };
  ageGroups?: string[];
  sizes?: string[];
  colors?: string[];
  categoryStructure?: CategoryStructure;
  price: number;
  countInStock: number;
  rating: number;
  numReviews: number;
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
  status: ProductStatus;
  viewCount?: number;
  rejectionReason?: string;
  deliveryType?: "SELLER" | "SoulArt";
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  hashtags?: string[]; // Added hashtags for SEO
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  isOriginal?: boolean;
  materials?: string[];
  materialsEn?: string[];
  variants?: ProductVariant[];
  videoDescription?: string; // YouTube embed code or URL
  youtubeVideoId?: string;
  youtubeVideoUrl?: string;
  youtubeEmbedUrl?: string;
  // Discount functionality
  discountPercentage?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  // Store visibility
  hideFromStore?: boolean;
}

export enum ProductStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface Review {
  name: string;
  nameEn?: string;
  rating: number;
  comment: string;
  user: string;
  createdAt: string;
}

export interface PaginatedProducts {
  products: Product[];
  page: number;
  pages: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  phoneNumber: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  storeName?: string;
  storeLogo?: string;
  artistSlug?: string | null;
  artistBio?: Record<string, string> | Map<string, string> | null;
  artistCoverImage?: string | null;
  artistDisciplines?: string[];
  artistLocation?: string | null;
  artistOpenForCommissions?: boolean;
  artistSocials?: ArtistSocialLinks;
  artistHighlights?: string[];
  artistGallery?: string[];
  artistRating?: number;
  artistReviewsCount?: number;
  artistDirectRating?: number;
  artistDirectReviewsCount?: number;
  ownerFirstName?: string;
  ownerLastName?: string;
  identificationNumber?: string;
  accountNumber?: string;
  seller?: {
    storeName: string;
    storeLogo?: string;
    ownerFirstName: string;
    ownerLastName: string;
    phoneNumber: string;
    email: string;
    identificationNumber: string;
    accountNumber: string;
    createdAt: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  summary?: {
    totalUsers: number;
    roleCounts: {
      admin: number;
      seller: number;
      user: number;
      blogger: number;
    };
  };
}
