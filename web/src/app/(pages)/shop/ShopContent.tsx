"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, Category } from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";

const PRIMARY_COLOR = "#012645";
const SHOP_PAGE_STORAGE_KEY = "shopCurrentPage";
// "No upper limit" sentinel for the price filter. The default max used to be
// 1000, which broke links like the Premium rail (?minPrice=1500 with no max):
// it produced an invalid range [1500, 1000] and returned zero products.
const PRICE_MAX = 1_000_000;

/** Spring collection keywords for multi-search */
const SPRING_KEYWORDS = [
  "ყვავილ",
  "გაზაფხულ",
  "ბაღ",
  "ბუნებ",
  "მზესუმზირ",
  "მზესუმზირა",
  "იასამან",
  "იასამნ",
  "ყაყაჩო",
  "ვარდ",
  "იის",
  "ტიტა",
  "ნარგიზ",
  "ტულიპ",
  "პეონ",
  "ქრიზანთემ",
  "spring",
  "flower",
  "blossom",
  "garden",
  "bloom",
  "sunflower",
  "poppy",
  "rose",
  "lilac",
  "tulip",
  "daisy",
  "peony",
];
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { categoryPath } from "@/lib/category-url";
import "./ShopPage.css";
import Image from "next/image";

interface ShopContentProps {
  initialProducts?: Product[];
  initialTotalPages?: number;
  // Clean category routes (/paintings, /handmade/<sub>) seed the category from
  // props and suppress the ?mainCategory= URL sync to keep the URL clean.
  initialMainCategory?: string;
  initialSubCategoryId?: string;
  categoryMode?: boolean;
  mainSlug?: string;
}

