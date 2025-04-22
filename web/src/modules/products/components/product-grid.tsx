"use client";

import { MainCategory, Product } from "@/types";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";
import { useEffect, useState } from "react";
import { getProducts } from "../api/get-products";
import { getVisiblePages } from "@/lib/utils";
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
  products?: Product[];
  searchKeyword?: string;
  currentPage?: number;
  theme?: "default" | "handmade-theme";
  totalPages?: number;
  onPageChange?: (page: number) => void;
  isShopPage?: boolean; // New prop to distinguish between homepage and shop page
}

export function ProductGrid({
  products: initialProducts,
  searchKeyword,
  currentPage = 1,
  theme = "default",
  totalPages = 1,
  onPageChange,
  isShopPage = false, // Default is false (homepage)
}: ProductGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [pages, setPages] = useState(totalPages);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchKeyword) {
      setIsLoading(true);
      const fetchSearchResults = async () => {
        try {
          const { items, pages: totalPages } = await getProducts(
            currentPage,
            10,
            searchKeyword
          );

          // Convert old products to use the new category structure
          const processedItems = items.map((item) => {
            if (!item.categoryStructure) {
              // Assign a default category structure based on the item's category
              const mainCategory =
                item.category &&
                [
                  "კერამიკა",
                  "ხის ნაკეთობები",
                  "სამკაულები",
                  "ტექსტილი",
                  "მინანქარი",
                  "სკულპტურები",
                  "სხვა",
                ].includes(item.category)
                  ? MainCategory.HANDMADE
                  : MainCategory.PAINTINGS;

              return {
                ...item,
                categoryStructure: {
                  main: mainCategory,
                  sub: item.category,
                },
              };
            }
            return item;
          });

          setProducts(processedItems);
          setPages(totalPages);
        } catch (error) {
          console.error("Failed to search products:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSearchResults();
    } else {
      // Also process initial products if they don't have category structure
      const processedProducts = initialProducts?.map((item) => {
        if (!item.categoryStructure) {
          // Assign a default category structure based on the item's category
          const handmadeCategories = [
            "კერამიკა",
            "ხის ნაკეთობები",
            "სამკაულები",
            "ტექსტილი",
            "მინანქარი",
            "სკულპტურები",
            "სხვა",
          ];
          const isHandmade = handmadeCategories.includes(item.category);

          return {
            ...item,
            categoryStructure: {
              main: isHandmade ? MainCategory.HANDMADE : MainCategory.PAINTINGS,
              sub: item.category,
            },
          };
        }
        return item;
      });

      setProducts(processedProducts);

      // Update pages state if totalPages is provided from props
      if (totalPages > 1) {
        setPages(totalPages);
      }
    }
  }, [searchKeyword, currentPage, initialProducts, totalPages]);

  const renderPagination = () => {
    // Only show pagination if we have more than 1 page and we're on the shop page
    if (totalPages <= 1 || !isShopPage || !onPageChange) return null;

    return (
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          &larr; წინა
        </button>

        <span className="pagination-info">
          {currentPage} / {totalPages}
        </span>

        <button
          className="pagination-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          შემდეგი &rarr;
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

  if (!products?.length) {
    return (
      <div className="no-products">
        <p>No products found</p>
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
            Previous
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
            Next
          </button>
        </div>
      )}
    </div>
  );
}
