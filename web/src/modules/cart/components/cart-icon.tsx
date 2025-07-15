import { useCart } from "../context/cart-context";
import Image from "next/image";
import Link from "next/link";
import "./cart-icon.css";
// import { ShoppingCart } from "lucide-react";

import cart from "../../../assets/icons/cart.png"; // Assuming you have a cart icon image

export function CartIcon({ onNavigate }: { onNavigate?: () => void }) {
  const { items } = useCart();

  const itemCount = items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <Link href="/cart" className="cart-icon-container" onClick={onNavigate}>
      <Image src={cart} alt="cart" className="shopping-cart-icon"
      width={30} height={30} />

      {itemCount > 0 && <span className="cartIconsSpan">{itemCount}</span>}
    </Link>
  );
}
