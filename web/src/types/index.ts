import { Role } from "./role";

export interface Product {
  _id: string;
  user: User;
  name: string;
  images: string[];
  description: string;
  brand: string;
  brandLogo: string;
  category: string; // Make sure this exists
  price: number;
  countInStock: number;
  rating: number;
  numReviews: number;
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
  status: ProductStatus;
  rejectionReason?: string;
}

export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
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