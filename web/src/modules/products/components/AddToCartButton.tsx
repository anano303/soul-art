"use client";

import { useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import "./ProductCard.css";
import { useCart } from "@/modules/cart/context/cart-context";
import { trackAddToCart as metaTrackAddToCart } from "@/components/MetaPixel";
import { trackAddToCart } from "@/lib/ga4-analytics";
import { trackAddToCart as trackSalesAddToCart } from "@/hooks/use-sales-tracking";

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  countInStock: number;
  className?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedAgeGroup?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  hideQuantity?: boolean; // New prop to hide quantity selector
  openCartOnAdd?: boolean; // New prop to open cart after adding
  iconOnly?: boolean; // New prop to show only icon, no text
  referralInfo?: {
    originalPrice: number;
    hasReferralDiscount: boolean;
    referralDiscountPercent: number;
    referralDiscountAmount: number;
  };
}

export function AddToCartButton({
  productId,
  productName,
  countInStock,
  className,
  selectedSize = "",
  selectedColor = "",
  selectedAgeGroup = "",
  quantity: externalQuantity,
  price,
  currency = "GEL",
  hideQuantity = false, // Default to false
  openCartOnAdd = false, // Default to false
  iconOnly = false, // Default to false
  referralInfo,
}: AddToCartButtonProps) {
  const { t } = useLanguage();
  const { addToCart, isItemInCart, getItemQuantity, updateQuantity } =
    useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(externalQuantity || 1);

  const isOutOfStock = countInStock === 0;
  const isInCart = isItemInCart(
    productId,
    selectedSize,
    selectedColor,
    selectedAgeGroup
  );
  const currentQuantity = getItemQuantity(
    productId,
    selectedSize,
    selectedColor,
    selectedAgeGroup
  );

  const handleAddToCart = async () => {
    // ვამოწმებთ მარაგის ლიმიტს
    const totalRequestedQuantity = isInCart
      ? currentQuantity + quantity
      : quantity;
    if (totalRequestedQuantity > countInStock) {
      toast({
        title: t("cart.error"),
        description: `მარაგში დარჩენილია მხოლოდ ${countInStock} ცალი`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isInCart) {
      // თუ უკვე კალათაშია, რაოდენობა განვაახლოთ updateQuantity-ით
      toast({
        title: t("cart.updatingQuantity"),
        description: t("cart.pleaseWait"),
      });

      try {
        const newQuantity = currentQuantity + quantity;
        await updateQuantity(
          productId,
          newQuantity,
          selectedSize,
          selectedColor,
          selectedAgeGroup
        );
        toast({
          title: t("cart.quantityUpdated"),
          description: `${t("cart.newQuantity")}: ${newQuantity}`,
        });

        trackAddToCart(productId, productName, price ?? 0, quantity);
        metaTrackAddToCart(
          productName,
          productId,
          (price ?? 0) * quantity,
          currency
        );
        // Sales Manager tracking
        trackSalesAddToCart(productId);
      } catch (error) {
        console.error("Update quantity error:", error);
        toast({
          title: t("cart.error"),
          description: t("cart.failedToUpdate"),
          variant: "destructive",
        });
      }
    } else {
      // ახალი პროდუქტი - მაგრამ ჯერ კვლავ ვამოწმებთ
      const doubleCheck = isItemInCart(
        productId,
        selectedSize,
        selectedColor,
        selectedAgeGroup
      );
      if (doubleCheck) {
        // თუ ამ დროს უკვე კალათაშია (race condition), განვაახლოთ რაოდენობა
        try {
          const currentQty = getItemQuantity(
            productId,
            selectedSize,
            selectedColor,
            selectedAgeGroup
          );
          const newQuantity = currentQty + quantity;
          await updateQuantity(
            productId,
            newQuantity,
            selectedSize,
            selectedColor,
            selectedAgeGroup
          );
          toast({
            title: t("cart.quantityUpdated"),
            description: `${t("cart.newQuantity")}: ${newQuantity}`,
          });

          trackAddToCart(productId, productName, price ?? 0, quantity);
          metaTrackAddToCart(
            productName,
            productId,
            (price ?? 0) * quantity,
            currency
          );
          // Sales Manager tracking
          trackSalesAddToCart(productId);
        } catch (error) {
          console.error("Update quantity error:", error);
          toast({
            title: t("cart.error"),
            description: t("cart.failedToUpdate"),
            variant: "destructive",
          });
        }
      } else {
        // ნამდვილად ახალი პროდუქტი
        toast({
          title: t("cart.addingToCart"),
          description: t("cart.pleaseWait"),
        });

        try {
          await addToCart(
            productId,
            quantity,
            selectedSize,
            selectedColor,
            selectedAgeGroup,
            price,
            referralInfo
          );
          toast({
            title: t("cart.addedToCart"),
            description: t("cart.productAdded"),
          });

          trackAddToCart(productId, productName, price ?? 0, quantity);
          metaTrackAddToCart(
            productName,
            productId,
            (price ?? 0) * quantity,
            currency
          );
          // Sales Manager tracking
          trackSalesAddToCart(productId);

          // Open cart if requested
          if (openCartOnAdd) {
            // Trigger cart open by clicking the cart button
            setTimeout(() => {
              const cartButton = document.querySelector(
                "[data-cart-toggle]"
              ) as HTMLElement;
              if (cartButton) {
                cartButton.click();
              }
            }, 300);
          }
        } catch (error) {
          console.error("Add to cart error:", error);
          toast({
            title: t("cart.error"),
            description: t("cart.failedToAdd"),
            variant: "destructive",
          });
        }
      }
    }

    setLoading(false);
  };

  const increaseQuantity = () => {
    const maxAllowed = isInCart ? countInStock - currentQuantity : countInStock;
    if (quantity < maxAllowed) setQuantity(quantity + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  return (
    <div className="cart-actions">
      {!hideQuantity && (
        <div className="quantity-container">
          <button
            className="quantity-button"
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
          >
            -
          </button>
          <span className="quantity-input">{quantity}</span>
          <button
            className="quantity-button"
            onClick={increaseQuantity}
            disabled={
              isInCart
                ? quantity >= countInStock - currentQuantity
                : quantity >= countInStock
            }
          >
            +
          </button>
        </div>
      )}

      <button
        className={`addButtonCart ${className} ${isInCart ? "in-cart" : ""} ${
          iconOnly ? "icon-only" : ""
        }`}
        disabled={
          isOutOfStock ||
          loading ||
          (isInCart && currentQuantity + quantity > countInStock)
        }
        onClick={handleAddToCart}
        title={
          iconOnly
            ? isOutOfStock
              ? t("cart.outOfStock")
              : loading
              ? t("cart.adding")
              : isInCart
              ? `${t("cart.inCart")} (${currentQuantity})`
              : t("cart.addToCart")
            : undefined
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {!iconOnly && (
          <span>
            {isOutOfStock
              ? t("cart.outOfStock")
              : loading
              ? t("cart.adding")
              : isInCart
              ? `${t("cart.inCart")} (${currentQuantity})`
              : t("cart.addToCart")}
          </span>
        )}
      </button>
    </div>
  );
}
