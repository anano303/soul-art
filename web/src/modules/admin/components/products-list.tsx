"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, User, Category, SubCategory } from "@/types";
import { ProductsActions } from "./products-actions";
import { Plus, Sparkles } from "lucide-react";
import "./productList.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useUser } from "@/modules/auth/hooks/use-user";
import { StatusBadge } from "./status-badge";
import { Role } from "@/types/role";
import { useLanguage } from "@/hooks/LanguageContext";
import HeartLoading from "@/components/HeartLoading/HeartLoading";

// Extended Product type to include mainCategory and subCategory properties
interface ProductWithCategories extends Product {
  mainCategory?: { name: string; id?: string; _id?: string } | string;
  subCategory?: { name: string; id?: string; _id?: string } | string;
}

export function ProductsList() {
  const [page, setPage] = useState(1);
  const { user } = useUser();
  const { language } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const isAdmin = user?.role === Role.Admin;

  console.log("ProductsList user check:", {
    user,
    role: user?.role,
    isAdmin,
  });

  const queryClient = useQueryClient();

  // Add refetch capability to the query with a key to force updates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["products", page, refreshKey],
    queryFn: async () => {
      const response = await fetchWithAuth(
        `/products/user?page=${page}&limit=8`
      );
      const result = await response.json();
      return result;
    },
  });

  // Add a function to directly fetch the updated product data after returning from an edit
  const refreshProductData = useCallback(async () => {
    try {
      console.log("Manually refreshing product data...");
      const response = await fetchWithAuth(
        `/products/user?page=${page}&limit=8`
      );
      const freshData = await response.json();
      return freshData;
    } catch (error) {
      console.error("Error refreshing product data:", error);
      return null;
    }
  }, [page]);

  // Check if we just returned from the edit page
  useEffect(() => {
    const returnFromEdit = sessionStorage.getItem("returnFromEdit");
    if (returnFromEdit) {
      // Clear the flag
      sessionStorage.removeItem("returnFromEdit");

      // Force refresh the data with a direct API call
      refreshProductData().then((freshData) => {
        if (freshData) {
          // Manually update the cache with the fresh data
          queryClient.setQueryData(["products", page, refreshKey], freshData);
        }
        // Also trigger a normal refetch as a backup
        setRefreshKey(Date.now());
        refetch();
      });
    }
  }, [refetch, page, queryClient, refreshProductData, refreshKey]);

  const fetchPendingProducts = async () => {
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
    refetch();
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
  });

  const { data: subcategoriesData } = useQuery<SubCategory[]>({
    queryKey: ["all-subcategories", refreshKey], // Add refreshKey to force re-fetch
    queryFn: async () => {
      const response = await fetchWithAuth(
        `/subcategories?includeInactive=false`
      );
      return response.json();
    },
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

  if (isLoading) return <HeartLoading size="medium" />;

  const products = data?.items || [];
  const totalPages = data?.pages || 1;

  // Modify the table rows to use these functions correctly
  return (
    <div className="prd-card">
      {isAdmin && pendingProducts?.length > 0 && (
        <div className="pending-products mb-4">
          <h2 className="text-xl font-bold mb-4">Pending Approvals</h2>
          <table className="prd-table">
            <tbody>
              {pendingProducts.map((product: Product) => (
                <tr key={product._id} className="prd-tr">
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
      <table className="prd-table">
        <thead>
          <tr className="prd-thead-row">
            <th className="prd-th">ID</th>
            <th className="prd-th">IMAGE</th>
            <th className="prd-th">NAME</th>
            <th className="prd-th">PRICE</th>
            <th className="prd-th">CATEGORY</th>
            <th className="prd-th">SUBCATEGORY</th>
            <th className="prd-th">STOCK</th>
            <th className="prd-th">Status</th>
            <th className="prd-th">DELIVERY</th>
            <th className="prd-th">SELLER INFO</th>
            <th className="prd-th prd-th-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product: ProductWithCategories & { user?: User }) => (
            <tr key={product._id} className="prd-tr">
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
              <td className="prd-td">
                <div className="delivery-info">
                  <span>{product.deliveryType || "SOULART"}</span>
                  {product.deliveryType === "SELLER" &&
                    product.minDeliveryDays &&
                    product.maxDeliveryDays && (
                      <p className="text-sm text-gray-500">
                        {product.minDeliveryDays}-{product.maxDeliveryDays} დღე
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
                    {product.user?.phoneNumber || "ტელეფონი არ არის მითითებული"}
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
                />
              </td>
            </tr>
          ))}
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
    </div>
  );
}
