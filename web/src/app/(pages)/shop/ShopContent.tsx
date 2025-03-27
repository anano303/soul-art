"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product } from "@/types";

const ShopContent = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const searchParams = useSearchParams();
  const brand = searchParams ? searchParams.get("brand") : null;

  // Set initial category state to 'all' when brand is present
  const initialCategory = brand ? 'all' : '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ["products", brand],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getProducts(pageParam, 10, undefined, brand || undefined);
      return response;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pages > lastPage.page ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    if (data) {
      const allProducts = data.pages.flatMap((page) => page.items);
      setProducts(allProducts);
      
      // Reset category and filter products when brand parameter exists
      if (brand) {
        setSelectedCategory('all'); // Reset category to 'all'
        const brandFiltered = allProducts.filter(
          product => product.brand && product.brand.toLowerCase() === brand.toLowerCase()
        );
        setFilteredProducts(brandFiltered);
      } else {
        setFilteredProducts(allProducts);
      }
    }
  }, [data, brand]);

  // Handle category changes while preserving brand filter
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    let filtered = [...products];
    
    if (brand) {
      filtered = filtered.filter(product => 
        product.brand && product.brand.toLowerCase() === brand.toLowerCase()
      );
    }
    
    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }
    
    setFilteredProducts(filtered);
  };

  const handleArtistChange = (artist: string) => {
    let filtered = [...products];
    
    if (artist) {
      filtered = filtered.filter(product => 
        product.brand && product.brand.toLowerCase() === artist.toLowerCase()
      );
    } else {
      filtered = products;
    }
    
    setFilteredProducts(filtered);
  };

  if (isLoading) return <div>იტვირთება...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        {brand ? `${brand}-ის პროდუქტები` : "ყველა პროდუქტი"}
      </h1>
      <ProductFilters 
        products={products}
        onCategoryChange={handleCategoryChange}
        onArtistChange={handleArtistChange}
        selectedCategory={selectedCategory}
      />
      <ProductGrid products={filteredProducts} />
    </div>
  );
};

export default ShopContent;
