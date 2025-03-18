"use client";

import { Product } from "@/types";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";
import { useEffect, useState } from "react";
import { getProducts } from "../api/get-products";
import { getVisiblePages } from "@/lib/utils";
import "./ProductGrid.css";

interface ProductGridProps {
  products?: Product[];
  searchKeyword?: string;
  currentPage?: number;
}

export function ProductGrid({
  products: initialProducts,
  searchKeyword,
  currentPage = 1,
}: ProductGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [pages, setPages] = useState(1);
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
          setProducts(items);
          setPages(totalPages);
        } catch (error) {
          console.error("Failed to search products:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSearchResults();
    } else {
      setProducts(initialProducts);
    }
  }, [searchKeyword, currentPage, initialProducts]);

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
      <div className="grid-container">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {pages > 1 && (
        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() =>
              (window.location.href = searchKeyword
                ? `/search/${searchKeyword}?page=${currentPage - 1}`
                : `/?page=${currentPage - 1}`)
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
                  (window.location.href = searchKeyword
                    ? `/search/${searchKeyword}?page=${pageNum}`
                    : `/?page=${pageNum}`)
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
              (window.location.href = searchKeyword
                ? `/search/${searchKeyword}?page=${currentPage + 1}`
                : `/?page=${currentPage + 1}`)
            }
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
