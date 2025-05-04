import { Role } from "./role";

// Adding category types for better organization
export enum MainCategory {
  PAINTINGS = "PAINTINGS",
  HANDMADE = "HANDMADE",
}

export interface CategoryStructure {
  main: MainCategory;
  sub: string;
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
  category: string; // For backward compatibility
  categoryStructure?: CategoryStructure; // New structured category
  price: number;
  countInStock: number;
  rating: number;
  numReviews: number;
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
  status: ProductStatus;
  rejectionReason?: string;
  deliveryType?: "SELLER" | "SoulArt"; // Corrected from 'SOULART' to 'SoulArt'
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
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
