import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import "./cart-empty.css";

export function CartEmpty() {
  return (
    <div className="cart-empty-container">
      <div className="cart-empty-icon">
        <ShoppingBag size={80} />
      </div>

      <div className="cart-empty-content">
        <h2 className="cart-empty-title">თქვენი კალათა ცარიელია</h2>
        <p className="cart-empty-message">
          როგორც ჩანს, თქვენ ჯერ არ დაგიმატებიათ ნივთები კალათაში
        </p>
      </div>

      <Link href="/" className="continue-shopping-link">
        <button className="continue-shopping-button">გაგრძელება</button>
      </Link>
    </div>
  );
}
