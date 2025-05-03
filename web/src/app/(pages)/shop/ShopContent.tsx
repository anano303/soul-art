"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, MainCategory } from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
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
  const { t } = useLanguage();

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
  const [sortOption, setSortOption] = useState<"asc" | "desc" | "">("");
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
  }, [pageParam, mainCategoryParam]);

  const fetchProducts = useCallback(async () => {
    if (!initializedRef.current) return;

    console.log(`Fetching products for page ${currentPage}`);
    setIsLoading(true);

    try {
      const response = await getProducts(
        currentPage,
        30,
        undefined,
        brand || undefined,
        selectedMainCategory.toString(),
        selectedCategory !== "all" ? selectedCategory : undefined,
        sortOption !== "" ? "price" : "createdAt",
        sortOption !== "" ? sortOption : undefined
      );

      console.log(
        `Got ${response.items.length} products for page ${currentPage}`
      );

      setProducts(response.items);
      setTotalPages(response.pages);
    } catch (error) {
      console.error(`Failed to fetch products:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, brand, selectedMainCategory, selectedCategory, sortOption]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      fetchProducts();
    }
    return () => {
      mounted = false;
    };
  }, [fetchProducts]);

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

  const handleSortChange = (option: "asc" | "desc" | "") => {
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

  if (isLoading) return <div>{t("shop.loading")}</div>;

  return (
    <div className={`shop-container ${getTheme()}`}>
      {renderAnimatedIcons()}

      <h1 className="text-2xl font-bold mb-4 relative z-10">
        {brand ? `${brand}${t("shop.artistWorks")}` : t("shop.allArtworks")}
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
        products={products}
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
