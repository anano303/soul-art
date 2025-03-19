"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./homePageShop.css";
import { ProductCard } from "@/modules/products/components/product-card";
import { getProducts } from "@/modules/products/api/get-products";
import { Product } from "@/types";
import { ProductCardSkeleton } from "@/modules/products/components/product-card-skeleton";

const HomePageShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const { items } = await getProducts(1, 10);
        setProducts(items);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <div className="homePageShop">
        <h1 className="homePageForumH1">ნამუშევრები</h1>
        <div className="productGrid">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="homePageShop">
      <h1 className="homePageForumH1">Shop</h1>
      <div className="productGrid">
        {products.map((product) => (
          <div key={product._id} style={{ display: "block" }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      <Link href="/shop" className="forumPageLink">
        See More
      </Link>
    </div>
  );
};

export default HomePageShop;
