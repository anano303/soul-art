"use client";

import { useCheckout } from "../context/checkout-context";
import { useCart } from "@/modules/cart/context/cart-context";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { TAX_RATE } from "@/config/constants";
import Image from "next/image";
import Link from "next/link";
import "./order-review.css";

export function OrderReview() {
  const { shippingAddress: shippingDetails, paymentMethod } = useCheckout();
  const { items, clearCart } = useCart();
  const router = useRouter();
  const { toast } = useToast();

  const itemsPrice = items.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const shippingPrice = itemsPrice > 100 ? 0 : 10;
  const taxPrice = Number((itemsPrice * TAX_RATE).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  const handlePlaceOrder = async () => {
    try {
      const orderItems = items.map((item) => ({
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
        productId: item.productId,
      }));

      const response = await apiClient.post("/orders", {
        orderItems,
        shippingDetails,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      });

      await clearCart();
      router.push(`/orders/${response.data._id}`);
    } catch (error) {
      console.log(error);
      toast({
        title: "Error placing order",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="order-review-grid">
      <div className="order-details col-span-8 space-y-6">
        {/* Shipping Address */}
        <div className="card p-6">
          <h2 className="section-title">Shipping</h2>
          <p className="address-details">
            <strong>Address: </strong>
            {shippingDetails?.address}, {shippingDetails?.city},{" "}
            {shippingDetails?.postalCode}, {shippingDetails?.country}
          </p>
        </div>

        {/* Payment Method */}
        <div className="card p-6">
          <h2 className="section-title">Payment</h2>
          <p className="payment-method">
            <strong>Method: </strong>
            {paymentMethod}
          </p>
        </div>

        {/* Order Items */}
        <div className="card p-6">
          <h2 className="section-title">Order Items</h2>
          <div className="order-items space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="order-item flex items-center space-x-4"
              >
                <div className="image-container relative h-20 w-20">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="order-item-details flex-1">
                  <Link
                    href={`/products/${item.productId}`}
                    className="item-name font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="item-price text-sm text-muted-foreground">
                    {item.qty} x ${item.price} = ${item.qty * item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="order-summary col-span-4">
        <div className="card p-6">
          <h2 className="section-title">Order Summary</h2>
          <div className="summary-details space-y-4">
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">Items</span>
              <span>${itemsPrice.toFixed(2)}</span>
            </div>
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">
                Shipping
              </span>
              <span>
                {shippingPrice === 0 ? "Free" : `$${shippingPrice.toFixed(2)}`}
              </span>
            </div>
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">Tax</span>
              <span>${taxPrice.toFixed(2)}</span>
            </div>
            <div className="separator" />
            <div className="summary-row flex justify-between font-medium">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <button
              className="place-order-button w-full"
              onClick={handlePlaceOrder}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
