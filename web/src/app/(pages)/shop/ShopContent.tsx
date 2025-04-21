"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, MainCategory } from "@/types";

const ShopContent = () => {
  const searchParams = useSearchParams();
  const brand = searchParams ? searchParams.get("brand") : null;
  const categoryParam = searchParams ? searchParams.get("category") : null;
  const mainCategoryParam = searchParams
    ? searchParams.get("mainCategory")
    : null;

  // Set initial category state using URL param if available
  const initialCategory = categoryParam || (brand ? "all" : "");

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  // Add new state for sort option
  const [sortOption, setSortOption] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<MainCategory>(
      mainCategoryParam === "HANDMADE"
        ? MainCategory.HANDMADE
        : MainCategory.PAINTINGS
    );

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ["products", brand],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getProducts(
        pageParam,
        10,
        undefined,
        brand || undefined
      );
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
        setSelectedCategory("all"); // Reset category to 'all'
        const brandFiltered = allProducts.filter(
          (product) =>
            product.brand && product.brand.toLowerCase() === brand.toLowerCase()
        );
        setFilteredProducts(brandFiltered);
      } else {
        setFilteredProducts(allProducts);
      }
    }
  }, [data, brand]);

  // Update useEffect to handle URL parameters for categories
  useEffect(() => {
    // Set main category from URL parameter if it exists
    if (mainCategoryParam) {
      if (mainCategoryParam === "HANDMADE") {
        setSelectedMainCategory(MainCategory.HANDMADE);
      } else if (mainCategoryParam === "PAINTINGS") {
        setSelectedMainCategory(MainCategory.PAINTINGS);
      }
    }

    // Set subcategory from URL parameter if it exists
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [mainCategoryParam, categoryParam]);

  // Apply filtering and sorting whenever relevant state changes
  useEffect(() => {
    let filtered = [...products];

    console.log("Shop filtering - initial products:", products.length);
    console.log("Selected main category:", selectedMainCategory);

    if (brand) {
      filtered = filtered.filter(
        (product) =>
          product.brand && product.brand.toLowerCase() === brand.toLowerCase()
      );
      console.log("After brand filter:", filtered.length);
    }

    // Filter by main category first - with string normalization
    filtered = filtered.filter((product) => {
      // Convert everything to strings for comparison
      const productMainCategory = product.categoryStructure?.main
        ?.toString()
        .toLowerCase();
      const selectedMainCategoryStr = selectedMainCategory
        ?.toString()
        .toLowerCase();

      console.log(`Product ${product._id}:`, {
        name: product.name,
        category: product.category,
        productMainCategory,
        selectedMainCategoryStr,
        hasStructure: !!product.categoryStructure,
      });

      // Handle legacy products without categoryStructure
      if (!product.categoryStructure) {
        // Default categorization based on known handmade categories
        const handmadeCategories = [
          "კერამიკა",
          "ხის ნაკეთობები",
          "სამკაულები",
          "ტექსტილი",
          "მინანქარი",
          "სკულპტურები",
          "სხვა",
        ];
        const isHandmade = handmadeCategories.includes(product.category);

        return (
          (isHandmade && selectedMainCategoryStr === "handmade") ||
          (!isHandmade && selectedMainCategoryStr === "paintings")
        );
      }

      // Direct string comparison for products with categoryStructure
      return productMainCategory === selectedMainCategoryStr;
    });

    console.log("After main category filter:", filtered.length);

    // Then filter by subcategory if selected
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
      console.log("After subcategory filter:", filtered.length);
    }

    // Apply sorting
    if (sortOption === "lowToHigh") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "highToLow") {
      filtered.sort((a, b) => b.price - a.price);
    }

    console.log("Final filtered products:", filtered.length);
    setFilteredProducts(filtered);
  }, [selectedCategory, selectedMainCategory, brand, products, sortOption]);

  // Handle category changes while preserving brand filter
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    
    // Update URL with category parameter
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (category) {
        url.searchParams.set("category", category);
      } else {
        url.searchParams.delete("category");
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleArtistChange = (artist: string) => {
    let filtered = [...products];

    if (artist) {
      filtered = filtered.filter(
        (product) =>
          product.brand && product.brand.toLowerCase() === artist.toLowerCase()
      );
    } else {
      filtered = products;
    }

    setFilteredProducts(filtered);
  };

  // Handle sort change
  const handleSortChange = (option: string) => {
    setSortOption(option);
  };

  // Handle main category changes
  const handleMainCategoryChange = (mainCategory: MainCategory) => {
    setSelectedMainCategory(mainCategory);
    
    // Update URL with main category parameter
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("mainCategory", mainCategory);
      window.history.pushState({}, "", url.toString());
    }
  };

  if (isLoading) return <div>იტვირთება...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        {brand ? `${brand}-ის ნამუშევრები` : "ყველა ნამუშევარი"}
      </h1>
      <ProductFilters
        products={products}
        onCategoryChange={handleCategoryChange}
        onArtistChange={handleArtistChange}
        onSortChange={handleSortChange}
        selectedCategory={selectedCategory}
        selectedMainCategory={selectedMainCategory}
        onMainCategoryChange={handleMainCategoryChange}
      />
      <ProductGrid products={filteredProducts} />
    </div>
  );
};

export default ShopContent;
