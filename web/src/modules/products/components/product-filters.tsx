"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  onBrandChange: (brand: string) => void;
  onDiscountFilterChange: (showDiscountedOnly: boolean) => void;
  onDimensionFilterChange?: (dimension: string) => void;
  onMaterialFilterChange?: (material: string) => void;
  onOriginalFilterChange?: (isOriginal: string) => void;
  selectedCategoryId?: string;
  selectedSubCategoryId?: string | string[];
  selectedAgeGroup?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedBrand?: string;
  selectedDimension?: string | string[];
  selectedMaterial?: string | string[];
  selectedOriginal?: string | string[];
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
  onBrandChange,
  onDiscountFilterChange,
  onPriceRangeChange,
  onDimensionFilterChange,
  onMaterialFilterChange,
  onOriginalFilterChange,
  selectedCategoryId,
  selectedSubCategoryId,
  selectedAgeGroup,
  selectedSize,
  selectedColor,
  selectedBrand,
  selectedDimension,
  selectedMaterial,
  selectedOriginal,
  showDiscountedOnly = false,
  priceRange = [0, 1000],
}: FilterProps) {
  const { language, t } = useLanguage();
  const [minPrice, setMinPrice] = useState(priceRange[0]);
  const [maxPrice, setMaxPrice] = useState(priceRange[1]);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>("");
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
  const [showBrandsDropdown, setShowBrandsDropdown] = useState(false);
  const [isMaterialSectionOpen, setIsMaterialSectionOpen] = useState(() => {
    if (Array.isArray(selectedMaterial)) {
      return selectedMaterial.length > 0;
    }
    return Boolean(selectedMaterial);
  });
  const [isDimensionSectionOpen, setIsDimensionSectionOpen] = useState(() => {
    if (Array.isArray(selectedDimension)) {
      return selectedDimension.length > 0;
    }
    return Boolean(selectedDimension);
  });

  // Refs for scroll and positioning
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setShowFilters(desktop);
      if (desktop) {
        setIsClosing(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when filters are open
  useEffect(() => {
    if (isDesktop) {
      document.body.style.overflow = "";
      return () => {
        document.body.style.overflow = "";
      };
    }

    if (showFilters) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showFilters, isDesktop]);

  // Update local state when props change
  useEffect(() => {
    setMinPrice(priceRange[0]);
    setMaxPrice(priceRange[1]);
  }, [priceRange]);

  // Auto-apply price filter when values change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only apply if values are valid
      if (minPrice >= 0 && maxPrice >= minPrice) {
        const valuesUnchanged =
          minPrice === priceRange[0] && maxPrice === priceRange[1];

        if (valuesUnchanged) {
          return;
        }

        onPriceRangeChange([minPrice, maxPrice]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [minPrice, maxPrice, onPriceRangeChange, priceRange]);

  // Auto-show subcategories when category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      setShowSubcategories(true);
    } else {
      setShowSubcategories(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (Array.isArray(selectedMaterial) && selectedMaterial.length > 0) {
      setIsMaterialSectionOpen(true);
    } else if (typeof selectedMaterial === "string" && selectedMaterial) {
      setIsMaterialSectionOpen(true);
    }
  }, [selectedMaterial]);

  useEffect(() => {
    if (Array.isArray(selectedDimension) && selectedDimension.length > 0) {
      setIsDimensionSectionOpen(true);
    } else if (typeof selectedDimension === "string" && selectedDimension) {
      setIsDimensionSectionOpen(true);
    }
  }, [selectedDimension]);

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
          console.log("Fallback brands from products:", brands);
          return brands;
        }
        const brands = await response.json();
        console.log("Fetched brands from API:", brands);
        return brands;
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (colors change rarely)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (age groups change rarely)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Fetch all available materials
  const { data: availableMaterials = [] } = useQuery<string[]>({
    queryKey: ["materials", selectedCategoryId, selectedSubCategoryId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCategoryId)
          params.append("mainCategory", selectedCategoryId);

        // If subcategories are selected, filter materials by those subcategories
        if (
          Array.isArray(selectedSubCategoryId) &&
          selectedSubCategoryId.length > 0
        ) {
          params.append("subCategory", selectedSubCategoryId.join(","));
        } else if (
          typeof selectedSubCategoryId === "string" &&
          selectedSubCategoryId
        ) {
          params.append("subCategory", selectedSubCategoryId);
        }

        const queryString = params.toString();
        const url = queryString
          ? `/products?${queryString}&page=1&limit=1000`
          : "/products?page=1&limit=1000";

        const response = await fetchWithAuth(url);
        if (!response.ok) {
          return [];
        }
        const productsData = await response.json();
        const products = productsData.items || productsData;
        // Extract unique materials from products
        const materials: string[] = [
          ...new Set(
            products
              .flatMap(
                (product: { materials?: string[] }) => product.materials || []
              )
              .filter(Boolean) as string[]
          ),
        ];
        return materials;
      } catch (err) {
        console.error("Failed to fetch materials:", err);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!selectedCategoryId,
  });

  const normalizedSelectedMaterials = useMemo(() => {
    if (Array.isArray(selectedMaterial)) {
      return selectedMaterial.map((material) => material.trim()).filter(Boolean);
    }
    if (typeof selectedMaterial === "string" && selectedMaterial) {
      return [selectedMaterial.trim()].filter(Boolean);
    }
    return [];
  }, [selectedMaterial]);

  const sortedMaterials = useMemo(() => {
    return Array.from(
      new Set(
        availableMaterials
          .map((material) => material.trim())
          .filter((material) => material.length > 0),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, language === "en" ? "en" : "ka", {
        sensitivity: "base",
      }),
    );
  }, [availableMaterials, language]);

  // Fetch all available dimensions
  const { data: availableDimensions = [] } = useQuery<string[]>({
    queryKey: ["dimensions", selectedCategoryId, selectedSubCategoryId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCategoryId)
          params.append("mainCategory", selectedCategoryId);

        // If subcategories are selected, filter dimensions by those subcategories
        if (
          Array.isArray(selectedSubCategoryId) &&
          selectedSubCategoryId.length > 0
        ) {
          params.append("subCategory", selectedSubCategoryId.join(","));
        } else if (
          typeof selectedSubCategoryId === "string" &&
          selectedSubCategoryId
        ) {
          params.append("subCategory", selectedSubCategoryId);
        }

        const queryString = params.toString();
        const url = queryString
          ? `/products?${queryString}&page=1&limit=1000`
          : "/products?page=1&limit=1000";

        const response = await fetchWithAuth(url);
        if (!response.ok) {
          return [];
        }
        const productsData = await response.json();
        const products = productsData.items || productsData;
        // Extract unique dimension strings from products
        const dimensions: string[] = [
          ...new Set(
            products
              .map(
                (product: {
                  dimensions?: {
                    width?: number;
                    height?: number;
                    depth?: number;
                  };
                }) => {
                  if (product.dimensions?.width && product.dimensions?.height) {
                    const width = Number(product.dimensions.width);
                    const height = Number(product.dimensions.height);
                    const depth = product.dimensions.depth
                      ? Number(product.dimensions.depth)
                      : undefined;

                    if (Number.isFinite(width) && Number.isFinite(height)) {
                      const base = `${width}x${height}`;
                      return depth && Number.isFinite(depth)
                        ? `${base}x${depth}`
                        : base;
                    }
                  }
                  return null;
                }
              )
              .filter(Boolean) as string[]
          ),
        ];
        return dimensions.sort((a, b) => {
          const parseDimension = (value: string) =>
            value
              .split("x")
              .map((segment) => parseFloat(segment.trim()))
              .filter((num) => Number.isFinite(num));

          const dimsA = parseDimension(a);
          const dimsB = parseDimension(b);
          const compareLength = Math.max(dimsA.length, dimsB.length);

          for (let i = 0; i < compareLength; i += 1) {
            const valA = dimsA[i] ?? Number.NEGATIVE_INFINITY;
            const valB = dimsB[i] ?? Number.NEGATIVE_INFINITY;

            if (valA !== valB) {
              return valA - valB;
            }
          }

          return a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });
      } catch (err) {
        console.error("Failed to fetch dimensions:", err);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!selectedCategoryId,
  });

  const normalizedSelectedDimensions = useMemo(() => {
    if (Array.isArray(selectedDimension)) {
      return selectedDimension.map((dimension) => dimension.trim()).filter(Boolean);
    }
    if (typeof selectedDimension === "string" && selectedDimension) {
      return [selectedDimension.trim()].filter(Boolean);
    }
    return [];
  }, [selectedDimension]);

  // Get available attributes based on selected subcategory
  const getAvailableAttributes = (
    attributeType: "ageGroups" | "sizes" | "colors"
  ): string[] => {
    if (!subcategories || subcategories.length === 0) return [];

    // Normalize selected subcategory ids (empty array means "all")
    const selectedIds = Array.isArray(selectedSubCategoryId)
      ? selectedSubCategoryId.filter(Boolean).map((id) => id.toString())
      : selectedSubCategoryId
      ? [selectedSubCategoryId.toString()]
      : [];

    const relevantSubcategories =
      selectedIds.length > 0
        ? subcategories.filter((sub) => {
            const candidateId =
              (sub.id as string | undefined) ?? (sub._id as string | undefined);
            return candidateId
              ? selectedIds.includes(candidateId.toString())
              : false;
          })
        : subcategories;

    if (relevantSubcategories.length === 0) {
      return [];
    }

    const allAttributes = new Set<string>();

    relevantSubcategories.forEach((sub) => {
      const attributes = sub?.[attributeType];
      if (Array.isArray(attributes)) {
        attributes
          .filter((attr): attr is string => typeof attr === "string" && !!attr)
          .forEach((attr) => allAttributes.add(attr));
      }
    });

    if (attributeType === "sizes") {
      return Array.from(allAttributes).sort((a, b) => {
        const pattern = /\d+(?:[.,]\d+)?/g;
        const numsA =
          a
            .match(pattern)
            ?.map((value) => parseFloat(value.replace(/,/g, "."))) || [];
        const numsB =
          b
            .match(pattern)
            ?.map((value) => parseFloat(value.replace(/,/g, "."))) || [];

        const compareLength = Math.max(numsA.length, numsB.length);
        for (let i = 0; i < compareLength; i += 1) {
          const valA = numsA[i] ?? Number.NEGATIVE_INFINITY;
          const valB = numsB[i] ?? Number.NEGATIVE_INFINITY;

          if (valA !== valB) {
            return valA - valB;
          }
        }

        return a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    }

    return Array.from(allAttributes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  };
  // Get localized color name based on current language
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

  // Filter brands based on search term with enhanced matching
  const getFilteredBrands = (): string[] => {
    console.log(
      "getFilteredBrands called with availableBrands:",
      availableBrands,
      "searchTerm:",
      brandSearchTerm
    );
    if (!brandSearchTerm.trim()) {
      return availableBrands;
    }
    const searchTerm = brandSearchTerm.toLowerCase().trim();
    const filtered = availableBrands.filter((brand) => {
      const brandLower = brand.toLowerCase();
      return (
        brandLower.includes(searchTerm) ||
        brandLower.startsWith(searchTerm) ||
        // Handle Georgian special characters and spaces
        brandLower
          .replace(/\s+/g, "")
          .includes(searchTerm.replace(/\s+/g, "")) ||
        // Also search by removing common Georgian prefixes/suffixes
        brandLower
          .replace(/^და\s+|ების$|ის$|\s+/g, "")
          .includes(searchTerm.replace(/^და\s+|ების$|ის$|\s+/g, ""))
      );
    });
    console.log("Filtered brands result:", filtered);
    return filtered;
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
    console.log(
      "handleBrandSelect called with:",
      brand,
      "current selectedBrand:",
      selectedBrand
    );
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

  const handleFilterToggle = () => {
    setShowFilters(true);

    // Scroll to filter section after a short delay to allow it to render
    setTimeout(() => {
      if (filterContainerRef.current) {
        const containerRect =
          filterContainerRef.current.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const targetY = scrollTop + containerRect.top - 120; // 120px offset from top for better visibility

        window.scrollTo({
          top: targetY,
          behavior: "smooth",
        });
      }
    }, 150); // Slightly longer delay to ensure filters are rendered
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
                          category.name === "ხელნაკეთი ნივთები" ||
                          category.name === "ხელნაკეთი" ||
                          category.nameEn === "Handmades" ||
                          category.nameEn === "Handmade"
                            ? "category-handmade"
                            : category.name === "ნახატები" ||
                              category.nameEn === "Paintings"
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
            <div
              className="subcategories-section"
              data-category={(() => {
                const selectedCategory = categories.find(
                  (cat) => (cat.id || cat._id) === selectedCategoryId
                );
                if (!selectedCategory) return "";

                const categoryName = selectedCategory.name;
                const categoryNameEn = selectedCategory.nameEn;

                // Check for paintings category (Georgian or English)
                if (
                  categoryName === "ნახატები" ||
                  categoryNameEn === "Paintings"
                ) {
                  return "paintings";
                }

                // Check for handmade category (Georgian or English)
                if (
                  categoryName === "ხელნაკეთი ნივთები" ||
                  categoryName === "ხელნაკეთი" ||
                  categoryNameEn === "Handmades" ||
                  categoryNameEn === "Handmade"
                ) {
                  return "handmade";
                }

                return "";
              })()}
            >
              {/* <h3 className="subcategories-title">
                {t("shop.subcategories")} -{" "}
                {getLocalizedName(
                  categories.find(
                    (cat) => (cat.id || cat._id) === selectedCategoryId
                  )?.name || "",
                  categories.find(
                    (cat) => (cat.id || cat._id) === selectedCategoryId
                  )
                )}
              </h3> */}
              <div className="subcategories-grid">
                {isSubcategoriesLoading ? (
                  <div className="loading">
                    <HeartLoading size="medium" />
                  </div>
                ) : (
                  <>
                    {/* All pill - always shows as active by default */}
                    <div
                      className={`subcategory-pill ${
                        !Array.isArray(selectedSubCategoryId) ||
                        selectedSubCategoryId.length === 0
                          ? "active"
                          : ""
                      }`}
                      onClick={() => onSubCategoryChange("")}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="pill-text">
                        {language === "en" ? "All" : "ყველა"}
                      </span>
                    </div>

                    {/* Individual subcategory pills with X icon */}
                    {subcategories.map((sub) => {
                      const subId = sub.id || sub._id || "";
                      const selectedIds = Array.isArray(selectedSubCategoryId)
                        ? selectedSubCategoryId
                        : [];
                      const isSelected = selectedIds.includes(subId);

                      return (
                        <div
                          key={subId}
                          className={`subcategory-pill ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => {
                            onSubCategoryChange(subId);
                          }}
                        >
                          <span className="pill-text">
                            {getLocalizedName(sub.name, sub)}
                          </span>
                          {isSelected && <span className="pill-x">✕</span>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Filter Overlay */}
          {showFilters && !isDesktop && (
            <div className="filter-modal-overlay" onClick={handleClose} />
          )}

          {!isDesktop && !showFilters && (
            <button
              ref={filterButtonRef}
              className={`filter-toggle-btn desktop-sticky-filter-btn sticky`}
              onClick={handleFilterToggle}
            >
              <Image
                src="/filter.png"
                alt={t("shop.filter")}
                className="filter-icon"
                width={24}
                height={24}
              />
            </button>
          )}

          {(showFilters || isDesktop) && (
            <div
              ref={filterContainerRef}
              className={`additional-filters ${
                !isDesktop && isClosing ? "closing" : ""
              } ${isDesktop ? "desktop-visible" : ""}`}
            >
              <div className="filters-header">
                <h3>{language === "en" ? "Filters" : "ფილტრები"}</h3>
                {!isDesktop && (
                  <button
                    className="filters-close-btn"
                    onClick={handleClose}
                    aria-label={t("shop.closeFilters")}
                  >
                    ✕
                  </button>
                )}
              </div>
              {((Array.isArray(selectedSubCategoryId) &&
                selectedSubCategoryId.length > 0) ||
                (typeof selectedSubCategoryId === "string" &&
                  selectedSubCategoryId)) &&
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
              {selectedCategoryId &&
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
              {((Array.isArray(selectedSubCategoryId) &&
                selectedSubCategoryId.length > 0) ||
                (typeof selectedSubCategoryId === "string" &&
                  selectedSubCategoryId)) &&
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
              {/* Original/Copy Filter */}
              <div className="filter-section">
                <div className="filter-header">
                  <h3 className="filter-title">
                    {language === "en" ? "Product Type" : "პროდუქტის ტიპი"}
                  </h3>
                  {((Array.isArray(selectedOriginal) &&
                    selectedOriginal.length > 0) ||
                    (typeof selectedOriginal === "string" &&
                      selectedOriginal)) && (
                    <button
                      className="filter-clear-btn"
                      onClick={() => onOriginalFilterChange?.("")}
                      aria-label={t("shop.clear")}
                    >
                      {t("shop.clear")}
                    </button>
                  )}
                </div>
                <div className="filter-options">
                  <div className="filter-group">
                    <div
                      className={`filter-option ${
                        (
                          Array.isArray(selectedOriginal)
                            ? selectedOriginal.includes("true")
                            : selectedOriginal === "true"
                        )
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => onOriginalFilterChange?.("true")}
                    >
                      {language === "en" ? "Original" : "ორიგინალი"}
                    </div>
                    <div
                      className={`filter-option ${
                        (
                          Array.isArray(selectedOriginal)
                            ? selectedOriginal.includes("false")
                            : selectedOriginal === "false"
                        )
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => onOriginalFilterChange?.("false")}
                    >
                      {language === "en" ? "Copy" : "ასლი"}
                    </div>
                  </div>
                </div>
              </div>
              {/* Materials Filter */}
              {selectedCategoryId && sortedMaterials.length > 0 && (
                <div className="filter-section compact-filter">
                  <div className="filter-header compact">
                    <div>
                      <h3 className="filter-title compact">
                        {language === "en" ? "Materials" : "მასალები"}
                      </h3>
                    </div>
                    <div className="filter-header-actions">
                      {normalizedSelectedMaterials.length > 0 && (
                        <button
                          className="filter-clear-btn"
                          onClick={() => onMaterialFilterChange?.("")}
                          aria-label={t("shop.clear")}
                        >
                          {t("shop.clear")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="filter-collapse-btn"
                        onClick={() =>
                          setIsMaterialSectionOpen((previous) => !previous)
                        }
                        aria-expanded={isMaterialSectionOpen}
                        aria-controls="materials-filter-options"
                      >
                        {isMaterialSectionOpen
                          ? language === "en"
                            ? "Hide"
                            : "დამალე"
                          : language === "en"
                          ? "Show"
                          : "გახსენი"}
                      </button>
                    </div>
                  </div>
                  {isMaterialSectionOpen && (
                    <div
                      className="filter-options compact"
                      id="materials-filter-options"
                    >
                      <div className="checkbox-group">
                        {sortedMaterials.map((material) => {
                          const isChecked =
                            normalizedSelectedMaterials.includes(material);

                          return (
                            <label key={material} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  onMaterialFilterChange?.(material)
                                }
                                className="checkbox-input"
                              />
                              <span className="checkbox-text">
                                {material}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Dimensions Filter */}
              {selectedCategoryId && availableDimensions.length > 0 && (
                <div className="filter-section compact-filter">
                  <div className="filter-header compact">
                    <div>
                      <h3 className="filter-title compact">
                        {language === "en" ? "Dimensions" : "ზომები"}
                      </h3>
                      <p className="filter-subtitle compact">
                        {language === "en"
                          ? "Measurements in centimeters (width / height / depth)"
                          : "ზომები სანტიმეტრებში (სიგანე / სიმაღლე / სიღრმე)"}
                      </p>
                    </div>
                    <div className="filter-header-actions">
                      {normalizedSelectedDimensions.length > 0 && (
                        <button
                          className="filter-clear-btn"
                          onClick={() => onDimensionFilterChange?.("")}
                          aria-label={t("shop.clear")}
                        >
                          {t("shop.clear")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="filter-collapse-btn"
                        onClick={() =>
                          setIsDimensionSectionOpen((previous) => !previous)
                        }
                        aria-expanded={isDimensionSectionOpen}
                        aria-controls="dimensions-filter-options"
                      >
                        {isDimensionSectionOpen
                          ? language === "en"
                            ? "Hide"
                            : "დამალე"
                          : language === "en"
                          ? "Show"
                          : "გახსენი"}
                      </button>
                    </div>
                  </div>
                  {isDimensionSectionOpen && (
                    <div
                      className="filter-options compact"
                      id="dimensions-filter-options"
                    >
                      <div className="checkbox-group">
                        {availableDimensions.map((dimension) => {
                          const normalizedDimension = dimension.trim();
                          const isChecked =
                            normalizedSelectedDimensions.includes(
                              normalizedDimension
                            );

                          return (
                            <label key={dimension} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  onDimensionFilterChange?.(
                                    normalizedDimension
                                  )
                                }
                                className="checkbox-input"
                              />
                              <span className="checkbox-text">
                                {normalizedDimension}
                                <span className="dimension-unit">
                                  {language === "en" ? " cm" : " სმ"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
      </div>
    </div>
  );
}
