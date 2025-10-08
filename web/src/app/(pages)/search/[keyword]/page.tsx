"use client";

import { Suspense } from "react";
import { ProductGrid } from "@/modules/products/components/product-grid";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams, useSearchParams } from "next/navigation";
import { Product } from "@/types";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { useLanguage } from "@/hooks/LanguageContext";
import "./search-page.css";

interface ProductsResponse {
  items: Product[];
  pages: number;
  totalItems: number;
}

function SearchPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();

  const keyword = (params?.keyword as string) || "";
  const currentPage = Number(searchParams?.get("page")) || 1;

  console.log("Raw keyword from URL:", keyword);
  console.log("URL-decoded keyword:", decodeURIComponent(keyword || ""));

  // Fetch products based on the search keyword
  const { data, isLoading, error } = useQuery<ProductsResponse>({
    queryKey: ["search-products", keyword, currentPage],
    queryFn: async () => {
      const decodedKeyword = decodeURIComponent(keyword || "");

      // Create search query with correct backend parameter
      const searchQuery = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
      });

      // Backend expects 'keyword' parameter for search
      if (decodedKeyword) {
        searchQuery.append("keyword", decodedKeyword);
      }

      console.log("Search URL:", `/products?${searchQuery}`);
      console.log("Search keyword:", decodedKeyword);

      const response = await fetchWithAuth(`/products?${searchQuery}`);
      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.status}`);
      }

      const result = await response.json();
      console.log("Search response:", result);

      return {
        items: result.items || result.products || result || [],
        pages: result.pages || Math.ceil((result.total || 0) / 12) || 1,
        totalItems: result.total || result.totalItems || 0,
      };
    },
    enabled: !!keyword,
  });

  if (isLoading) {
    return (
      <div className="search-page-container">
        <div className="search-content">
          <div className="search-loading">
            <HeartLoading size="large" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Search error:", error);
    return (
      <div className="search-page-container">
        <div className="search-content">
          <div className="search-header">
            <Link href="/shop" className="search-back-button">
              <ArrowLeft className="h-4 w-4" />
              {t("shop.backToHome")}
            </Link>
            <h1 className="search-title">
              {t("shop.searchResults")}:{" "}
              <span className="search-keyword">
                {decodeURIComponent(keyword || "")}
              </span>
            </h1>
          </div>

          <div className="search-error">
            <h2 className="search-error-title">{t("shop.errorTitle")}</h2>
            <p className="search-error-message">{t("shop.errorMessage")}</p>
            <Link href="/shop" className="search-browse-button">
              {t("shop.backToHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasProducts = data?.items && data.items.length > 0;

  console.log("hasProducts:", hasProducts);
  console.log("data?.items:", data?.items);
  console.log("data?.items?.length:", data?.items?.length);

  return (
    <div className="search-page-container">
      <div className="search-content">
        {/* Header Section */}
        <div className="search-header">
          <Link href="/shop" className="search-back-button">
            <ArrowLeft className="h-4 w-4" />
            {t("shop.backToHome")}
          </Link>
          <h1 className="search-title">
            {t("shop.searchResults")}:{" "}
            <span className="search-keyword">
              {decodeURIComponent(keyword || "")}
            </span>
          </h1>
        </div>

        {/* No Results State */}
        {!hasProducts && !isLoading && (
          <div className="search-no-results">
            <h2 className="search-no-results-title">{t("shop.noResults")}</h2>
            <p className="search-no-results-message">
              {t("shop.noResultsMessage")} &ldquo;
              <span className="search-keyword">
                {decodeURIComponent(keyword || "")}
              </span>
              &rdquo;.
              <br />
              {t("shop.tryDifferent")}
            </p>
            <Link href="/shop" className="search-browse-button">
              {t("shop.browseAll")}
            </Link>
          </div>
        )}

        {/* Results Section */}
        {hasProducts && (
          <>
            <div className="search-results-info">
              <p className="search-results-count">
                {language === "en" ? "Found" : "ნაპოვნია"}{" "}
                <span className="highlight">{data.totalItems}</span>{" "}
                {language === "en" ? "products for" : "პროდუქტი"} &ldquo;
                <span className="search-keyword">
                  {decodeURIComponent(keyword || "")}
                </span>
                &rdquo;{language === "en" ? "" : "-ისთვის"}
              </p>
            </div>

            <div className="search-products-container">
              <ProductGrid
                products={data.items}
                searchKeyword={keyword}
                currentPage={currentPage}
                totalPages={data?.pages || 1}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<HeartLoading size="large" />}>
      <SearchPageContent />
    </Suspense>
  );
}
