"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./homePageShop.css";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { Product } from "@/types";

export default function HomePageShop() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const { items } = await getProducts(1, 4); // Fetch only 4 products
      setProducts(items);
    }
    fetchProducts();
  }, []);

  return (
    <div className="container">
      <div className="content">
        <h1 className="title">ნამუშევრები </h1>

        <ProductGrid products={products} />

        <div className="see-more">
          <Link href="/shop">
            <button className="see-more-btn">See More</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
