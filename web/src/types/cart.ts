export interface CartItem {
  productId: string;
  name: string;
  nameEn?: string; // Add nameEn field
  image: string;
  price: number;
  originalPrice?: number; // Original price before any discounts
  countInStock: number;
  qty: number;
  size?: string; // Add size field
  color?: string; // Add color field
  ageGroup?: string; // Add ageGroup field
  // Referral/Campaign discount tracking
  referralDiscountPercent?: number;
  referralDiscountAmount?: number;
  hasReferralDiscount?: boolean;
}
