import { useCart } from "../context/cart-context";
import Link from "next/link";
import "./cart-icon.css";

export function CartIcon() {
  const { items } = useCart();
  const itemCount = items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <Link href="/cart">
      {/* <Button variant="ghost" size="icon" className="relative"> */}
      <button className="cartIconButton">
        {itemCount > 0 && <span className="cartIconsSpan">{itemCount}</span>}
        {/* <Image src={cartIcon} alt="cart icon" className="cartIcon" /> */}
        🛒
      </button>
      {/* </Button> */}
    </Link>
  );
}
