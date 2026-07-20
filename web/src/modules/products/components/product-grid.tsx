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
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 2rem;
  }

  .pagination-button {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    color: #212529;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    white-space: nowrap;
  }

  .pagination-button:hover:not(:disabled) {
    background: #e9ecef;
  }

  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-numbers {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .pagination-number {
    min-width: 40px;
    height: 40px;
    padding: 0 0.5rem;
    border: 1px solid #dee2e6;
    background: #fff;
    color: #012645;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    transition: all 0.2s;
  }
  .pagination-number:hover {
    background: rgba(1, 38, 69, 0.06);
    border-color: rgba(1, 38, 69, 0.35);
  }
  .pagination-number.active {
    background: #012645;
    border-color: #012645;
    color: #fff;
  }
  .pagination-dots {
    padding: 0 0.35rem;
    color: #6c757d;
    align-self: center;
  }

  @media (max-width: 480px) {
    .pagination-button { padding: 0.5rem 0.7rem; font-size: 0.85rem; }
    .pagination-number { min-width: 36px; height: 36px; }
  }
`;

interface ProductGridProps {
  products: Product[];
  searchKeyword?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  theme?: "default" | "handmade-theme";
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

    // Windowed page list: 1 … (cur-1) cur (cur+1) … last
    const delta = 1;
    const list: (number | "dots")[] = [1];
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);
    if (start > 2) list.push("dots");
    for (let i = start; i <= end; i++) list.push(i);
    if (end < totalPages - 1) list.push("dots");
    if (totalPages > 1) list.push(totalPages);

    return (
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={language === "en" ? "Previous page" : "წინა გვერდი"}
        >
          &larr; {language === "en" ? "Previous" : "წინა"}
        </button>

        <div className="pagination-numbers">
          {list.map((p, i) =>
            p === "dots" ? (
              <span key={`dots-${i}`} className="pagination-dots">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`pagination-number ${
                  p === currentPage ? "active" : ""
                }`}
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          className="pagination-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={language === "en" ? "Next page" : "შემდეგი გვერდი"}
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
