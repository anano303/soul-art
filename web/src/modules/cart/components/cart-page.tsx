"use client";

import { useCart } from "../context/cart-context";
import { CartEmpty } from "./cart-empty";
import { CartItem } from "./cart-item";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import "./cart-page.css";

export function CartPage() {
  const { items, loading } = useCart();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (items.length === 0) {
    return <CartEmpty />;
  }

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = Number((0.15 * subtotal).toFixed(2));
  const total = subtotal + shipping + tax;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1 className="cart-title">Shopping Cart</h1>
        <p className="cart-items-count">{items.length} items</p>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {items.map((item) => (
            <CartItem key={item.productId} item={item} />
          ))}
        </div>

        <div className="order-summary">
          <div className="summary-card">
            <h2 className="summary-title">Order Summary</h2>
            <div className="summary-details">
              <div className="summary-row">
                <span className="summary-label">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Shipping</span>
                <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <hr className="separator" />
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                className="checkout-button"
                onClick={() => router.push("/checkout/shipping")}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
