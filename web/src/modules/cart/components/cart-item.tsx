import { CartItem as CartItemType } from "@/types/cart";
import { useCart } from "../context/cart-context";
import { useLanguage } from "@/hooks/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import "./cart-item.css";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { t, language } = useLanguage();

  // Display name based on selected language
  const displayName =
    language === "en" && item.nameEn ? item.nameEn : item.name;

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        <Image
          src={item.image}
          alt={displayName}
          fill
          className="object-cover rounded-md"
        />
      </div>
      <div className="cart-item-details">
        <div className="cart-item-info">
          <Link href={`/products/${item.productId}`} className="cart-item-name">
            {displayName}
          </Link>
          <p className="cart-item-price">{formatPrice(item.price)}</p>
        </div>
        <div className="cart-item-actions">
          <div className="cart-item-quantity">
            <select
              value={item.qty.toString()}
              onChange={(e) =>
                updateQuantity(item.productId, Number(e.target.value))
              }
            >
              {[...Array(item.countInStock)].map((_, i) => (
                <option key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="cart-item-total">
            <span className="cart-item-total-price">
              {formatPrice(item.price * item.qty)}
            </span>
            <button
              onClick={() => removeItem(item.productId)}
              className="remove-button"
            >
              {t("cart.remove")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
