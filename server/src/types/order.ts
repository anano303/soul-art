import { ShippingDetails, PaymentResult } from './shipping';
import { User } from '.';
export interface OrderItem {
  _id?: string;
  name: string;
  nameEn?: string;
  qty: number;
  image: string;
  price: number;
  productId: string;
  size?: string;
  color?: string;
  ageGroup?: string;
  product: {
    _id: string;
    nameEn?: string;
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
  externalOrderId: string; // Optional field for external order ID
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  statusReason?: string;
  stockReservationExpires?: string;
}
