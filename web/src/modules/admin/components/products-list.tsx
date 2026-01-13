"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, User, Category, SubCategory } from "@/types";
import { ProductsActions } from "./products-actions";
import {
  Plus,
  Sparkles,
  Search,
  Filter,
  X,
  Eye,
  EyeOff,
  Heart,
  CheckSquare,
  Square,
  CheckCircle,
  Loader2,
} from "lucide-react";
import "./productList.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useUser } from "@/modules/auth/hooks/use-user";
import { StatusBadge } from "./status-badge";
import { Role } from "@/types/role";
import { useLanguage } from "@/hooks/LanguageContext";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { DonationModal } from "@/components/donation/DonationModal";
import { ProductStatus } from "@/types";
import { updateProductVisibility } from "@/modules/products/api/update-product-visibility";

// Extended Product type to include mainCategory and subCategory properties
interface ProductWithCategories extends Product {
  mainCategory?: { name: string; id?: string; _id?: string } | string;
  subCategory?: { name: string; id?: string; _id?: string } | string;
}

export function ProductsList() {
  // Restore page from sessionStorage or default to 1
  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPage = sessionStorage.getItem("adminProductsPage");
      return savedPage ? parseInt(savedPage, 10) : 1;
    }
    return 1;
  });

  // Restore search and filters from sessionStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminProductsSearch") || "";
    }
    return "";
  });

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminProductsSearch") || "";
    }
    return "";
  });

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminProductsStatusFilter") || "all";
    }
    return "all";
  });

  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminProductsCategoryFilter") || "all";
    }
    return "all";
  });

  const { user } = useUser();
  const { language } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [showDonation, setShowDonation] = useState(false);

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const isAdmin = user?.role === Role.Admin;

  console.log("ProductsList user check:", {
    user,
    role: user?.role,
    isAdmin,
  });

  const queryClient = useQueryClient();

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedProducts(new Set());
  }, [page, debouncedSearchQuery, statusFilter, categoryFilter]);

  // Debounce search query - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save page to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adminProductsPage", page.toString());
    }
  }, [page]);

  // Save search query to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adminProductsSearch", searchQuery);
    }
  }, [searchQuery]);

  // Save filters to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adminProductsStatusFilter", statusFilter);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adminProductsCategoryFilter", categoryFilter);
    }
  }, [categoryFilter]);

  // Add refetch capability to the query with a key to force updates
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "products",
      page,
      refreshKey,
      debouncedSearchQuery, // Use debounced query instead of immediate searchQuery
      statusFilter,
      categoryFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (debouncedSearchQuery) params.append("keyword", debouncedSearchQuery); // Use debounced query
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all")
        params.append("mainCategory", categoryFilter);

      console.log("Fetching products with params:", {
        page: page.toString(),
        keyword: debouncedSearchQuery,
        status: statusFilter,
        mainCategory: categoryFilter,
        url: `/products/user?${params.toString()}`,
      });

      const response = await fetchWithAuth(
        `/products/user?${params.toString()}`
      );
      const result = await response.json();
      console.log("Products fetch result:", result);
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds instead of default 5 minutes
    refetchInterval: isAdmin ? 60 * 1000 : undefined, // Auto-refresh every minute for admins
    refetchIntervalInBackground: true, // Continue refreshing in background
    refetchOnWindowFocus: true, // Refetch when user focuses window
  });

  // Add a function to directly fetch the updated product data after returning from an edit
  const refreshProductData = useCallback(async () => {
    try {
      console.log("Manually refreshing product data...");

      // Build params with current filters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (debouncedSearchQuery) params.append("keyword", debouncedSearchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all")
        params.append("mainCategory", categoryFilter);

      const response = await fetchWithAuth(
        `/products/user?${params.toString()}`
      );
      const freshData = await response.json();
      return freshData;
    } catch (error) {
      console.error("Error refreshing product data:", error);
      return null;
    }
  }, [page, debouncedSearchQuery, statusFilter, categoryFilter]);

  // Check if we just returned from the edit page
  useEffect(() => {
    const returnFromEdit = sessionStorage.getItem("returnFromEdit");
    if (returnFromEdit) {
      // Clear the flag
      sessionStorage.removeItem("returnFromEdit");

      // Simply trigger a refetch - this will use current filters automatically
      // Don't change refreshKey as it would invalidate the cache we're trying to update
      refetch();
    }
  }, [refetch]);

  const fetchPendingProducts = async (): Promise<Product[]> => {
    console.log("Fetching pending products...");
    const response = await fetchWithAuth("/products/pending");
    const data = await response.json();
    console.log("Pending products data:", data);
    return data;
  };

  const { data: pendingProducts } = useQuery({
    queryKey: ["pendingProducts", refreshKey],
    queryFn: fetchPendingProducts,
    enabled: isAdmin,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: isAdmin ? 30 * 1000 : undefined, // Auto-refresh every 30 seconds for pending products
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const handleProductDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setRefreshKey(Date.now()); // Force a refresh on delete
  };

  // Update handleStatusChange to also update refreshKey
  function handleStatusChange(): void {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["pendingProducts"] });
    setRefreshKey(Date.now()); // Add this to force a fresh fetch
    setSelectedProducts(new Set()); // Clear selection after status change
    refetch();
  }

  // Toggle single product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Select all products on current page
  const selectAllProducts = () => {
    if (!products || products.length === 0) return;
    const allSelected = products.every((p: Product) => selectedProducts.has(p._id));
    if (allSelected) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p: Product) => p._id)));
    }
  };

  // Bulk approve selected products
  const handleBulkApprove = async () => {
    if (selectedProducts.size === 0) return;
    
    const confirmMessage = language === "en" 
      ? `Are you sure you want to approve ${selectedProducts.size} products?`
      : `დარწმუნებული ხართ რომ გსურთ ${selectedProducts.size} პროდუქტის დამტკიცება?`;
    
    if (!confirm(confirmMessage)) return;

    setIsBulkApproving(true);
    let successCount = 0;
    let failCount = 0;

    for (const productId of selectedProducts) {
      try {
        const response = await fetchWithAuth(`/products/${productId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: ProductStatus.APPROVED }),
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to approve product ${productId}:`, error);
        failCount++;
      }
    }

    setIsBulkApproving(false);
    
    const resultMessage = language === "en"
      ? `Approved: ${successCount}, Failed: ${failCount}`
      : `დამტკიცებული: ${successCount}, წარუმატებელი: ${failCount}`;
    
    alert(resultMessage);
    handleStatusChange();
  };

  // State to track which products are being toggled
  const [togglingVisibility, setTogglingVisibility] = useState<Set<string>>(
    new Set()
  );

  // Handle visibility toggle for admin
  async function handleVisibilityToggle(
    productId: string,
    currentHideFromStore: boolean
  ): Promise<void> {
    setTogglingVisibility((prev) => new Set(prev).add(productId));

    try {
      const result = await updateProductVisibility(
        productId,
        !currentHideFromStore
      );
      if (result) {
        // Refresh the products list
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setRefreshKey(Date.now());
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
    } finally {
      setTogglingVisibility((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  }

  function getDisplayName(product: Product): string {
    return language === "en" && product.nameEn ? product.nameEn : product.name;
  }

  // Add discount calculation functions
  const hasActiveDiscount = (product: Product): boolean => {
    if (!product.discountPercentage || product.discountPercentage <= 0) {
      return false;
    }

    const now = new Date();
    const startDate = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const endDate = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;

    // If no dates are set, consider discount as active
    if (!startDate && !endDate) {
      return true;
    }

    // Check if current date is within discount period
    const isAfterStart = !startDate || now >= startDate;
    const isBeforeEnd = !endDate || now <= endDate;

    return isAfterStart && isBeforeEnd;
  };

  const calculateDiscountedPrice = (product: Product): number => {
    if (!hasActiveDiscount(product)) return product.price;
    const discountAmount = (product.price * product.discountPercentage!) / 100;
    return product.price - discountAmount;
  };

  // Add a new query to fetch all categories and subcategories for reference
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["all-categories", refreshKey], // Add refreshKey to force re-fetch
    queryFn: async () => {
      const response = await fetchWithAuth(`/categories?includeInactive=false`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for categories (they don't change often)
    refetchOnWindowFocus: false,
  });

  const { data: subcategoriesData } = useQuery<SubCategory[]>({
    queryKey: ["all-subcategories", refreshKey], // Add refreshKey to force re-fetch
    queryFn: async () => {
      const response = await fetchWithAuth(
        `/subcategories?includeInactive=false`
      );
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for subcategories
    refetchOnWindowFocus: false,
  });
  // Helper functions to get category and subcategory names by ID with translation support
  function getCategoryNameById(categoryId: string): string {
    if (!categoryId) return "Uncategorized";
    if (!categoriesData) return "Loading...";

    const category = categoriesData.find(
      (cat: { id?: string; _id?: string; name: string; nameEn?: string }) =>
        cat.id === categoryId || cat._id === categoryId
    );

    if (!category) return "Unknown Category";

    // Return translated name based on language
    return language === "en" && category.nameEn
      ? category.nameEn
      : category.name;
  }

  function getSubcategoryNameById(subcategoryId: string): string {
    if (!subcategoryId) return "";
    if (!subcategoriesData) return "Loading...";

    const subcategory = subcategoriesData?.find(
      (subcat: { id?: string; _id?: string; name: string; nameEn?: string }) =>
        subcat.id === subcategoryId || subcat._id === subcategoryId
    );

    if (!subcategory) return "Unknown Subcategory";

    // Return translated name based on language
    return language === "en" && subcategory.nameEn
      ? subcategory.nameEn
      : subcategory.name;
  }
  // New helper function to get the most accurate category display name with translation
  function getCategoryDisplayName(product: Product): string {
    // For object type mainCategory with name
    if (
      product.mainCategory &&
      typeof product.mainCategory === "object" &&
      product.mainCategory.name
    ) {
      const categoryObj = product.mainCategory as {
        name: string;
        nameEn?: string;
      };
      return language === "en" && categoryObj.nameEn
        ? categoryObj.nameEn
        : categoryObj.name;
    }

    // For object type category with name
    if (
      product.category &&
      typeof product.category === "object" &&
      product.category.name
    ) {
      const categoryObj = product.category as { name: string; nameEn?: string };
      return language === "en" && categoryObj.nameEn
        ? categoryObj.nameEn
        : categoryObj.name;
    }

    // For string type mainCategory that is an ID
    if (product.mainCategory && typeof product.mainCategory === "string") {
      return getCategoryNameById(product.mainCategory);
    }

    // For string type category that is an ID
    if (product.category && typeof product.category === "string") {
      return getCategoryNameById(product.category);
    }

    return "Uncategorized";
  }

  // New helper function to get the most accurate subcategory display name with translation
  function getSubcategoryDisplayName(product: Product): string {
    // For object type subCategory with name
    if (
      product.subCategory &&
      typeof product.subCategory === "object" &&
      product.subCategory.name
    ) {
      const subcategoryObj = product.subCategory as {
        name: string;
        nameEn?: string;
      };
      return language === "en" && subcategoryObj.nameEn
        ? subcategoryObj.nameEn
        : subcategoryObj.name;
    }

    // For string type subCategory that is an ID
    if (product.subCategory && typeof product.subCategory === "string") {
      return getSubcategoryNameById(product.subCategory);
    }

    // For string type subcategory that is an ID or name
    if (product.subCategory && typeof product.subCategory === "string") {
      // If it looks like an ID, get the name
      if (
        product.subCategory.length === 24 &&
        /^[0-9a-fA-F]{24}$/.test(product.subCategory)
      ) {
        return getSubcategoryNameById(product.subCategory);
      }
      // Otherwise return it directly as it might be the actual name
      return product.subCategory;
    }

    return "";
  }

  const products = data?.items || [];
  const totalPages = data?.pages || 1;

  // Check if all pending products are selected
  const allPendingSelected = pendingProducts && pendingProducts.length > 0 && 
    pendingProducts.every((p: Product) => selectedProducts.has(p._id));

  // Toggle all pending products selection
  const toggleAllPendingProducts = () => {
    if (!pendingProducts) return;
    if (allPendingSelected) {
      // Deselect all pending products
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        pendingProducts.forEach((p: Product) => newSet.delete(p._id));
        return newSet;
      });
    } else {
      // Select all pending products
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        pendingProducts.forEach((p: Product) => newSet.add(p._id));
        return newSet;
      });
    }
  };

  // Never show full page loading - always show the UI with loading indicator
  // if (isLoading && !data) return <HeartLoading size="medium" />;

  // Modify the table rows to use these functions correctly
  return (
    <div className="prd-card">
      {isAdmin && pendingProducts && pendingProducts.length > 0 && (
        <div className="pending-products mb-4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 className="text-xl font-bold" style={{ margin: 0 }}>
              Pending Approvals ({pendingProducts.length})
            </h2>
            <button
              onClick={toggleAllPendingProducts}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: allPendingSelected ? "#e8f5e9" : "#f5f5f5",
                border: `1px solid ${allPendingSelected ? "#a5d6a7" : "#ddd"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: allPendingSelected ? "#2e7d32" : "#666",
              }}
            >
              {allPendingSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allPendingSelected 
                ? (language === "en" ? "Deselect All Pending" : "ყველას მოხსნა")
                : (language === "en" ? "Select All Pending" : "ყველას მონიშვნა")}
            </button>
          </div>
          <table className="prd-table">
            <tbody>
              {pendingProducts.map((product: Product) => (
                <tr key={product._id} className="prd-tr">
                  <td className="prd-td" style={{ width: "50px", textAlign: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProductSelection(product._id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selectedProducts.has(product._id) ? (
                        <CheckSquare size={18} color="#2e7d32" />
                      ) : (
                        <Square size={18} color="#6c757d" />
                      )}
                    </button>
                  </td>
                  <td className="prd-td prd-td-bold">
                    {" "}
                    #{product._id ? product._id : "No ID"}
                  </td>
                  <td className="prd-td">
                    <div className="prd-img-wrapper">
                      <Image
                        src={product.images[0]}
                        alt={getDisplayName(product)}
                        fill
                        className="prd-img"
                      />
                    </div>
                  </td>
                  <td className="prd-td">{getDisplayName(product)}</td>
                  <td className="prd-td">{product.price} ₾ </td>

                  <td className="prd-td">
                    {hasActiveDiscount(product) ? (
                      <div className="price-display">
                        <span
                          className="original-price"
                          style={{
                            textDecoration: "line-through",
                            color: "#999",
                            fontSize: "0.9em",
                          }}
                        >
                          {product.price} ₾
                        </span>
                        <br />
                        <span
                          className="discounted-price"
                          style={{ color: "#e74c3c", fontWeight: "bold" }}
                        >
                          {calculateDiscountedPrice(product).toFixed(2)} ₾
                        </span>
                        <span
                          className="discount-badge"
                          style={{
                            backgroundColor: "#e74c3c",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.8em",
                            marginLeft: "8px",
                          }}
                        >
                          -{product.discountPercentage}%
                        </span>
                      </div>
                    ) : (
                      <span>{product.price} ₾</span>
                    )}
                  </td>
                  <td className="prd-td">
                    {product.category && typeof product.category === "object"
                      ? product.category.name
                      : product.category}
                  </td>
                  <td className="prd-td">{product.countInStock}</td>
                  <td className="prd-td">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="prd-td prd-td-right">
                    <ProductsActions
                      product={product}
                      onStatusChange={handleStatusChange}
                      onDelete={handleProductDeleted}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="prd-header">
        <h1 className="prd-title">Products</h1>
        <div className="prd-actions">
          <button
            onClick={() => setShowDonation(true)}
            className="prd-btn-donation"
          >
            <Heart className="prd-icon" />
            დონაცია
          </button>
          <Link href="/admin/products/create">
            <button className="prd-btn-outline">
              <Plus className="prd-icon" />
              Add Product
            </button>
          </Link>
          <Link href="/admin/products/ai">
            <button className="prd-btn">
              <Sparkles className="prd-icon" />
              Create Products with AI
            </button>
          </Link>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div
        className="search-filter-section"
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "20px",
          padding: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          flexWrap: "wrap",
          position: "relative",
        }}
      >
        {/* Loading Indicator */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "rgba(1, 38, 69, 0.05)",
              borderRadius: "20px",
              fontSize: "13px",
              color: "#012645",
              fontWeight: "500",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid rgba(1, 38, 69, 0.2)",
                borderTopColor: "#012645",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            {language === "en" ? "Loading..." : "იტვირთება..."}
          </div>
        )}

        {/* Search Input */}
        <div style={{ flex: "1", minWidth: "250px" }}>
          <div style={{ position: "relative" }}>
            <Search
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color:
                  searchQuery !== debouncedSearchQuery ? "#ffc107" : "#6c757d",
                width: "18px",
                height: "18px",
                transition: "color 0.2s",
              }}
            />
            <input
              type="text"
              placeholder={
                language === "en" ? "Search products..." : "მოძებნე პროდუქტი..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset to first page on search
              }}
              style={{
                width: "100%",
                padding: "10px 12px 10px 40px",
                border: `1px solid ${
                  searchQuery !== debouncedSearchQuery ? "#ffc107" : "#dee2e6"
                }`,
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor =
                  searchQuery !== debouncedSearchQuery ? "#ffc107" : "#012645")
              }
              onBlur={(e) =>
                (e.target.style.borderColor =
                  searchQuery !== debouncedSearchQuery ? "#ffc107" : "#dee2e6")
              }
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color="#6c757d" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: "150px" }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            <option value="all">
              {language === "en" ? "All Status" : "ყველა სტატუსი"}
            </option>
            <option value={ProductStatus.APPROVED}>
              {language === "en" ? "Approved" : "დამტკიცებული"}
            </option>
            <option value={ProductStatus.PENDING}>
              {language === "en" ? "Pending" : "მომლოდინე"}
            </option>
            <option value={ProductStatus.REJECTED}>
              {language === "en" ? "Rejected" : "უარყოფილი"}
            </option>
          </select>
        </div>

        {/* Category Filter */}
        <div style={{ minWidth: "180px" }}>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            <option value="all">
              {language === "en" ? "All Categories" : "ყველა კატეგორია"}
            </option>
            {categoriesData?.map((cat: Category) => (
              <option key={cat._id || cat.id} value={cat._id || cat.id}>
                {language === "en" && cat.nameEn ? cat.nameEn : cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery ||
          statusFilter !== "all" ||
          categoryFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setCategoryFilter("all");
              setPage(1);
              // Clear from sessionStorage as well
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("adminProductsSearch");
                sessionStorage.setItem("adminProductsStatusFilter", "all");
                sessionStorage.setItem("adminProductsCategoryFilter", "all");
                sessionStorage.setItem("adminProductsPage", "1");
              }
            }}
            style={{
              padding: "10px 20px",
              border: "1px solid #dc3545",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "white",
              color: "#dc3545",
              cursor: "pointer",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc3545";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = "#dc3545";
            }}
          >
            <X size={16} />
            {language === "en" ? "Clear Filters" : "გასუფთავება"}
          </button>
        )}
      </div>

      {/* Bulk Actions Bar - Only show when products are selected */}
      {isAdmin && selectedProducts.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            marginBottom: "16px",
            backgroundColor: "#e8f5e9",
            borderRadius: "8px",
            border: "1px solid #a5d6a7",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckSquare size={20} color="#2e7d32" />
            <span style={{ fontWeight: "500", color: "#2e7d32" }}>
              {language === "en" 
                ? `${selectedProducts.size} products selected`
                : `${selectedProducts.size} პროდუქტი მონიშნულია`}
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setSelectedProducts(new Set())}
              style={{
                padding: "8px 16px",
                border: "1px solid #6c757d",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#6c757d",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {language === "en" ? "Clear Selection" : "გასუფთავება"}
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              style={{
                padding: "8px 20px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#2e7d32",
                color: "white",
                cursor: isBulkApproving ? "wait" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: isBulkApproving ? 0.7 : 1,
              }}
            >
              {isBulkApproving ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  {language === "en" ? "Approving..." : "მტკიცდება..."}
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {language === "en" ? "Approve Selected" : "არჩეულის დამტკიცება"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <table className="prd-table">
        <thead>
          <tr className="prd-thead-row">
            {isAdmin && (
              <th className="prd-th" style={{ width: "50px", textAlign: "center" }}>
                <button
                  onClick={selectAllProducts}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={language === "en" ? "Select All" : "ყველას მონიშვნა"}
                >
                  {products.length > 0 && products.every((p: Product) => selectedProducts.has(p._id)) ? (
                    <CheckSquare size={18} color="#2e7d32" />
                  ) : (
                    <Square size={18} color="#6c757d" />
                  )}
                </button>
              </th>
            )}
            <th className="prd-th">ID</th>
            <th className="prd-th">IMAGE</th>
            <th className="prd-th">NAME</th>
            <th className="prd-th">PRICE</th>
            <th className="prd-th">CATEGORY</th>
            <th className="prd-th">SUBCATEGORY</th>
            <th className="prd-th">STOCK</th>
            <th className="prd-th">Status</th>
            {isAdmin && <th className="prd-th">VISIBILITY</th>}
            <th className="prd-th">DELIVERY</th>
            <th className="prd-th">SELLER INFO</th>
            <th className="prd-th prd-th-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && products.length === 0 ? (
            <tr>
              <td
                colSpan={isAdmin ? 13 : 11}
                style={{ textAlign: "center", padding: "40px" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "4px solid rgba(1, 38, 69, 0.2)",
                      borderTopColor: "#012645",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span
                    style={{
                      color: "#012645",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                  >
                    {language === "en"
                      ? "Loading products..."
                      : "პროდუქტები იტვირთება..."}
                  </span>
                </div>
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td
                colSpan={isAdmin ? 13 : 11}
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#6c757d",
                }}
              >
                {language === "en"
                  ? "No products found"
                  : "პროდუქტები ვერ მოიძებნა"}
              </td>
            </tr>
          ) : (
            products.map((product: ProductWithCategories & { user?: User }) => (
              <tr key={product._id} className="prd-tr">
                {isAdmin && (
                  <td className="prd-td" style={{ textAlign: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProductSelection(product._id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selectedProducts.has(product._id) ? (
                        <CheckSquare size={18} color="#2e7d32" />
                      ) : (
                        <Square size={18} color="#6c757d" />
                      )}
                    </button>
                  </td>
                )}
                <td className="prd-td prd-td-bold">
                  {" "}
                  #{product._id ? product._id : "No ID"}
                </td>
                <td className="prd-td">
                  <div className="prd-img-wrapper">
                    <Image
                      src={product.images[0]}
                      alt={getDisplayName(product)}
                      fill
                      className="prd-img"
                    />
                  </div>
                </td>
                <td className="prd-td">{getDisplayName(product)}</td>
                <td className="prd-td">
                  {/* <StatusBadge status={product.status} /> */}
                  {hasActiveDiscount(product) ? (
                    <div className="price-display">
                      <span
                        className="original-price"
                        style={{
                          textDecoration: "line-through",
                          color: "#999",
                          fontSize: "0.9em",
                        }}
                      >
                        {product.price} ₾
                      </span>
                      <br />
                      <span
                        className="discounted-price"
                        style={{ color: "#e74c3c", fontWeight: "bold" }}
                      >
                        {calculateDiscountedPrice(product).toFixed(2)} ₾
                      </span>
                      <span
                        className="discount-badge"
                        style={{
                          backgroundColor: "#e74c3c",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "0.8em",
                          marginLeft: "8px",
                        }}
                      >
                        -{product.discountPercentage}%
                      </span>
                    </div>
                  ) : (
                    <span>{product.price} ₾</span>
                  )}
                </td>
                <td className="prd-td">{getCategoryDisplayName(product)}</td>
                <td className="prd-td">{getSubcategoryDisplayName(product)}</td>
                <td className="prd-td">{product.countInStock}</td>
                <td className="prd-td">
                  <StatusBadge status={product.status} />
                </td>
                {isAdmin && (
                  <td className="prd-td">
                    <button
                      onClick={() =>
                        handleVisibilityToggle(
                          product._id,
                          product.hideFromStore || false
                        )
                      }
                      disabled={togglingVisibility.has(product._id)}
                      className={`visibility-toggle-btn ${
                        product.hideFromStore
                          ? "hidden-from-store"
                          : "visible-in-store"
                      }`}
                      title={
                        product.hideFromStore
                          ? language === "en"
                            ? "Hidden from store - Click to show"
                            : "დამალულია მაღაზიიდან - დააჭირე გამოსაჩენად"
                          : language === "en"
                          ? "Visible in store - Click to hide"
                          : "ჩანს მაღაზიაში - დააჭირე დასამალად"
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: togglingVisibility.has(product._id)
                          ? "wait"
                          : "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s ease",
                        backgroundColor: product.hideFromStore
                          ? "#fee2e2"
                          : "#dcfce7",
                        color: product.hideFromStore ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {togglingVisibility.has(product._id) ? (
                        <span
                          style={{
                            width: "14px",
                            height: "14px",
                            border: "2px solid currentColor",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                      ) : product.hideFromStore ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                      <span>
                        {product.hideFromStore
                          ? language === "en"
                            ? "Hidden"
                            : "დამალული"
                          : language === "en"
                          ? "Visible"
                          : "ხილული"}
                      </span>
                    </button>
                  </td>
                )}
                <td className="prd-td">
                  <div className="delivery-info">
                    <span>{product.deliveryType || "SOULART"}</span>
                    {product.deliveryType === "SELLER" &&
                      product.minDeliveryDays &&
                      product.maxDeliveryDays && (
                        <p className="text-sm text-gray-500">
                          {product.minDeliveryDays}-{product.maxDeliveryDays}{" "}
                          დღე
                        </p>
                      )}
                  </div>
                </td>
                <td className="prd-td">
                  <div className="seller-info">
                    <p className="font-medium">
                      {product.user?.name ||
                        product.user?.storeName ||
                        "უცნობი მოხმარებელი"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.user?.email || "ელ-ფოსტა არ არის მითითებული"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.user?.phoneNumber ||
                        "ტელეფონი არ არის მითითებული"}
                    </p>
                    {product.user?.storeName &&
                      product.user?.storeName !== product.user?.name && (
                        <p className="text-xs text-blue-600">
                          მაღაზია: {product.user.storeName}
                        </p>
                      )}
                  </div>
                </td>
                <td className="prd-td prd-td-right">
                  <ProductsActions
                    product={product}
                    onStatusChange={handleStatusChange}
                    onDelete={handleProductDeleted}
                    materials={
                      language === "en"
                        ? product.materialsEn && product.materialsEn.length > 0
                          ? product.materialsEn
                          : product.materials
                        : product.materials
                    }
                    dimensions={product.dimensions}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {page} of {totalPages}
        </span>
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>

      {/* Add spinner animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <DonationModal
        isOpen={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </div>
  );
}
