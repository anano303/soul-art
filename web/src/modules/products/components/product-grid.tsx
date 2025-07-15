"use client";

import { Product, Category, SubCategory } from "@/types";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";
import { useEffect, useState } from "react";
import { getProducts } from "../api/get-products";
import { getVisiblePages } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import "./ProductGrid.css";

const paginationStyles = `
  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }
  
  .pagination-button {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    color: #212529;
    padding: 0.5rem 1rem;
    margin: 0 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .pagination-button:hover {
    background: #e9ecef;
  }
  
  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-info {
    margin: 0 1rem;
    display: flex;
    align-items: center;
    color: #6c757d;
  }
`;

interface ProductGridProps {
  products: Product[];
  searchKeyword?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  theme?: "default";
  isShopPage?: boolean;
  selectedAgeGroup?: string;
}

export function ProductGrid({
  products: initialProducts,
  searchKeyword,
  currentPage = 1,
  theme = "default",
  totalPages = 1,
  onPageChange,
  isShopPage = false,
  selectedAgeGroup,
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [pages, setPages] = useState(totalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  // Fetch categories and subcategories for reference
  useQuery<Category[]>({
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

  useQuery<SubCategory[]>({
    queryKey: ["all-subcategories"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/subcategories?includeInactive=false"
        );
        return response.json();
      } catch (err) {
        console.error("Failed to fetch subcategories:", err);
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // For search page, don't fetch again - just use the provided products
    if (searchKeyword && initialProducts) {
      setProducts(initialProducts);
      setPages(totalPages);
      setIsLoading(false);
      return;
    }

    if (searchKeyword && !initialProducts) {
      setIsLoading(true);
      setError(null);

      const fetchSearchResults = async () => {
        try {
          const { items = [], pages: totalPages } = await getProducts(
            currentPage,
            10,
            searchKeyword ? { keyword: searchKeyword } : undefined
          );

          if (!items || items.length === 0) {
            setProducts([]);
            setPages(1);
            setIsLoading(false);
            return;
          }

          setProducts(items);
          setPages(totalPages);
        } catch (error) {
          console.error("Failed to search products:", error);
          setError("Failed to load products. Please try again later.");
          setProducts([]);
          setPages(1);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSearchResults();
    } else if (initialProducts) {
      // Simply use initial products without any processing
      setProducts(initialProducts);
      setPages(totalPages);
    }
  }, [
    searchKeyword,
    currentPage,
    initialProducts,
    totalPages,
    selectedAgeGroup,
  ]);

  const renderPagination = () => {
    if (totalPages <= 1 || !isShopPage || !onPageChange) return null;

    return (
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          &larr; {language === "en" ? "Previous" : "წინა"}
        </button>

        <span className="pagination-info">
          {currentPage} / {totalPages}
        </span>

        <button
          className="pagination-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          {language === "en" ? "Next" : "შემდეგი"} &rarr;
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="product-grid">
        <div className="grid-container">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          {language === "en" ? "Try Again" : "სცადეთ თავიდან"}
        </button>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="no-products">
        <p>
          {language === "en" ? "No products found" : "პროდუქტები ვერ მოიძებნა"}
        </p>
        <p>Debug info: products array length = {products?.length || 0}</p>
      </div>
    );
  }

  const visiblePages = getVisiblePages(currentPage, pages);

  return (
    <div className="product-grid">
      <style jsx>{paginationStyles}</style>
      <div className="grid-container">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} theme={theme} />
        ))}
      </div>

      {renderPagination()}

      {pages > 1 && !isShopPage && searchKeyword && (
        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() =>
              (window.location.href = `/search/${searchKeyword}?page=${
                currentPage - 1
              }`)
            }
          >
            {language === "en" ? "Previous" : "წინა"}
          </button>

          {visiblePages.map((pageNum, idx) =>
            pageNum === null ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                className={`pagination-btn ${
                  currentPage === pageNum ? "active" : ""
                }`}
                onClick={() =>
                  (window.location.href = `/search/${searchKeyword}?page=${pageNum}`)
                }
              >
                {pageNum}
              </button>
            )
          )}

          <button
            className="pagination-btn"
            disabled={currentPage >= pages}
            onClick={() =>
              (window.location.href = `/search/${searchKeyword}?page=${
                currentPage + 1
              }`)
            }
          >
            {language === "en" ? "Next" : "შემდეგი"}
          </button>
        </div>
      )}
    </div>
  );
}
