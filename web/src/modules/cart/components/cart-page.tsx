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
  const tax = Number((0.02 * subtotal).toFixed(2));
  const total = subtotal + shipping + tax;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1 className="cart-title">თქვენი კალათა</h1>
        <p className="cart-items-count">{items.length} ნივთი</p>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {items.map((item) => (
            <CartItem key={item.productId} item={item} />
          ))}
        </div>

        <div className="order-summary">
          <div className="summary-card">
            <h2 className="summary-title">შეკვეთის დეტალები</h2>
            <div className="summary-details">
              <div className="summary-row">
                <span className="summary-label">ჯამი</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">მიწოდება</span>
                <span>{shipping === 0 ? "უფასო" : formatPrice(shipping)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">საკომისიო</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <hr className="separator" />
              <div className="summary-row total">
                <span>სრული ღირებულება</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                className="checkout-button"
                onClick={() => router.push("/checkout/shipping")}
              >
                შეკვეთის გაფორმება
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
