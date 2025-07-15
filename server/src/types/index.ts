import { Role } from './role.enum';

export enum MainCategory {
  CLOTHING = 'CLOTHING',
  ACCESSORIES = 'ACCESSORIES',
  FOOTWEAR = 'FOOTWEAR',
  SWIMWEAR = 'SWIMWEAR',
}

export enum AgeGroup {
  ADULTS = 'ADULTS',
  KIDS = 'KIDS',
}

export interface CategoryStructure {
  main: MainCategory;
  sub: string;
  subEn?: string; // English translation of sub category
  ageGroup?: string;
  size?: string;
  color?: string;
  colorEn?: string; // English translation of color
}

export interface ProductVariant {
  size: string;
  color: string;
  colorEn?: string; // English translation of color
  stock: number;
  sku?: string;
}

export interface Product {
  _id: string;
  user: User;
  name: string;
  nameEn?: string;
  images: string[];
  description: string;
  descriptionEn?: string;
  hashtags?: string[]; // SEO hashtags for better search visibility
  brand?: string;
  brandLogo: string;
  category: string; // Legacy field  // New category system fields
  mainCategory?: string | any; // Reference to Category
  mainCategoryEn?: string | any; // English translation of mainCategory
  subCategory?: string | any; // Reference to SubCategory
  subCategoryEn?: string | any; // English translation of subCategory
  ageGroup?: string;
  size?: string;
  color?: string;
  colorEn?: string; // English translation of color
  categoryStructure?: CategoryStructure; // Legacy field
  price: number;
  countInStock: number; // Legacy field
  variants?: ProductVariant[]; // New field for inventory by size/color
  rating: number;
  numReviews: number;
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
  status: ProductStatus;
  rejectionReason?: string;
  deliveryType?: 'SELLER' | 'SoulArt'; // Corrected from 'SOULART' to 'SoulArt'
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  videoDescription?: string; // YouTube embed code or URL
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}
export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Review {
  name: string;
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
