"use client";

import { useEffect } from "react";
import {
  generateProductSchema,
  generateBreadcrumbSchema,
} from "@/lib/product-schema";
import { Product } from "@/types";

interface ProductSchemaProps {
  product: Product;
  productId: string;
}

export default function ProductSchema({
  product,
  productId,
}: ProductSchemaProps) {
  useEffect(() => {
    if (product && productId) {
      // Remove existing product schema scripts
      const existingProductScript = document.getElementById("product-schema");
      const existingBreadcrumbScript =
        document.getElementById("breadcrumb-schema");

      if (existingProductScript) {
        existingProductScript.remove();
      }
      if (existingBreadcrumbScript) {
        existingBreadcrumbScript.remove();
      }

      // Add Product Schema
      const productScript = document.createElement("script");
      productScript.type = "application/ld+json";
      productScript.id = "product-schema";
      productScript.textContent = JSON.stringify(
        generateProductSchema(product, productId)
      );
      document.head.appendChild(productScript);

      // Add Breadcrumb Schema
      const breadcrumbScript = document.createElement("script");
      breadcrumbScript.type = "application/ld+json";
      breadcrumbScript.id = "breadcrumb-schema";
      breadcrumbScript.textContent = JSON.stringify(
        generateBreadcrumbSchema(product, productId)
      );
      document.head.appendChild(breadcrumbScript);

      // Cleanup function
      return () => {
        const productScript = document.getElementById("product-schema");
        const breadcrumbScript = document.getElementById("breadcrumb-schema");
        if (productScript) productScript.remove();
        if (breadcrumbScript) breadcrumbScript.remove();
      };
    }
  }, [product, productId]);

  return null; // This component doesn't render anything visual
}
