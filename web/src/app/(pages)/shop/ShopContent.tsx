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
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./ShopPage.css";
import Image from "next/image";

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
    initializedRef.current = true;

    const pageParam = parseInt(searchParams?.get("page") || "1");
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

    setCurrentPage(pageParam);
    setSelectedCategoryId(mainCategoryParam);
    setSelectedSubCategoryId(subCategoryParam);
    setSelectedAgeGroup(ageGroupParam);
    setSelectedSize(sizeParam);
    setSelectedColor(colorParam);
    setSelectedBrand(decodedBrandParam);
    setShowDiscountedOnly(discountParam);
    setPriceRange([minPriceParam, maxPriceParam]);
    setSorting({ field: sortByParam, direction: sortDirectionParam });

    console.log("Initial setup with URL params:", {
      page: pageParam,
      mainCategory: mainCategoryParam,
      subCategory: subCategoryParam,
      brand: decodedBrandParam,
    });
  }, [searchParams]);

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
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
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

  useEffect(() => {
    if (!initializedRef.current) return;

    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("mainCategory", selectedCategoryId);
    if (selectedSubCategoryId) params.set("subCategory", selectedSubCategoryId);
    if (selectedAgeGroup) params.set("ageGroup", selectedAgeGroup);
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("color", selectedColor);
    if (selectedBrand && selectedBrand.trim())
      params.set("brand", selectedBrand.trim());
    if (priceRange[0] > 0) params.set("minPrice", priceRange[0].toString());
    if (priceRange[1] < 1000) params.set("maxPrice", priceRange[1].toString());
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
      if (subcategoryId !== selectedSubCategoryId) {
        setSelectedAgeGroup("");
        setSelectedSize("");
        setSelectedColor("");
      }
    },
    [selectedSubCategoryId]
  );

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

  const brandInfo =
    selectedBrand && products.length > 0
      ? {
          name: selectedBrand,
          logo:
            products.find((p) => p.brand === selectedBrand)?.brandLogo || "",
        }
      : null;

  return (
    <div className="shop-container default">
      <div className="content">
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

          {brandInfo && (
            <div className="brand-info">
              {brandInfo.logo && (
                <Image
                  src={brandInfo.logo}
                  alt={brandInfo.name}
                  width={50}
                  height={50}
                  style={{ width: "auto", height: "auto" }}
                />
              )}
              <h2 style={{ color: PRIMARY_COLOR }}>
                {brandInfo.name}-ის ნამუშევრები{" "}
              </h2>
            </div>
          )}

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
