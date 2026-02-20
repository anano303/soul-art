import { CartItem as CartItemType } from "@/types/cart";
import { useCart } from "../context/cart-context";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import Image from "next/image";
import Link from "next/link";
import "./cart-item.css";

interface CartItemProps {
  item: CartItemType;
  getLocalizedColorName?: (colorName: string) => string;
  formatItemPrice?: (price: number) => string;
}

export function CartItem({
  item,
  getLocalizedColorName: propGetLocalizedColorName,
  formatItemPrice,
}: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { t, language } = useLanguage();

  // Default price formatter if not provided
  const defaultFormatPrice = (price: number) => `${price.toFixed(2)} ₾`;
  const formatPrice = formatItemPrice || defaultFormatPrice;

  // Fetch all colors for proper nameEn support (only if not provided via props)
  const { data: availableColors = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !propGetLocalizedColorName, // Only fetch if not provided via props
  });

  // Fetch all age groups for proper nameEn support
  const { data: availableAgeGroups = [] } = useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories/attributes/age-groups"
        );
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  }); // Get localized color name based on current language (exact same logic as product-details.tsx)
  const getLocalizedColorName =
    propGetLocalizedColorName ||
    ((colorName: string): string => {
      if (language === "en") {
        // Find the color in availableColors to get its English name
        const colorObj = availableColors.find(
          (color) => color.name === colorName
        );
        return colorObj?.nameEn || colorName;
      }
      return colorName;
    });
  // Get localized age group name based on current language
  const getLocalizedAgeGroupName = (ageGroupName: string): string => {
    if (language === "en") {
      // Find the age group in availableAgeGroups to get its English name
      const ageGroupObj = availableAgeGroups.find(
        (ageGroup) => ageGroup.name === ageGroupName
      );
      return ageGroupObj?.nameEn || ageGroupName;
    }
    return ageGroupName;
  };

  // Display name based on selected language
  const displayName =
    language === "en" && item.nameEn ? item.nameEn : item.name;

  // Function to handle quantity updates with variant information
  const handleQuantityUpdate = (qty: number) => {
    updateQuantity(item.productId, qty, item.size, item.color, item.ageGroup);
  };

  // Function to handle item removal with variant information
  const handleRemoveItem = () => {
    removeItem(item.productId, item.size, item.color, item.ageGroup);
  };

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
          {/* Display variant information if available */}
          {(item.size || item.color || item.ageGroup) && (
            <div className="cart-item-variants">
              {" "}
              {item.size && (
                <span className="variant-tag">
                  {t("cart.size")}: {item.size}
                </span>
              )}
              <br />
              {item.color && (
                <span className="variant-tag">
                  {t("cart.color")}: {getLocalizedColorName(item.color)}
                </span>
              )}
              <br />
              {item.ageGroup && (
                <span className="variant-tag">
                  {t("cart.age")}: {getLocalizedAgeGroupName(item.ageGroup)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="cart-item-actions">
          <div className="cart-item-quantity">
            <select
              value={item.qty.toString()}
              onChange={(e) => handleQuantityUpdate(Number(e.target.value))}
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
            <button onClick={handleRemoveItem} className="remove-button">
              {t("cart.remove")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
