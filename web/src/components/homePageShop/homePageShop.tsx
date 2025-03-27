"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./homePageShop.css";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product } from "@/types";

export default function HomePageShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      const { items } = await getProducts(1, 8);
      setProducts(items);
      setFilteredProducts(items);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];
    
    if (selectedCategory) {
      filtered = filtered.filter((product) => {
        return product.category === selectedCategory;
      });
    }
    
    if (selectedArtist && selectedArtist !== 'all') {
      filtered = filtered.filter((product) => {
        return product.brand && product.brand.toLowerCase() === selectedArtist.toLowerCase();
      });
    }
    
    console.log('Filtering products:', {
      total: products.length,
      filtered: filtered.length,
      category: selectedCategory,
      artist: selectedArtist
    });
    
    setFilteredProducts(filtered);
  }, [selectedCategory, selectedArtist, products]);

  return (
    <div className="container">
      <div className="content">
        <h1 className="title">ნამუშევრები</h1>
        
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
