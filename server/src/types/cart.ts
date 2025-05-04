export interface CartItem {
  productId: string;
  name: string;
  nameEn?: string; // Add nameEn field
  image: string;
  price: number;
  countInStock: number;
  qty: number;
}
