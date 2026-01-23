import {
  Product,
  ProductDocument,
  DeliveryType,
} from 'src/products/schemas/product.schema';

export interface ShippingDetails {
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
}

export interface OrderItem {
  name: string;
  nameEn?: string;
  qty: number;
  image: string;
  price: number;
  originalPrice?: number; // Price before any discounts
  productId: string;
  size?: string;
  color?: string;
  ageGroup?: string;
  // Referral/Campaign discount info
  referralDiscountPercent?: number; // Discount % applied from campaign
  referralDiscountAmount?: number; // Actual discount amount per item
  hasReferralDiscount?: boolean; // Flag to show this item has referral pricing
  product?: {
    deliveryType?: string; // Use string type to avoid enum conversion issues
    minDeliveryDays?: number;
    maxDeliveryDays?: number;
    dimensions?: {
      width?: number;
      height?: number;
      depth?: number;
    };
  };
}

export interface PaymentResult {
  id: string;
  status: string;
  update_time: string;
  email_address: string;
  provider?: 'PayPal' | 'Stripe' | 'Bog';
}

export interface CartItem {
  productId: string;
  name: string;
  nameEn?: string;
  image: string;
  price: number;
  countInStock: number;
  qty: number;
}

export interface PaginatedProducts {
  products: ProductDocument[];
  pages: number;
  page: number;
}
