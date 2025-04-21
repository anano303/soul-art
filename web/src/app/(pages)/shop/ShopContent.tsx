"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, MainCategory } from "@/types";
// Import the new CSS file
import "./ShopPage.css";
// Import the animated icons CSS
import "./ShopAnimatedIcons.css";
// Import icons from lucide-react
import {
  Paintbrush,
  Palette,
  Printer,
  Square,
  Scissors,
  CakeSlice,
  Hammer,
  Gem,
} from "lucide-react";

const ShopContent = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const searchParams = useSearchParams();
  const brand = searchParams ? searchParams.get("brand") : null;
  const pageParam = searchParams
    ? parseInt(searchParams.get("page") || "1")
    : 1;

  // Set initial category state to 'all' when brand is present
  const initialCategory = brand ? "all" : "";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortOption, setSortOption] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<MainCategory>(MainCategory.PAINTINGS);
  const [currentPage, setCurrentPage] = useState(pageParam);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Replace useInfiniteQuery with direct data fetching for better pagination control
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // Fetch more products per page (20-30) to ensure we have enough to display
        const response = await getProducts(
          currentPage,
          30,
          undefined,
          brand || undefined
        );

        const allProducts = response.items.map((item) => {
          // Process items to ensure they have categoryStructure
          if (!item.categoryStructure) {
            const handmadeCategories = [
              "კერამიკა",
              "ხის ნაკეთობები",
              "სამკაულები",
              "ტექსტილი",
              "მინანქარი",
              "სკულპტურები",
              "სხვა",
            ];
            const isHandmade = handmadeCategories.includes(item.category);

            return {
              ...item,
              categoryStructure: {
                main: isHandmade
                  ? MainCategory.HANDMADE
                  : MainCategory.PAINTINGS,
                sub: item.category,
              },
            };
          }
          return item;
        });

        setProducts(allProducts);
        setTotalPages(response.pages);

        // Initially set all products
        setFilteredProducts(allProducts);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, brand]);

  // Apply filtering and sorting whenever relevant state changes
  useEffect(() => {
    if (products.length === 0) return;

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

    // Filter by main category first
    filtered = filtered.filter((product) => {
      const productMainCategory = product.categoryStructure?.main
        ?.toString()
        .toLowerCase();
      const selectedMainCategoryStr = selectedMainCategory
        ?.toString()
        .toLowerCase();

      // Handle legacy products without categoryStructure
      if (!productMainCategory) {
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
    // Reset to page 1 when changing category
    setCurrentPage(1);

    // Update URL with category parameter
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (category && category !== "all") {
        url.searchParams.set("category", category);
      } else {
        url.searchParams.delete("category");
      }
      url.searchParams.set("page", "1"); // Reset to page 1
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleArtistChange = (artist: string) => {
    // Reset to page 1 when changing artist
    setCurrentPage(1);

    if (typeof window !== "undefined" && artist) {
      window.location.href = `/shop?brand=${encodeURIComponent(artist)}&page=1`;
    } else {
      let filtered = [...products];

      if (artist) {
        filtered = filtered.filter(
          (product) =>
            product.brand &&
            product.brand.toLowerCase() === artist.toLowerCase()
        );
      }

      setFilteredProducts(filtered);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);

    // Update URL with page parameter
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("page", page.toString());
      window.history.pushState({}, "", url.toString());
    }
  };

  // Handle sort change
  const handleSortChange = (option: string) => {
    setSortOption(option);
  };

  // Handle main category changes
  const handleMainCategoryChange = (mainCategory: MainCategory) => {
    setSelectedMainCategory(mainCategory);
    // Reset to page 1 when changing main category
    setCurrentPage(1);

    // Update URL with main category parameter
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("mainCategory", mainCategory);
      url.searchParams.set("page", "1"); // Reset to page 1
      window.history.pushState({}, "", url.toString());
    }
  };

  // Get the theme based on selected main category
  const getTheme = () => {
    return selectedMainCategory === MainCategory.HANDMADE
      ? "handmade-theme"
      : "default";
  };

  // Render animated icons based on theme
  const renderAnimatedIcons = () => {
    if (selectedMainCategory === MainCategory.HANDMADE) {
      return (
        <div className="shop-animated-icons handmade-theme">
          <div className="icon pottery-icon">
            <CakeSlice />
          </div>
          <div className="icon wood-icon">
            <Hammer />
          </div>
          <div className="icon jewelry-icon">
            <Gem />
          </div>
          <div className="icon textile-icon">
            <Scissors />
          </div>
        </div>
      );
    } else {
      return (
        <div className="shop-animated-icons default">
          <div className="icon brush-icon">
            <Paintbrush />
          </div>
          <div className="icon palette-icon">
            <Palette />
          </div>
          <div className="icon canvas-icon">
            <Square />
          </div>
          <div className="icon frame-icon">
            <Printer />
          </div>
        </div>
      );
    }
  };

  if (isLoading) return <div>იტვირთება...</div>;

  return (
    <div className={`shop-container ${getTheme()}`}>
      {renderAnimatedIcons()}

      <h1 className="text-2xl font-bold mb-4 relative z-10">
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
      <ProductGrid
        products={filteredProducts}
        theme={getTheme()}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isShopPage={true} // Add a prop to indicate this is the shop page
      />
    </div>
  );
};

export default ShopContent;
