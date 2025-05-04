import { ShippingDetails, PaymentResult } from './shipping';
import { User } from '.';
export interface OrderItem {
  _id?: string;
  name: string;
  nameEn?: string; // Add nameEn field
  qty: number;
  image: string;
  price: number;
  productId: string;
  product: {
    _id: string;
    nameEn?: string; // Add nameEn field
    deliveryType?: string;
    minDeliveryDays?: number;
    maxDeliveryDays?: number;
    dimensions?: {
      width?: number;
      height?: number;
      depth?: number;
    };
  };
}

export interface Order {
  _id: string;
  user: User;
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
}
