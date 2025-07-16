"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, Category } from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./ShopPage.css";

const ShopContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const initializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] =
    useState<string>("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [showDiscountedOnly, setShowDiscountedOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sorting, setSorting] = useState<{
    field: string;
    direction: "asc" | "desc";
  }>({
    field: "createdAt",
    direction: "desc",
  });

  // Fetch categories to determine theme
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories?includeInactive=false"
        );
        return response.json();
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  // Determine theme based on selected category
  const getTheme = () => {
    if (!selectedCategoryId || !categories.length) return "default";

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId || cat._id === selectedCategoryId
    );

    if (!selectedCategory) return "default";

    // Check if it's handmade category
    if (
      selectedCategory.name === "ხელნაკეთი ნივთები" ||
      selectedCategory.name === "ხელნაკეთი" ||
      selectedCategory.nameEn === "Handmades" ||
      selectedCategory.nameEn === "Handmade"
    ) {
      return "handmade-theme";
    }

    return "default";
  };

  // Parse URL parameters on first load
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const pageParam = searchParams
      ? parseInt(searchParams.get("page") || "1")
      : 1;
    const mainCategoryParam = searchParams
      ? searchParams.get("mainCategory") || ""
      : "";
    const subCategoryParam = searchParams
      ? searchParams.get("subCategory") || ""
      : "";
    const ageGroupParam = searchParams
      ? searchParams.get("ageGroup") || ""
      : "";
    const sizeParam = searchParams ? searchParams.get("size") || "" : "";
    const colorParam = searchParams ? searchParams.get("color") || "" : "";
    const brandParam = searchParams ? searchParams.get("brand") || "" : "";
    const discountParam = searchParams
      ? searchParams.get("discountOnly") === "true"
      : false;
    const minPriceParam = searchParams
      ? parseInt(searchParams.get("minPrice") || "0")
      : 0;
    const maxPriceParam = searchParams
      ? parseInt(searchParams.get("maxPrice") || "1000")
      : 1000;
    const sortByParam = searchParams
      ? searchParams.get("sortBy") || "createdAt"
      : "createdAt";
    const sortDirectionParam = searchParams
      ? (searchParams.get("sortDirection") as "asc" | "desc") || "desc"
      : "desc";

    setCurrentPage(pageParam);
    setSelectedCategoryId(mainCategoryParam);
    setSelectedSubCategoryId(subCategoryParam);
    setSelectedAgeGroup(ageGroupParam);
    setSelectedSize(sizeParam);
    setSelectedColor(colorParam);
    setSelectedBrand(brandParam);
    setShowDiscountedOnly(discountParam);
    setPriceRange([minPriceParam, maxPriceParam]);
    setSorting({ field: sortByParam, direction: sortDirectionParam });

    console.log("Initial setup with URL params:", {
      page: pageParam,
      mainCategory: mainCategoryParam,
      subCategory: subCategoryParam,
    });
  }, [searchParams]);

  // Fetch products based on filters
  const fetchProducts = useCallback(async () => {
    if (!initializedRef.current) return;

    setIsLoading(true);

    try {
      // Build query parameters
      const params: Record<string, string> = {
        page: currentPage.toString(),
        limit: "20",
        sortBy: sorting.field,
        sortDirection: sorting.direction,
      };

      if (selectedCategoryId) params.mainCategory = selectedCategoryId;
      if (selectedSubCategoryId) params.subCategory = selectedSubCategoryId;
      if (selectedAgeGroup) params.ageGroup = selectedAgeGroup;
      if (selectedSize) params.size = selectedSize;
      if (selectedColor) params.color = selectedColor;
      if (selectedBrand) params.brand = selectedBrand;
      if (priceRange[0] > 0) params.minPrice = priceRange[0].toString();
      if (priceRange[1] < 1000) params.maxPrice = priceRange[1].toString();
      if (showDiscountedOnly) params.discounted = "true";

      const response = await getProducts(currentPage, 20, params);

      setProducts(response.items || []);
      setTotalPages(response.pages || 1);
    } catch (error) {
      console.error(`Failed to fetch products:`, error);
      setProducts([]);
      setTotalPages(1);
      // You could add a toast notification here if you have a toast system
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedAgeGroup,
    selectedSize,
    selectedColor,
    selectedBrand,
    priceRange,
    sorting,
    showDiscountedOnly,
  ]);

  // Fetch products when filters change
  useEffect(() => {
    let mounted = true;
    if (mounted) {
      fetchProducts();
    }
    return () => {
      mounted = false;
    };
  }, [fetchProducts]);

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();

    // Only add parameters that have values
    if (selectedCategoryId) params.set("mainCategory", selectedCategoryId);
    if (selectedSubCategoryId) params.set("subCategory", selectedSubCategoryId);
    if (selectedAgeGroup) params.set("ageGroup", selectedAgeGroup);
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("color", selectedColor);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (priceRange[0] > 0) params.set("minPrice", priceRange[0].toString());
    if (priceRange[1] < 1000) params.set("maxPrice", priceRange[1].toString());
    if (sorting.field !== "createdAt") params.set("sortBy", sorting.field);
    if (sorting.direction !== "desc")
      params.set("sortDirection", sorting.direction);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (showDiscountedOnly) params.set("discounted", "true");

    router.replace(`/shop?${params.toString()}`);
  }, [
    router,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedAgeGroup,
    selectedSize,
    selectedColor,
    selectedBrand,
    priceRange,
    sorting,
    currentPage,
    showDiscountedOnly,
  ]);

  // Update URL when filters change
  useEffect(() => {
    // Skip the first render to avoid double navigation
    if (!initializedRef.current) return;
    updateUrl();
  }, [
    selectedCategoryId,
    selectedSubCategoryId,
    selectedAgeGroup,
    selectedSize,
    selectedColor,
    selectedBrand,
    priceRange,
    sorting,
    currentPage,
    showDiscountedOnly,
    updateUrl,
  ]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Decorative elements and UI
  // const renderAnimatedIcons = () => {
  //   return (
  //     <div className="shop-animated-icons modern">
  //       <div className="icon clothing-icon">
  //         <Shirt />
  //       </div>
  //       <div className="icon accessories-icon">
  //         <ShoppingBag />
  //       </div>
  //     </div>
  //   );
  // };

  // Handle filter changes in a more robust way
  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      // Reset page when changing filters
      setCurrentPage(1);
      setSelectedCategoryId(categoryId);
      // Clear dependent filters when changing parent filter
      if (categoryId !== selectedCategoryId) {
        setSelectedSubCategoryId("");
        setSelectedAgeGroup("");
        setSelectedSize("");
        setSelectedColor("");
      }
    },
    [selectedCategoryId]
  );

  const handleSubCategoryChange = useCallback(
    (subcategoryId: string) => {
      setCurrentPage(1);
      setSelectedSubCategoryId(subcategoryId);
      // Clear dependent filters when changing parent filter
      if (subcategoryId !== selectedSubCategoryId) {
        setSelectedAgeGroup("");
        setSelectedSize("");
        setSelectedColor("");
      }
    },
    [selectedSubCategoryId]
  );

  // Simple filter handlers
  const handleAgeGroupChange = useCallback((ageGroup: string) => {
    setCurrentPage(1);
    setSelectedAgeGroup(ageGroup);
  }, []);

  const handleSizeChange = useCallback((size: string) => {
    setCurrentPage(1);
    setSelectedSize(size);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setCurrentPage(1);
    setSelectedColor(color);
  }, []);

  const handleBrandChange = useCallback((brand: string) => {
    setCurrentPage(1);
    setSelectedBrand(brand);
  }, []);

  const handleDiscountFilterChange = useCallback(
    (showDiscountedOnly: boolean) => {
      setCurrentPage(1);
      setShowDiscountedOnly(showDiscountedOnly);
    },
    []
  );

  const handlePriceRangeChange = useCallback((range: [number, number]) => {
    setCurrentPage(1);
    setPriceRange(range);
  }, []);

  const handleSortChange = useCallback(
    (sortOption: { field: string; direction: "asc" | "desc" }) => {
      setCurrentPage(1);
      setSorting(sortOption);
    },
    []
  );

  return (
    <div className="shop-container default">
      <div className="content">
        {/* <h1
          className="title"
          style={{ marginBottom: 40, marginTop: 70, zIndex: 9 }}
        >
          {selectedBrand
            ? `${selectedBrand}${t("shop.artistWorks")}`
            : t("shop.allArtworks")}
        </h1> */}

        <div className="shop-layout">
          <div className="filters-sidebar">
            <ProductFilters
              onCategoryChange={handleCategoryChange}
              onSubCategoryChange={handleSubCategoryChange}
              onAgeGroupChange={handleAgeGroupChange}
              onSizeChange={handleSizeChange}
              onColorChange={handleColorChange}
              onBrandChange={handleBrandChange}
              onDiscountFilterChange={handleDiscountFilterChange}
              onPriceRangeChange={handlePriceRangeChange}
              onSortChange={handleSortChange}
              selectedCategoryId={selectedCategoryId}
              selectedSubCategoryId={selectedSubCategoryId}
              selectedAgeGroup={selectedAgeGroup}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              selectedBrand={selectedBrand}
              showDiscountedOnly={showDiscountedOnly}
              priceRange={priceRange}
            />
          </div>

          <div className="products-area">
            {isLoading ? (
              <div className="loading-state">{t("shop.loading")}</div>
            ) : products.length > 0 ? (
              <ProductGrid
                products={products}
                theme={getTheme()}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isShopPage={true}
              />
            ) : (
              <div className="empty-state">
                <p>{t("shop.emptyDescription")}</p>
                <button
                  className="reset-filters-btn"
                  onClick={() => {
                    setSelectedCategoryId("");
                    setSelectedSubCategoryId("");
                    setSelectedAgeGroup("");
                    setSelectedSize("");
                    setSelectedColor("");
                    setSelectedBrand("");
                    setShowDiscountedOnly(false);
                    setPriceRange([0, 1000]);
                    setSorting({ field: "createdAt", direction: "desc" });
                    setCurrentPage(1);
                  }}
                >
                  {t("shop.resetFilters")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopContent;
