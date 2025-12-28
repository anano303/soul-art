"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, Category } from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";

const PRIMARY_COLOR = "#012645";
const SHOP_PAGE_STORAGE_KEY = "shopCurrentPage";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./ShopPage.css";
import Image from "next/image";

const ShopContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const initializedRef = useRef(false);
  const pendingInitialStateRef = useRef<{
    page: number;
    mainCategory: string;
    subCategory: string;
    ageGroup: string;
    size: string;
    color: string;
    brand: string;
    showDiscountedOnly: boolean;
    priceRange: [number, number];
    sorting: { field: string; direction: "asc" | "desc" };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<
    string[]
  >([]);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const initialBrand = (() => {
    try {
      const value = decodeURIComponent(searchParams?.get("brand") || "").trim();
      return value;
    } catch {
      return "";
    }
  })();

  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);

  const [showDiscountedOnly, setShowDiscountedOnly] = useState<boolean>(false);
  const [selectedOriginalTypes, setSelectedOriginalTypes] = useState<string[]>(
    []
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sorting, setSorting] = useState<{
    field: string;
    direction: "asc" | "desc";
  }>({
    field: "createdAt",
    direction: "desc",
  });

  useEffect(() => {
    console.log("selectedBrand state changed to:", selectedBrand);
  }, [selectedBrand]);

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

  const getTheme = () => {
    if (!selectedCategoryId || !categories.length) return "default";

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId || cat._id === selectedCategoryId
    );

    if (!selectedCategory) return "default";

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

  useEffect(() => {
    if (initializedRef.current) return;

    const pageParamRaw = searchParams?.get("page");
    const parsedPageParam = pageParamRaw ? parseInt(pageParamRaw, 10) : NaN;
    const hasValidPageParam =
      typeof parsedPageParam === "number" &&
      !Number.isNaN(parsedPageParam) &&
      parsedPageParam > 0;

    let storedPage = 1;
    if (typeof window !== "undefined") {
      const storedValue = window.localStorage.getItem(SHOP_PAGE_STORAGE_KEY);
      if (storedValue) {
        const parsedStored = parseInt(storedValue, 10);
        if (!Number.isNaN(parsedStored) && parsedStored > 0) {
          storedPage = parsedStored;
        }
      }
    }

    const initialPage = hasValidPageParam ? parsedPageParam : storedPage;
    const mainCategoryParam = searchParams?.get("mainCategory") || "";
    const subCategoryParam = searchParams?.get("subCategory") || "";
    const ageGroupParam = searchParams?.get("ageGroup") || "";
    const sizeParam = searchParams?.get("size") || "";
    const colorParam = searchParams?.get("color") || "";
    const brandParam = searchParams?.get("brand") || "";

    let decodedBrandParam = "";
    if (brandParam) {
      try {
        decodedBrandParam = decodeURIComponent(brandParam).trim();
        console.log(
          "Brand parameter decoded:",
          brandParam,
          "->",
          decodedBrandParam
        );
      } catch (error) {
        console.error("Error decoding brand parameter:", error);
        decodedBrandParam = brandParam.trim();
      }
    }

    const discountParam = searchParams?.get("discountOnly") === "true";
    const minPriceParam = parseInt(searchParams?.get("minPrice") || "0");
    const maxPriceParam = parseInt(searchParams?.get("maxPrice") || "1000");
    const sortByParam = searchParams?.get("sortBy") || "createdAt";
    const sortDirectionParam =
      (searchParams?.get("sortDirection") as "asc" | "desc") || "desc";

    pendingInitialStateRef.current = {
      page: initialPage,
      mainCategory: mainCategoryParam,
      subCategory: subCategoryParam,
      ageGroup: ageGroupParam,
      size: sizeParam,
      color: colorParam,
      brand: decodedBrandParam,
      showDiscountedOnly: discountParam,
      priceRange: [minPriceParam, maxPriceParam],
      sorting: { field: sortByParam, direction: sortDirectionParam },
    };

    setCurrentPage(initialPage);
    setSelectedCategoryId(mainCategoryParam);
    setSelectedSubCategoryIds(
      subCategoryParam ? subCategoryParam.split(",") : []
    );
    setSelectedAgeGroup(ageGroupParam);
    setSelectedSize(sizeParam);
    setSelectedColor(colorParam);
    setSelectedBrand(decodedBrandParam);
    setShowDiscountedOnly(discountParam);
    setPriceRange([minPriceParam, maxPriceParam]);
    setSorting({ field: sortByParam, direction: sortDirectionParam });

    console.log("Initial setup with URL params:", {
      page: initialPage,
      mainCategory: mainCategoryParam,
      subCategory: subCategoryParam,
      brand: decodedBrandParam,
    });
  }, [searchParams]);

  // Helper function to determine if selected category is handmade
  const isHandmadeCategory = () => {
    if (!selectedCategoryId || !categories.length) return false;
    const selectedCategory = categories.find(
      (cat) => cat._id === selectedCategoryId
    );
    if (!selectedCategory) return false;

    return (
      selectedCategory.nameEn === "Handmades" ||
      selectedCategory.nameEn === "Handmade"
    );
  };

  useEffect(() => {
    if (initializedRef.current) return;

    const pending = pendingInitialStateRef.current;
    if (!pending) return;

    const priceMatches =
      priceRange[0] === pending.priceRange[0] &&
      priceRange[1] === pending.priceRange[1];

    const sortingMatches =
      sorting.field === pending.sorting.field &&
      sorting.direction === pending.sorting.direction;

    if (
      currentPage === pending.page &&
      selectedCategoryId === pending.mainCategory &&
      selectedSubCategoryIds.join(",") === pending.subCategory &&
      selectedAgeGroup === pending.ageGroup &&
      selectedSize === pending.size &&
      selectedColor === pending.color &&
      selectedBrand === pending.brand &&
      showDiscountedOnly === pending.showDiscountedOnly &&
      priceMatches &&
      sortingMatches
    ) {
      initializedRef.current = true;
      pendingInitialStateRef.current = null;
    }
  }, [
    currentPage,
    selectedCategoryId,
    selectedSubCategoryIds,
    selectedAgeGroup,
    selectedSize,
    selectedColor,
    selectedBrand,
    showDiscountedOnly,
    priceRange,
    sorting.field,
    sorting.direction,
  ]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (typeof window === "undefined") return;

    window.localStorage.setItem(SHOP_PAGE_STORAGE_KEY, currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    if (!initializedRef.current) return;

    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = {
          page: currentPage.toString(),
          limit: "20",
          sortBy: sorting.field,
          sortDirection: sorting.direction,
        };

        if (selectedCategoryId) params.mainCategory = selectedCategoryId;
        if (selectedSubCategoryIds.length > 0)
          params.subCategory = selectedSubCategoryIds.join(",");
        if (selectedAgeGroup) params.ageGroup = selectedAgeGroup;
        if (selectedSize) params.size = selectedSize;
        if (selectedColor) params.color = selectedColor;
        if (selectedBrand) params.brand = selectedBrand;
        if (selectedMaterials.length > 0)
          params.material = selectedMaterials.join(",");
        if (selectedDimensions.length > 0)
          params.dimension = selectedDimensions.join(",");

        // Always send price parameters if they differ from defaults
        if (priceRange[0] !== 0 || priceRange[1] !== 1000) {
          params.minPrice = priceRange[0].toString();
          params.maxPrice = priceRange[1].toString();
        }

        if (showDiscountedOnly) params.discounted = "true";
        if (selectedOriginalTypes.length > 0)
          params.isOriginal = selectedOriginalTypes.join(",");

        // Exclude out of stock products from shop and include variants for stock check
        params.excludeOutOfStock = "true";
        params.includeVariants = "true";

        const response = await getProducts(currentPage, 20, params);
        setProducts(response.items || []);
        setTotalPages(response.pages || 1);
      } catch (error) {
        console.error(`Failed to fetch products:`, error);
        setProducts([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [
    currentPage,
    selectedCategoryId,
    selectedSubCategoryIds,
    selectedAgeGroup,
    selectedSize,
    selectedColor,
    selectedBrand,
    selectedMaterials,
    selectedDimensions,
    priceRange,
    sorting,
    showDiscountedOnly,
    selectedOriginalTypes,
  ]);

  useEffect(() => {
    if (!initializedRef.current) return;

    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("mainCategory", selectedCategoryId);
    if (selectedSubCategoryIds.length > 0)
      params.set("subCategory", selectedSubCategoryIds.join(","));
    if (selectedAgeGroup) params.set("ageGroup", selectedAgeGroup);
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("color", selectedColor);
    if (selectedBrand && selectedBrand.trim())
      params.set("brand", selectedBrand.trim());

    // Always set price parameters if they differ from defaults
    if (priceRange[0] !== 0 || priceRange[1] !== 1000) {
      params.set("minPrice", priceRange[0].toString());
      params.set("maxPrice", priceRange[1].toString());
    }

    if (sorting.field !== "createdAt") params.set("sortBy", sorting.field);
    if (sorting.direction !== "desc")
      params.set("sortDirection", sorting.direction);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (showDiscountedOnly) params.set("discounted", "true");

    const urlString = `/shop?${params.toString()}`;
    router.replace(urlString);
  }, [
    router,
    selectedCategoryId,
    selectedSubCategoryIds,
    selectedAgeGroup,
    selectedSize,
    selectedColor,
    selectedBrand,
    priceRange,
    sorting,
    currentPage,
    showDiscountedOnly,
  ]);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setCurrentPage(1);
      setSelectedCategoryId(categoryId);
      if (categoryId !== selectedCategoryId) {
        setSelectedSubCategoryIds([]);
        setSelectedAgeGroup("");
        setSelectedSize("");
        setSelectedColor("");
      }
    },
    [selectedCategoryId]
  );

  const handleSubCategoryChange = useCallback((subcategoryId: string) => {
    setCurrentPage(1);
    if (!subcategoryId) {
      setSelectedSubCategoryIds([]);
    } else {
      setSelectedSubCategoryIds((prev) => {
        if (prev.includes(subcategoryId)) {
          return prev.filter((id) => id !== subcategoryId);
        } else {
          return [...prev, subcategoryId];
        }
      });
    }
  }, []);

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

  const handleBrandChange = useCallback(
    (brand: string) => {
      console.log(
        "handleBrandChange called with:",
        brand,
        "previous brand:",
        selectedBrand
      );
      setCurrentPage(1);
      setSelectedBrand(brand);
    },
    [selectedBrand]
  );

  const handleDiscountFilterChange = useCallback(
    (showDiscountedOnly: boolean) => {
      setCurrentPage(1);
      setShowDiscountedOnly(showDiscountedOnly);
    },
    []
  );

  const handleOriginalFilterChange = useCallback((type: string) => {
    setCurrentPage(1);
    setSelectedOriginalTypes((prev) => {
      if (!type) return [];
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  }, []);

  const handleMaterialFilterChange = useCallback((material: string) => {
    setCurrentPage(1);
    setSelectedMaterials((prev) => {
      if (!material) return [];
      if (prev.includes(material)) {
        return prev.filter((m) => m !== material);
      } else {
        return [...prev, material];
      }
    });
  }, []);

  const handleDimensionFilterChange = useCallback((dimension: string) => {
    setCurrentPage(1);
    setSelectedDimensions((prev) => {
      if (!dimension) return [];
      if (prev.includes(dimension)) {
        return prev.filter((d) => d !== dimension);
      } else {
        return [...prev, dimension];
      }
    });
  }, []);

  const handlePriceRangeChange = useCallback((range: [number, number]) => {
    setPriceRange((previousRange) => {
      const hasChanged =
        previousRange[0] !== range[0] || previousRange[1] !== range[1];

      if (hasChanged) {
        setCurrentPage(1);
        return range;
      }

      return previousRange;
    });
  }, []);

  const handleSortChange = useCallback(
    (sortOption: { field: string; direction: "asc" | "desc" }) => {
      setCurrentPage(1);
      setSorting(sortOption);
    },
    []
  );

  const brandInfo =
    selectedBrand && products.length > 0
      ? {
          name: selectedBrand,
          logo:
            products.find((p) => p.brand === selectedBrand)?.brandLogo || "",
        }
      : null;

  return (
    <div className={`shop-container ${getTheme()}`}>
      <div className="shop-shell">
        <aside className="filters-sidebar">
          <ProductFilters
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={handleSubCategoryChange}
            onAgeGroupChange={handleAgeGroupChange}
            onSizeChange={handleSizeChange}
            onColorChange={handleColorChange}
            onBrandChange={handleBrandChange}
            onDiscountFilterChange={handleDiscountFilterChange}
            onOriginalFilterChange={handleOriginalFilterChange}
            onMaterialFilterChange={handleMaterialFilterChange}
            onDimensionFilterChange={handleDimensionFilterChange}
            onPriceRangeChange={handlePriceRangeChange}
            selectedCategoryId={selectedCategoryId}
            selectedSubCategoryId={selectedSubCategoryIds}
            selectedAgeGroup={selectedAgeGroup}
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            selectedBrand={selectedBrand}
            selectedOriginal={selectedOriginalTypes}
            selectedMaterial={selectedMaterials}
            selectedDimension={selectedDimensions}
            showDiscountedOnly={showDiscountedOnly}
            priceRange={priceRange}
          />
        </aside>

        <div className="shop-main">
          <div className="content">
            <div className="shop-layout">
              {brandInfo && (
                <div className="brand-info">
                  {brandInfo.logo && (
                    <Image
                      src={brandInfo.logo}
                      alt={brandInfo.name}
                      width={50}
                      height={50}
                    />
                  )}
                  <h2 style={{ color: PRIMARY_COLOR }}>
                    {brandInfo.name}-ის ნამუშევრები{" "}
                  </h2>
                </div>
              )}
              <div className="sort-section">
                {/* <div className="sort-header">
            <h3 className="sort-title">{t("shop.sortBy")}</h3>
          </div> */}
                <div className="sort-options">
                  <select
                    className={`sort-select ${
                      isHandmadeCategory() ? "handmade-theme" : ""
                    }`}
                    onChange={(e) => {
                      const value = e.target.value;
                      const [field, direction] = value.split("-");
                      handleSortChange({
                        field,
                        direction: direction as "asc" | "desc",
                      });
                    }}
                  >
                    {" "}
                    <option value="createdAt-desc">
                      {t("shop.newest")}
                    </option>{" "}
                    <option value="price-asc">{t("shop.priceLowHigh")}</option>{" "}
                    <option value="price-desc">{t("shop.priceHighLow")}</option>{" "}
                    <option value="name-asc">{t("shop.nameAZ")}</option>{" "}
                    <option value="name-desc">{t("shop.nameZA")}</option>{" "}
                    <option value="rating-desc">{t("shop.ratingHigh")}</option>
                  </select>
                </div>
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
                        setSelectedSubCategoryIds([]);
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
      </div>
    </div>
  );
};

export default ShopContent;
