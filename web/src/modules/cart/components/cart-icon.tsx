import { useCart } from "../context/cart-context";
import Image from "next/image";
import Link from "next/link";
import "./cart-icon.css";
// import { ShoppingCart } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import cart from "../../../assets/icons/cart.png"; // Assuming you have a cart icon image

export function CartIcon({ onNavigate }: { onNavigate?: () => void }) {
  const { items } = useCart();
  const { t } = useLanguage();
  const itemCount = items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <Link href="/cart" className="cart-icon-container" onClick={onNavigate}>
      <Image src={cart} alt="cart" className="shopping-cart-icon" />
      <span className="cart-text">{t("cart.title")}</span>
      {itemCount > 0 && <span className="cartIconsSpan">{itemCount}</span>}
    </Link>
  );
}
