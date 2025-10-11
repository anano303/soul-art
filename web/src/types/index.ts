import { Role } from "./role";

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
  variants?: ProductVariant[];
  videoDescription?: string; // YouTube embed code or URL
  // Discount functionality
  discountPercentage?: number;
  discountStartDate?: string;
  discountEndDate?: string;
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
  storeName?: string;
  storeLogo?: string;
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
}
