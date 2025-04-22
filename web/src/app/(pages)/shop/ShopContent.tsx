"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, MainCategory } from "@/types";
import "./ShopPage.css";
import "./ShopAnimatedIcons.css";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const brand = searchParams ? searchParams.get("brand") : null;
  const pageParam = searchParams
    ? parseInt(searchParams.get("page") || "1")
    : 1;
  const mainCategoryParam = searchParams
    ? searchParams.get("mainCategory")
    : null;

  const initializedRef = useRef(false);

  const initialCategory = brand ? "all" : "";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortOption, setSortOption] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<MainCategory>(
      mainCategoryParam === MainCategory.HANDMADE.toString()
        ? MainCategory.HANDMADE
        : MainCategory.PAINTINGS
    );

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log("Initial setup with URL params:", {
      page: pageParam,
      mainCategory: mainCategoryParam,
    });

    setCurrentPage(pageParam);

    const mainCat =
      mainCategoryParam === MainCategory.HANDMADE.toString()
        ? MainCategory.HANDMADE
        : MainCategory.PAINTINGS;
    setSelectedMainCategory(mainCat);
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!initializedRef.current) return;

    console.log(`Fetching products for page ${currentPage}`);
    setIsLoading(true);

    try {
      const response = await getProducts(
        currentPage,
        30,
        undefined,
        brand || undefined
      );

      console.log(
        `Got ${response.items.length} products for page ${currentPage}`
      );

      const allProducts = response.items.map((item) => {
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
              main: isHandmade ? MainCategory.HANDMADE : MainCategory.PAINTINGS,
              sub: item.category,
            },
          };
        }
        return item;
      });

      setProducts(allProducts);
      setTotalPages(response.pages);
    } catch (error) {
      console.error(`Failed to fetch products:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, brand]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      fetchProducts();
    }
    return () => {
      mounted = false;
    };
  }, [fetchProducts]);

  useEffect(() => {
    if (products.length === 0) return;

    console.log("Applying filters to products");

    let filtered = [...products];

    filtered = filtered.filter((product) => {
      const productMainCategory = product.categoryStructure?.main
        ?.toString()
        .toLowerCase();
      const selectedMainCategoryStr = selectedMainCategory
        ?.toString()
        .toLowerCase();

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

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    if (sortOption === "lowToHigh") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "highToLow") {
      filtered.sort((a, b) => b.price - a.price);
    }

    console.log(`After filtering: ${filtered.length} products`);
    setFilteredProducts(filtered);
  }, [products, selectedCategory, selectedMainCategory, sortOption]);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;

    console.log(`Changing page to ${page}`);
    setCurrentPage(page);

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());

    router.replace(`/shop?${params.toString()}`);

    window.scrollTo(0, 0);
  };

  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory) return;

    console.log(`Changing category to: ${category}`);
    setSelectedCategory(category);

    if (currentPage !== 1) {
      setCurrentPage(1);

      const params = new URLSearchParams(searchParams.toString());

      if (category && category !== "all") {
        params.set("category", category);
      } else {
        params.delete("category");
      }

      params.set("page", "1");
      router.replace(`/shop?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());

      if (category && category !== "all") {
        params.set("category", category);
      } else {
        params.delete("category");
      }

      router.replace(`/shop?${params.toString()}`);
    }
  };

  const handleMainCategoryChange = (mainCategory: MainCategory) => {
    if (mainCategory === selectedMainCategory) return;

    console.log(`Changing main category to: ${mainCategory}`);
    setSelectedMainCategory(mainCategory);
    setSelectedCategory("all");
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    params.set("mainCategory", mainCategory.toString());
    params.set("page", "1");
    params.delete("category");

    router.replace(`/shop?${params.toString()}`);
  };

  const handleSortChange = (option: string) => {
    setSortOption(option);
  };

  const handleArtistChange = (artist: string) => {
    if (!artist) return;

    console.log(`Changing artist filter to: ${artist}`);

    // Reset to page 1
    setCurrentPage(1);

    // Update URL with brand parameter and navigate
    const params = new URLSearchParams();
    params.set("brand", artist);
    params.set("page", "1");

    // Use router.push since we're changing to a fundamentally different view
    router.push(`/shop?${params.toString()}`);
  };

  const getTheme = () => {
    return selectedMainCategory === MainCategory.HANDMADE
      ? "handmade-theme"
      : "default";
  };

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
        isShopPage={true}
      />
    </div>
  );
};

export default ShopContent;
