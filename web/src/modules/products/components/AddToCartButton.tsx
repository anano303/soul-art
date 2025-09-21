"use client";

import { useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import "./ProductCard.css";
import { useCart } from "@/modules/cart/context/cart-context";

interface AddToCartButtonProps {
  productId: string;
  countInStock: number;
  className?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedAgeGroup?: string;
  quantity?: number;
  price?: number;
}

export function AddToCartButton({
  productId,
  countInStock,
  className,
  selectedSize = "",
  selectedColor = "",
  selectedAgeGroup = "",
  quantity: externalQuantity,
  price,
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
            price
          );
          toast({
            title: t("cart.addedToCart"),
            description: t("cart.productAdded"),
          });
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

      <button
        className={`addButtonCart ${className} ${isInCart ? "in-cart" : ""}`}
        disabled={
          isOutOfStock ||
          loading ||
          (isInCart && currentQuantity + quantity > countInStock)
        }
        onClick={handleAddToCart}
      >
        {/* <span>🛒</span> */}
        {isOutOfStock
          ? t("cart.outOfStock")
          : loading
          ? t("cart.adding")
          : isInCart
          ? `${t("cart.inCart")} (${currentQuantity})`
          : t("cart.addToCart")}
      </button>
    </div>
  );
}
