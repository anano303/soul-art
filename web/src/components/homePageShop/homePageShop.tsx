"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./homePageShop.css";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { Product } from "@/types";
import { ProductFilters } from "@/modules/products/components/product-filters";

export default function HomePageShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      const { items } = await getProducts(1, 4); // Fetch only 4 products
      setProducts(items);
      setFilteredProducts(items);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];
    
    if (selectedCategory) {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    if (selectedArtist) {
      filtered = filtered.filter((product) => 
        product.brand && product.brand.toLowerCase() === selectedArtist.toLowerCase()
      );
    }

    console.log('Filtering products:', {
      total: products.length,
      filtered: filtered.length,
      category: selectedCategory,
      artist: selectedArtist,
      filteredProducts: filtered
    });

    setFilteredProducts(filtered);
  }, [selectedCategory, selectedArtist, products]);

  return (
    <div className="container">
      <div className="content">
        <h1 className="title">ნამუშევრები </h1>

        <ProductFilters 
          products={products}
          onCategoryChange={setSelectedCategory}
          onArtistChange={setSelectedArtist}
        />
        <ProductGrid products={filteredProducts} />

        <div className="see-more">
          <Link href="/shop">
            <button className="see-more-btn">See More</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