const ShopContent = ({
  initialProducts = [],
  initialTotalPages = 1,
  initialMainCategory = "",
  initialSubCategoryId = "",
  categoryMode = false,
  mainSlug = "",
}: ShopContentProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  // Category navigation runs inside a transition so the filters stay fully
  // interactive while the next route loads — clicks are never dropped, and
  // isNavPending drives a lightweight "loading" state in the product area only
  // (not a full-page swap that would hide the filters).
  const [isNavPending, startNavTransition] = useTransition();

  const initializedRef = useRef(false);
  // When the server already rendered this view's products (clean category
  // routes), skip the first client fetch — it would just re-request the
  // identical query the server already resolved. Filter/page changes after
  // init still fetch normally.
  const skipInitialFetchRef = useRef(initialProducts.length > 0);
  // Clean category routes reuse this SAME component instance across
  // navigations (/paintings → /paintings/portrait → /handmade …). Instead of a
  // heavy full remount on every click, we resync state to the fresh SSR data
  // when the route identity changes (see the prop-sync effect below). This ref
  // tracks the route we last synced.
  const routeKeyRef = useRef<string | null>(null);
  const pendingInitialStateRef = useRef<{
    page: number;
    mainCategory: string;
    subCategory: string;
    ageGroup: string;
    size: string;
    color: string;
    brand: string;
    keyword: string;
    showDiscountedOnly: boolean;
    showPromoOnly: boolean;
    priceRange: [number, number];
    sorting: { field: string; direction: "asc" | "desc" };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

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
  const [keyword, setKeyword] = useState<string>(
    searchParams?.get("keyword") || "",
  );
  const [collection, setCollection] = useState<string>(
    searchParams?.get("collection") || "",
  );

  const [showDiscountedOnly, setShowDiscountedOnly] = useState<boolean>(false);
  const [showPromoOnly, setShowPromoOnly] = useState<boolean>(false);
  const [selectedOriginalTypes, setSelectedOriginalTypes] = useState<string[]>(
    [],
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

  // Use layoutEffect to reset scroll before paint - fixes sticky sidebar on client-side nav
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories?includeInactive=false",
        );
        return response.json();
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // In categoryMode, load this category's subcategories so a sub selection can
  // navigate to the clean /<main>/<sub-slug> URL.
  const { data: subcategoriesData = [] } = useQuery<
    Array<{ _id?: string; id?: string; slug?: string }>
  >({
    queryKey: ["subcategories", initialMainCategory],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          `/subcategories?categoryId=${initialMainCategory}`,
        );
        return response.json();
      } catch {
        return [];
      }
    },
    enabled: categoryMode && !!initialMainCategory,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
  });

  const subSlugById = useMemo(() => {
    const map: Record<string, string> = {};
    subcategoriesData.forEach((s) => {
      const id = s._id || s.id;
      if (id && s.slug) map[id] = s.slug;
    });
    return map;
  }, [subcategoriesData]);

  // Prefetch the clean sub-routes so switching categories is instant (Next
  // preloads the RSC + its server-rendered products before the click).
  useEffect(() => {
    if (!categoryMode || !mainSlug) return;
    router.prefetch(`/${mainSlug}`);
    Object.values(subSlugById).forEach((slug) =>
      router.prefetch(`/${mainSlug}/${slug}`),
    );
  }, [categoryMode, mainSlug, subSlugById, router]);

  // Prop-sync: on client navigation between category routes the component
  // instance persists (same tree position) and only props change. Resync state
  // to the new server-rendered data so displayed products always match the URL,
  // without paying for a full remount (which froze the main thread and made
  // rapid clicks get dropped).
  useEffect(() => {
    if (!categoryMode) return;
    const routeKey = `${initialMainCategory}|${initialSubCategoryId}`;
    if (routeKeyRef.current === null) {
      // First mount — the init effect below seeds state from props.
      routeKeyRef.current = routeKey;
      return;
    }
    if (routeKeyRef.current === routeKey) return; // same route, nothing to do
    routeKeyRef.current = routeKey;

    // Fresh SSR data for the new category/subcategory — adopt it directly and
    // skip the redundant client refetch the filter-change effect would trigger.
    skipInitialFetchRef.current = true;
    setProducts(initialProducts);
    setTotalPages(initialTotalPages);
    setSelectedCategoryId(initialMainCategory);
    setSelectedSubCategoryIds(
      initialSubCategoryId ? [initialSubCategoryId] : [],
    );
    setSelectedAgeGroup("");
    setSelectedSize("");
    setSelectedColor("");
    setCurrentPage(1);
    setIsLoading(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [
    categoryMode,
    initialMainCategory,
    initialSubCategoryId,
    initialProducts,
    initialTotalPages,
  ]);

  const getTheme = () => {
    if (!selectedCategoryId || !categories.length) return "default";

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId || cat._id === selectedCategoryId,
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
    // On clean category routes the id comes from props (no URL query).
    const mainCategoryParam =
      searchParams?.get("mainCategory") || initialMainCategory || "";
    const subCategoryParam =
      searchParams?.get("subCategory") || initialSubCategoryId || "";
    const ageGroupParam = searchParams?.get("ageGroup") || "";
    const sizeParam = searchParams?.get("size") || "";
    const colorParam = searchParams?.get("color") || "";
    const brandParam = searchParams?.get("brand") || "";

    let decodedBrandParam = "";
    if (brandParam) {
      try {
        decodedBrandParam = decodeURIComponent(brandParam).trim();
      } catch (error) {
        console.error("Error decoding brand parameter:", error);
        decodedBrandParam = brandParam.trim();
      }
    }

    const keywordParam = searchParams?.get("keyword") || "";
    const collectionParam = searchParams?.get("collection") || "";
    const discountParam = searchParams?.get("discountOnly") === "true";
    const promoParam = searchParams?.get("promo") === "true";
    const minPriceParam = parseInt(searchParams?.get("minPrice") || "0");
    let maxPriceParam = parseInt(searchParams?.get("maxPrice") || "1000");
    // Deep-links (e.g. PremiumRail "View All") pass only minPrice, and the
    // default max (1000) can be lower than that min — an impossible range that
    // returns nothing. When max ends up below min, drop the upper cap.
    if (maxPriceParam < minPriceParam) {
      maxPriceParam = PRICE_MAX;
    }
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
      keyword: keywordParam,
      showDiscountedOnly: discountParam,
      showPromoOnly: promoParam,
      priceRange: [minPriceParam, maxPriceParam],
      sorting: { field: sortByParam, direction: sortDirectionParam },
    };

    setCurrentPage(initialPage);
    setSelectedCategoryId(mainCategoryParam);
    setSelectedSubCategoryIds(
      subCategoryParam ? subCategoryParam.split(",") : [],
    );
    setSelectedAgeGroup(ageGroupParam);
    setSelectedSize(sizeParam);
    setSelectedColor(colorParam);
    setSelectedBrand(decodedBrandParam);
    setKeyword(keywordParam);
    setCollection(collectionParam);
    setShowDiscountedOnly(discountParam);
    setShowPromoOnly(promoParam);
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
      (cat) => cat._id === selectedCategoryId,
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
      keyword === pending.keyword &&
      showDiscountedOnly === pending.showDiscountedOnly &&
      showPromoOnly === pending.showPromoOnly &&
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
    keyword,
    showDiscountedOnly,
    showPromoOnly,
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
    // First pass after init: the server already gave us these exact products.
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const baseParams: Record<string, string> = {
          sortBy: sorting.field,
          sortDirection: sorting.direction,
        };

        if (selectedCategoryId) baseParams.mainCategory = selectedCategoryId;
        if (selectedSubCategoryIds.length > 0)
          baseParams.subCategory = selectedSubCategoryIds.join(",");
        if (selectedAgeGroup) baseParams.ageGroup = selectedAgeGroup;
        if (selectedSize) baseParams.size = selectedSize;
        if (selectedColor) baseParams.color = selectedColor;
        if (selectedBrand) baseParams.brand = selectedBrand;
        if (selectedMaterials.length > 0)
          baseParams.material = selectedMaterials.join(",");
        if (selectedDimensions.length > 0)
          baseParams.dimension = selectedDimensions.join(",");

        // Always send price parameters if they differ from defaults
        if (priceRange[0] !== 0 || priceRange[1] !== 1000) {
          baseParams.minPrice = priceRange[0].toString();
          baseParams.maxPrice = priceRange[1].toString();
        }

        if (showDiscountedOnly) baseParams.discounted = "true";
        if (showPromoOnly) baseParams.hasPromo = "true";
        if (selectedOriginalTypes.length > 0)
          baseParams.isOriginal = selectedOriginalTypes.join(",");

        // Exclude out of stock products from shop and include variants for stock check
        baseParams.excludeOutOfStock = "true";
        baseParams.includeVariants = "true";

        let allItems: Product[] = [];
        let totalPagesResult = 1;

        // Collection mode: combine all keywords into one regex OR search
        if (collection === "spring") {
          const regexKeyword = SPRING_KEYWORDS.join("|");
          const params = {
            ...baseParams,
            keyword: regexKeyword,
            page: currentPage.toString(),
            limit: "20",
          };

          const response = await getProducts(currentPage, 20, params);
          allItems = response.items || [];
          totalPagesResult = response.pages || 1;
        } else {
          // Normal single-keyword or no-keyword fetch
          const params: Record<string, string> = {
            ...baseParams,
            page: currentPage.toString(),
            limit: "20",
          };
          if (keyword) params.keyword = keyword;

          const response = await getProducts(currentPage, 20, params);
          allItems = response.items || [];
          totalPagesResult = response.pages || 1;
        }

        // Filter out products with no stock (double check)
        const inStockProducts = allItems.filter((product) => {
          const hasStock =
            (product.countInStock ?? 0) > 0 ||
            (product.variants &&
              product.variants.some((v) => (v.stock ?? 0) > 0));
          return hasStock;
        });

        setProducts(inStockProducts);
        setTotalPages(totalPagesResult);
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
    keyword,
    collection,
    selectedMaterials,
    selectedDimensions,
    priceRange,
    sorting,
    showDiscountedOnly,
    showPromoOnly,
    selectedOriginalTypes,
  ]);

  useEffect(() => {
    if (!initializedRef.current) return;
    // Category routes own the URL (/paintings/<sub>); don't rewrite it to
    // /shop?mainCategory=… (would break the clean URL and 301-loop).
    if (categoryMode) return;

    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("mainCategory", selectedCategoryId);
    if (selectedSubCategoryIds.length > 0)
      params.set("subCategory", selectedSubCategoryIds.join(","));
    if (selectedAgeGroup) params.set("ageGroup", selectedAgeGroup);
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("color", selectedColor);
    if (selectedBrand && selectedBrand.trim())
      params.set("brand", selectedBrand.trim());
    if (keyword) params.set("keyword", keyword);
    if (collection) params.set("collection", collection);

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
    if (showPromoOnly) params.set("promo", "true");

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
    keyword,
    collection,
    priceRange,
    sorting,
    currentPage,
    showDiscountedOnly,
    showPromoOnly,
  ]);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      // On clean category routes, switching the main category must NAVIGATE to
      // that category's clean URL (/paintings ↔ /handmade), otherwise the URL
      // (and the mainSlug used for sub-links) desyncs from the shown products.
      if (categoryMode) {
        if (!categoryId) {
          startNavTransition(() => router.push("/shop")); // deselect → full listing
          return;
        }
        if (categoryId === initialMainCategory) return; // already here
        const cat = categories.find(
          (c) => c._id === categoryId || c.id === categoryId,
        );
        const dest = categoryPath(categoryId, (cat as { slug?: string })?.slug);
        startNavTransition(() => router.push(dest));
        return;
      }

      setCurrentPage(1);
      setSelectedCategoryId(categoryId);
      if (categoryId !== selectedCategoryId) {
        setSelectedSubCategoryIds([]);
        setSelectedAgeGroup("");
        setSelectedSize("");
        setSelectedColor("");
      }
    },
    [categoryMode, initialMainCategory, categories, router, selectedCategoryId],
  );

  const handleSubCategoryChange = useCallback(
    (subcategoryId: string, subSlug?: string) => {
      // Category routes own the URL: navigate to the clean /<main>/<sub-slug>
      // (or back to /<main> when deselected) instead of an in-place filter.
      if (categoryMode && mainSlug) {
        // Clearing the subcategory (the "All" pill, or the reset fired when the
        // main category changes): only navigate to the category root if we're
        // actually on a sub-route. Otherwise this would fight the main-category
        // navigation with a competing router.push and cancel it.
        if (!subcategoryId) {
          if (selectedSubCategoryIds.length > 0)
            startNavTransition(() => router.push(`/${mainSlug}`));
          return;
        }
        if (selectedSubCategoryIds.includes(subcategoryId)) {
          startNavTransition(() => router.push(`/${mainSlug}`)); // toggle off
        } else {
          // Prefer the slug passed straight from the clicked pill — it's always
          // available, unlike our own subcategories query which may still be
          // loading (that race made clicks occasionally do nothing).
          const slug = subSlug || subSlugById[subcategoryId];
          const dest = slug ? `/${mainSlug}/${slug}` : `/${mainSlug}`;
          startNavTransition(() => router.push(dest));
        }
        return;
      }

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
    },
    [categoryMode, mainSlug, subSlugById, selectedSubCategoryIds, router],
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
        selectedBrand,
      );
      setCurrentPage(1);
      setSelectedBrand(brand);
    },
    [selectedBrand],
  );

  const handleDiscountFilterChange = useCallback(
    (showDiscountedOnly: boolean) => {
      setCurrentPage(1);
      setShowDiscountedOnly(showDiscountedOnly);
    },
    [],
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
    [],
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

              <div
                className={`products-area${
                  isNavPending ? " is-nav-pending" : ""
                }`}
              >
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
