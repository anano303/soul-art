import { ShippingDetails, PaymentResult } from "./shipping";
import { Product, User } from ".";

export interface OrderItem {
  _id: string;
  name: string;
  nameEn?: string;
  qty: number;
  image: string;
  price: number;
  productId: string | Product; // Can be string or populated Product
  product?: Product;
  size?: string;
  color?: string;
  ageGroup?: string;
}

export interface Order {
  _id: string;
  user?: User;
  isGuestOrder?: boolean;
  guestInfo?: {
    email: string;
    phoneNumber: string;
    fullName: string;
  };
  orderType?: "regular" | "auction";
  auctionId?: {
    _id: string;
    title: string;
    mainImage?: string;
    seller?: {
      _id: string;
      name?: string;
      storeName?: string;
      email?: string;
      phoneNumber?: string;
    };
  };
  orderItems: OrderItem[];
  shippingDetails: ShippingDetails;
  paymentMethod: string;
  paymentResult?: PaymentResult;
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  externalOrderId: string;
  status: "pending" | "paid" | "delivered" | "cancelled";
  statusReason?: string;
  stockReservationExpires?: string;
}
