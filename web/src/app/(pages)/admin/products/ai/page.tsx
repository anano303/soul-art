"use client";

import ProductExpertChat from "@/modules/ai/components/product-expert-chat";
import "./ProductAIPage.css"; // დავაკავშირე CSS ფაილი

export default function ProductAIPage() {
  return (
    <div className="product-ai__container">
      <div className="product-ai__content">
        <div className="product-ai__card">
          <h1 className="product-ai__title">Product Development Expert</h1>
          <p className="product-ai__description">
            Chat with our AI expert to help you develop and validate your
            product ideas. Get instant feedback on product features, branding,
            and market viability.
          </p>
        </div>

        <ProductExpertChat />
      </div>
    </div>
  );
}
