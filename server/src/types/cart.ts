export interface CartItem {
  productId: string;
  name: string;
  nameEn?: string; // Add nameEn field
  image: string;
  price: number;
  countInStock: number;
  qty: number;
  size?: string; // Add size field
  color?: string; // Add color field
  ageGroup?: string; // Add ageGroup field
}
