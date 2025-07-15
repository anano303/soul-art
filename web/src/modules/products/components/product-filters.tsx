"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./product-filters.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { Category, SubCategory, Color, AgeGroupItem } from "@/types";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import Image from "next/image";

interface FilterProps {
  onCategoryChange: (categoryId: string) => void;
  onSubCategoryChange: (subcategoryId: string) => void;
  onAgeGroupChange: (ageGroup: string) => void;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  onSortChange: (sortOption: {
    field: string;
    direction: "asc" | "desc";
  }) => void;
  onBrandChange: (brand: string) => void;
  onDiscountFilterChange: (showDiscountedOnly: boolean) => void;
  selectedCategoryId?: string;
  selectedSubCategoryId?: string;
  selectedAgeGroup?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedBrand?: string;
  showDiscountedOnly?: boolean;
  priceRange?: [number, number]; // min, max
  onPriceRangeChange: (range: [number, number]) => void;
}

export function ProductFilters({
  onCategoryChange,
  onSubCategoryChange,
  onAgeGroupChange,
  onSizeChange,
  onColorChange,
  onSortChange,
  onBrandChange,
  onDiscountFilterChange,
  onPriceRangeChange,
  selectedCategoryId,
  selectedSubCategoryId,
  selectedAgeGroup,
  selectedSize,
  selectedColor,
  selectedBrand,
  showDiscountedOnly = false,
  priceRange = [0, 1000],
}: FilterProps) {
  const { language, t } = useLanguage();
  const [minPrice, setMinPrice] = useState(priceRange[0]);
  const [maxPrice, setMaxPrice] = useState(priceRange[1]);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>("");
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
  const [showBrandsDropdown, setShowBrandsDropdown] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setMinPrice(priceRange[0]);
    setMaxPrice(priceRange[1]);
  }, [priceRange]);

  // Auto-show subcategories when category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      setShowSubcategories(true);
    } else {
      setShowSubcategories(false);
    }
  }, [selectedCategoryId]);

  // Fetch all categories with error handling
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    // Removing unused error variable
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories?includeInactive=false"
        );
        if (!response.ok) {
          throw new Error(`Error fetching categories: ${response.status}`);
        }
        return response.json();
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setError(t("shop.errorLoadingCategories"));
        return [];
      }
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Fetch subcategories based on selected category with error handling
  const {
    data: subcategories = [],
    isLoading: isSubcategoriesLoading,
    // Removing unused error variable
  } = useQuery<SubCategory[]>({
    queryKey: ["subcategories", selectedCategoryId],
    queryFn: async () => {
      try {
        if (!selectedCategoryId) return [];
        const response = await fetchWithAuth(
          `/subcategories?categoryId=${selectedCategoryId}&includeInactive=false`
        );
        if (!response.ok) {
          throw new Error(`Error fetching subcategories: ${response.status}`);
        }
        return response.json();
      } catch (err) {
        console.error("Failed to fetch subcategories:", err);
        setError(t("shop.errorLoadingSubcategories"));
        return [];
      }
    },
    enabled: !!selectedCategoryId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  // Fetch all available brands for filtering with error handling
  const {
    data: availableBrands = [],
    isLoading: isBrandsLoading,
    // Removing unused error variable
  } = useQuery<string[]>({
    queryKey: ["brands"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/products/brands");
        if (!response.ok) {
          // Try alternative endpoint
          const altResponse = await fetchWithAuth(
            "/products?page=1&limit=1000"
          );
          if (!altResponse.ok) {
            return []; // Silently fail if brands endpoint doesn't exist
          }
          const productsData = await altResponse.json();
          const products = productsData.items || productsData;
          // Extract unique brands from products
          const brands = [
            ...new Set(
              products
                .map((product: { brand?: string }) => product.brand)
                .filter(Boolean)
            ),
          ];
          return brands;
        }
        return response.json();
      } catch (err) {
        console.error("Failed to fetch brands:", err);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
  // Fetch all colors for filtering with proper nameEn support
  const { data: availableColors = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          console.error("Failed to fetch colors:", response.status);
          return [];
        }
        return response.json();
      } catch (err) {
        console.error("Failed to fetch colors:", err);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
  // Fetch all age groups for filtering with proper nameEn support
  const { data: availableAgeGroups = [] } = useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories/attributes/age-groups"
        );
        if (!response.ok) {
          console.error("Failed to fetch age groups:", response.status);
          return [];
        }
        return response.json();
      } catch (err) {
        console.error("Failed to fetch age groups:", err);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Get available attributes based on selected subcategory
  const getAvailableAttributes = (
    attributeType: "ageGroups" | "sizes" | "colors"
  ): string[] => {
    if (!selectedSubCategoryId || !subcategories || subcategories.length === 0)
      return [];

    const selectedSubCategory = subcategories.find(
      (sub) =>
        sub.id === selectedSubCategoryId || sub._id === selectedSubCategoryId
    );

    if (!selectedSubCategory) return [];

    return selectedSubCategory[attributeType] || [];
  }; // Get localized color name based on current language
  const getLocalizedColorName = (colorName: string): string => {
    if (language === "en") {
      // Find the color in availableColors to get its English name
      const colorObj = availableColors.find(
        (color) => color.name === colorName
      );
      return colorObj?.nameEn || colorName;
    }
    return colorName;
  };

  // Get localized age group name based on current language
  const getLocalizedAgeGroupName = (ageGroupName: string): string => {
    if (language === "en") {
      // Find the age group in availableAgeGroups to get its English name
      const ageGroupObj = availableAgeGroups.find(
        (ageGroup) => ageGroup.name === ageGroupName
      );
      return ageGroupObj?.nameEn || ageGroupName;
    }
    return ageGroupName;
  };

  // Filter brands based on search term
  const getFilteredBrands = (): string[] => {
    if (!brandSearchTerm.trim()) {
      return availableBrands;
    }
    const searchTerm = brandSearchTerm.toLowerCase().trim();
    return availableBrands.filter(
      (brand) =>
        brand.toLowerCase().includes(searchTerm) ||
        brand.toLowerCase().startsWith(searchTerm)
    );
  };

  // Handle price range changes with validation
  const handlePriceChange = () => {
    // Validation
    if (minPrice < 0) {
      setMinPrice(0);
      return;
    }

    if (maxPrice < minPrice) {
      setMaxPrice(minPrice);
      return;
    }

    onPriceRangeChange([minPrice, maxPrice]);
  };

  // Translate category/subcategory names based on language
  const getLocalizedName = (
    name: string,
    originalItem?: { nameEn?: string }
  ): string => {
    if (language === "en") {
      // First check if the item has an English name field
      if (originalItem && originalItem.nameEn) {
        return originalItem.nameEn;
      }
      return name;
    }
    return name;
  };

  // Handle clearing specific filters
  const clearCategoryFilter = () => {
    onCategoryChange("");
    onSubCategoryChange("");
    onAgeGroupChange("");
    onSizeChange("");
    onColorChange("");
  };

  // const clearSubcategoryFilter = () => {
  //   onSubCategoryChange("");
  //   onAgeGroupChange("");
  //   onSizeChange("");
  //   onColorChange("");
  // };

  // Reset all filters to default values
  const resetAllFilters = () => {
    onCategoryChange("");
    onSubCategoryChange("");
    onAgeGroupChange("");
    onSizeChange("");
    onColorChange("");
    onBrandChange("");
    onDiscountFilterChange(false);
    setBrandSearchTerm("");
    setMinPrice(0);
    setMaxPrice(1000);
    onPriceRangeChange([0, 1000]);
    setShowBrandsDropdown(false);
  };

  // Handle brand search input focus
  const handleBrandSearchFocus = () => {
    setShowBrandsDropdown(true);
  };

  // Handle brand search input blur
  const handleBrandSearchBlur = () => {
    // Delay hiding to allow for clicks on dropdown items
    setTimeout(() => {
      setShowBrandsDropdown(false);
    }, 200);
  };

  // Handle brand selection from dropdown
  const handleBrandSelect = (brand: string) => {
    onBrandChange(brand === selectedBrand ? "" : brand);
    setBrandSearchTerm("");
    setShowBrandsDropdown(false);
  };

  // Get display value for brand search input
  const getBrandSearchDisplayValue = () => {
    if (brandSearchTerm) return brandSearchTerm;
    if (selectedBrand) return selectedBrand;
    return "";
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowFilters(false);
      setIsClosing(false);
    }, 500); // matches animation duration
  };

  // Check for horizontal scroll on categories grid
  useEffect(() => {
    const checkScroll = () => {
      const gridElement = document.querySelector(
        ".main-categories-grid"
      ) as HTMLElement;
      if (gridElement) {
        const hasScroll = gridElement.scrollWidth > gridElement.clientWidth;
        setHasHorizontalScroll(hasScroll);
      }
    };

    // Run check after categories are loaded
    if (categories.length > 0) {
      setTimeout(checkScroll, 100); // Small delay to ensure DOM is updated
    }

    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);
  // Adjust subcategory positioning on mobile - use fixed positioning
  useEffect(() => {
    const adjustSubcategoryPositioning = () => {
      if (window.innerWidth <= 768 && showSubcategories && selectedCategoryId) {
        const selectedCategory = document.querySelector(
          ".main-category-option.selected"
        );
        const subcategoryOverlay = document.querySelector(
          ".subcategories-overlay"
        ) as HTMLElement;

        if (selectedCategory && subcategoryOverlay) {
          const categoryRect = selectedCategory.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // Position dropdown below the selected category
          const topPosition = categoryRect.bottom + 10;

          // Ensure dropdown doesn't go off screen
          const dropdownHeight = 200; // Approximate height
          const finalTop =
            topPosition + dropdownHeight > viewportHeight
              ? Math.max(10, categoryRect.top - dropdownHeight - 10)
              : topPosition;

          subcategoryOverlay.style.position = "fixed";
          subcategoryOverlay.style.top = `${finalTop}px`;
          subcategoryOverlay.style.left = "50%";
          subcategoryOverlay.style.transform = "translateX(-50%)";
          subcategoryOverlay.style.zIndex = "999999";
        }
      }
    };

    if (showSubcategories && selectedCategoryId) {
      // Small delay to ensure DOM is ready
      setTimeout(adjustSubcategoryPositioning, 100);
    }

    window.addEventListener("resize", adjustSubcategoryPositioning);
    window.addEventListener("scroll", adjustSubcategoryPositioning);
    return () => {
      window.removeEventListener("resize", adjustSubcategoryPositioning);
      window.removeEventListener("scroll", adjustSubcategoryPositioning);
    };
  }, [showSubcategories, selectedCategoryId]);

  // Scroll selected category into view on mobile
  useEffect(() => {
    if (selectedCategoryId && window.innerWidth <= 768) {
      setTimeout(() => {
        const selectedCategory = document.querySelector(
          ".main-category-option.selected"
        );
        if (selectedCategory) {
          selectedCategory.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
      }, 200);
    }
  }, [selectedCategoryId]);

  // Click outside handler to close subcategories dropdown on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSubcategories && window.innerWidth <= 768) {
        const target = event.target as HTMLElement;
        const categoriesGrid = document.querySelector(".main-categories-grid");
        const subcategoriesOverlay = document.querySelector(
          ".subcategories-overlay"
        );

        // Check if click is outside both the categories grid and subcategories overlay
        if (
          categoriesGrid &&
          subcategoriesOverlay &&
          !categoriesGrid.contains(target) &&
          !subcategoriesOverlay.contains(target)
        ) {
          setShowSubcategories(false);
        }
      }
    };

    if (showSubcategories) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSubcategories]);

  return (
    <div className="product-filters-container">
      <div className="filters-and-sort-wrapper">
        <div className="product-filters">
          <div className="categories-section">
            {error && (
              <div className="filter-error">
                <p>{error}</p>
                <button onClick={() => setError(null)}>
                  {t("shop.close")}
                </button>
              </div>
            )}

            <div className="filter-section">
              <div className="filter-header">
                {selectedCategoryId && (
                  <button
                    className="filter-clear-btn"
                    onClick={clearCategoryFilter}
                    aria-label={t("shop.clearCategoryFilter")}
                  >
                    {t("shop.clear")}
                  </button>
                )}
              </div>
              <div className="filter-options">
                <div
                  className={`main-categories-grid ${
                    hasHorizontalScroll ? "has-scroll" : ""
                  }`}
                >
                  {isCategoriesLoading ? (
                    <div className="loading">
                      <HeartLoading size="medium" />
                    </div>
                  ) : categories.length > 0 ? (
                    categories.map((category) => (
                      <div
                        key={category.id || category._id}
                        className={`main-category-option ${
                          selectedCategoryId === category.id ||
                          selectedCategoryId === category._id
                            ? "selected"
                            : ""
                        } ${
                          category.name === "ხელნაკეთი"
                            ? "category-handmade"
                            : category.name === "ნახატები"
                            ? "category-paintings"
                            : ""
                        }`}
                        onClick={() => {
                          const categoryId = category.id || category._id || "";
                          if (selectedCategoryId === categoryId) {
                            onCategoryChange("");
                            setShowSubcategories(false);
                          } else {
                            onCategoryChange(categoryId);
                            onSubCategoryChange("");
                            setShowSubcategories(true);
                          }
                        }}
                      >
                        <h3 className="category-name">
                          {getLocalizedName(category.name, category)}
                        </h3>
                      </div>
                    ))
                  ) : (
                    <div className="no-categories">
                      <p>{t("shop.noCategoriesAvailable")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showSubcategories && subcategories.length > 0 && (
            <div className="subcategories-section">
              <h3 className="subcategories-title">
                {t("shop.subcategories")} -{" "}
                {getLocalizedName(
                  categories.find(
                    (cat) => (cat.id || cat._id) === selectedCategoryId
                  )?.name || "",
                  categories.find(
                    (cat) => (cat.id || cat._id) === selectedCategoryId
                  )
                )}
              </h3>
              <div className="subcategories-grid">
                {isSubcategoriesLoading ? (
                  <div className="loading">
                    <HeartLoading size="medium" />
                  </div>
                ) : (
                  subcategories.map((sub) => (
                    <div
                      key={sub.id || sub._id}
                      className={`subcategory-option ${
                        selectedSubCategoryId === (sub.id || sub._id)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        const subId = sub.id || sub._id || "";
                        if (selectedSubCategoryId === subId) {
                          onSubCategoryChange("");
                        } else {
                          onSubCategoryChange(subId);
                        }
                      }}
                    >
                      <h4 className="subcategory-name">
                        {getLocalizedName(sub.name, sub)}
                      </h4>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!showFilters && (
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(true)}
            >
              <Image
                src="/filter.png"
                alt={t("shop.filter")}
                className="filter-icon"
                width={20}
                height={20}
              />
              {t("shop.filterToggle")}
            </button>
          )}

          {showFilters && (
            <div className={`additional-filters ${isClosing ? "closing" : ""}`}>
              <div className="filters-header">
                <button
                  className="filters-close-btn"
                  onClick={handleClose}
                  aria-label={t("shop.closeFilters")}
                >
                  ✕
                </button>
              </div>
              {selectedSubCategoryId &&
                getAvailableAttributes("ageGroups").length > 0 && (
                  <div className="filter-section">
                    <div className="filter-header">
                      {" "}
                      <h3 className="filter-title">
                        {t("shop.ageGroupFilter")}
                      </h3>
                      {selectedAgeGroup && (
                        <button
                          className="filter-clear-btn"
                          onClick={() => onAgeGroupChange("")}
                          aria-label={t("shop.clearAgeGroupFilter")}
                        >
                          {t("shop.clear")}
                        </button>
                      )}
                    </div>
                    <div className="filter-options">
                      <div className="filter-group">
                        {getAvailableAttributes("ageGroups").map((ageGroup) => (
                          <div
                            key={ageGroup}
                            className={`filter-option ${
                              selectedAgeGroup === ageGroup ? "selected" : ""
                            }`}
                            onClick={() =>
                              onAgeGroupChange(
                                ageGroup === selectedAgeGroup ? "" : ageGroup
                              )
                            }
                          >
                            {" "}
                            {getLocalizedAgeGroupName(ageGroup)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              {selectedSubCategoryId &&
                getAvailableAttributes("sizes").length > 0 && (
                  <div className="filter-section">
                    <div className="filter-header">
                      {" "}
                      <h3 className="filter-title">{t("shop.sizes")}</h3>
                      {selectedSize && (
                        <button
                          className="filter-clear-btn"
                          onClick={() => onSizeChange("")}
                          aria-label={t("shop.clearSizeFilter")}
                        >
                          {t("shop.clear")}
                        </button>
                      )}
                    </div>
                    <div className="filter-options">
                      <div className="filter-group size-group">
                        {getAvailableAttributes("sizes").map((size) => (
                          <div
                            key={size}
                            className={`filter-option size ${
                              selectedSize === size ? "selected" : ""
                            }`}
                            onClick={() =>
                              onSizeChange(size === selectedSize ? "" : size)
                            }
                          >
                            {size}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}{" "}
              {selectedSubCategoryId &&
                getAvailableAttributes("colors").length > 0 && (
                  <div className="filter-section">
                    <div className="filter-header">
                      {" "}
                      <h3 className="filter-title">{t("shop.colors")}</h3>
                      {selectedColor && (
                        <button
                          className="filter-clear-btn"
                          onClick={() => onColorChange("")}
                          aria-label={t("shop.clearColorFilter")}
                        >
                          {t("shop.clear")}
                        </button>
                      )}
                    </div>
                    <div className="filter-options">
                      <div className="filter-group color-group">
                        {getAvailableAttributes("colors").map((color) => (
                          <div
                            key={color}
                            className={`filter-option color ${
                              selectedColor === color ? "selected" : ""
                            }`}
                            onClick={() =>
                              onColorChange(
                                color === selectedColor ? "" : color
                              )
                            }
                          >
                            {getLocalizedColorName(color)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              {!isBrandsLoading &&
                availableBrands &&
                availableBrands.length > 0 && (
                  <div className="filter-section">
                    <div className="filter-header">
                      {" "}
                      <h3 className="filter-title">{t("shop.brands")}</h3>
                      {(selectedBrand || brandSearchTerm) && (
                        <button
                          className="filter-clear-btn"
                          onClick={() => {
                            onBrandChange("");
                            setBrandSearchTerm("");
                          }}
                          aria-label={t("shop.clearBrandFilter")}
                        >
                          {t("shop.clear")}
                        </button>
                      )}
                    </div>

                    <div className="brand-search-container">
                      <input
                        type="text"
                        placeholder={t("shop.searchArtists")}
                        value={getBrandSearchDisplayValue()}
                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                        onFocus={handleBrandSearchFocus}
                        onBlur={handleBrandSearchBlur}
                        className="brand-search-input"
                      />

                      {showBrandsDropdown && (
                        <div className="brands-dropdown">
                          {getFilteredBrands().map((brand) => (
                            <div
                              key={brand}
                              className={`brand-dropdown-item ${
                                selectedBrand === brand ? "selected" : ""
                              }`}
                              onClick={() => handleBrandSelect(brand)}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {brand}
                            </div>
                          ))}

                          {getFilteredBrands().length === 0 &&
                            brandSearchTerm && (
                              <div className="brand-dropdown-item no-brands-message">
                                {t("shop.noArtistsFound")}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}{" "}
              <div className="filter-section">
                <div className="filter-header">
                  <h3 className="filter-title">
                    {t("shop.showDiscountedProducts")}
                  </h3>
                  {showDiscountedOnly && (
                    <button
                      className="filter-clear-btn"
                      onClick={() => onDiscountFilterChange(false)}
                      aria-label={t("shop.clearDiscountFilter")}
                    >
                      {t("shop.clear")}
                    </button>
                  )}
                </div>
                <div className="filter-options">
                  <div className="filter-group">
                    <div
                      className={`filter-option discount-filter ${
                        showDiscountedOnly ? "selected" : ""
                      }`}
                      onClick={() =>
                        onDiscountFilterChange(!showDiscountedOnly)
                      }
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: "2px solid",
                        borderColor: showDiscountedOnly ? "#e74c3c" : "#ddd",
                        backgroundColor: showDiscountedOnly
                          ? "#e74c3c"
                          : "transparent",
                        color: showDiscountedOnly ? "white" : "#333",
                        fontWeight: showDiscountedOnly ? "bold" : "normal",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>
                        {showDiscountedOnly ? "✓" : "○"}
                      </span>
                      <span>{t("shop.onlyDiscountedProducts")}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="filter-section">
                {" "}
                <h3 className="filter-title">{t("shop.priceRange")}</h3>
                <div className="price-range">
                  <div className="price-inputs">
                    <input
                      type="number"
                      value={minPrice}
                      min={0}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMinPrice(value >= 0 ? value : 0);
                      }}
                      placeholder={t("shop.min")}
                      className="price-input"
                    />
                    <span className="price-separator">-</span>
                    <input
                      type="number"
                      value={maxPrice}
                      min={minPrice}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMaxPrice(value >= minPrice ? value : minPrice);
                      }}
                      placeholder={t("shop.max")}
                      className="price-input"
                    />
                    <button
                      className="price-apply-btn"
                      onClick={handlePriceChange}
                      aria-label={t("shop.applyPrice")}
                    >
                      {t("shop.applyPrice")}
                    </button>
                  </div>
                </div>
              </div>{" "}
              {(selectedCategoryId ||
                selectedSubCategoryId ||
                selectedAgeGroup ||
                selectedSize ||
                selectedColor ||
                selectedBrand ||
                showDiscountedOnly ||
                minPrice > 0 ||
                maxPrice < 1000) && (
                <div className="filter-section">
                  <button
                    className="clear-filters-btn"
                    onClick={resetAllFilters}
                    aria-label={t("shop.clearAllFilters")}
                  >
                    {t("shop.clearAllFilters")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sort-section">
          <div className="sort-header">
            <h3 className="sort-title">{t("shop.sortBy")}</h3>
          </div>
          <div className="sort-options">
            <select
              className="sort-select"
              onChange={(e) => {
                const value = e.target.value;
                const [field, direction] = value.split("-");
                onSortChange({
                  field,
                  direction: direction as "asc" | "desc",
                });
              }}
            >
              {" "}
              <option value="createdAt-desc">{t("shop.newest")}</option>{" "}
              <option value="price-asc">{t("shop.priceLowHigh")}</option>{" "}
              <option value="price-desc">{t("shop.priceHighLow")}</option>{" "}
              <option value="name-asc">{t("shop.nameAZ")}</option>{" "}
              <option value="name-desc">{t("shop.nameZA")}</option>{" "}
              <option value="rating-desc">{t("shop.ratingHigh")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
