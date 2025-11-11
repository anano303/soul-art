"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import "./homePageShop.css";
import "../../app/(pages)/shop/ShopPage.css";
import "../../app/(pages)/shop/ShopAnimatedIcons.css";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { Category, Product } from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { memoryCache } from "@/lib/cache";
import Image from "next/image";
import { trackSeeMoreClick } from "@/lib/ga4-analytics";
// import { Shirt, ShoppingBag, Footprints } from "lucide-react";

interface CategoryProducts {
  category: string;
  categoryId: string;
  products: Product[];
}

const HomePageShop = () => {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [categoryProducts, setCategoryProducts] = useState<CategoryProducts[]>(
    []
  );

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([]);

  // Fetch all categories first
  const { data: categories = [], refetch } = useQuery<Category[]>({
    queryKey: ["home-categories", language],
    queryFn: async () => {
      try {
        const cacheKey = `home-categories-${language}`;

        // Try cache first
        const cached = memoryCache.get(cacheKey);
        if (cached) {
          return cached;
        }

        const response = await fetchWithAuth(
          "/categories?includeInactive=false"
        );
        const data = await response.json();

        // Cache for 5 minutes (language-specific)
        memoryCache.set(cacheKey, data, 5 * 60 * 1000);
        return data;
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - increased since we have cache
  });

  // Force refetch when language changes
  useEffect(() => {
    refetch();
  }, [language, refetch]);

  // Define a memoized function to get the correct category name based on language
  const getCategoryName = useCallback(
    (category: Category) => {
      return language === "en" && category.nameEn
        ? category.nameEn
        : category.name;
    },
    [language]
  );

  // Function to process categories and products
  const processCategoriesAndProducts = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!categories || categories.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch products - increased to get more products per category
      const response = await getProducts(1, 100);
      const allProducts = response.items || [];

      // Group products by category
      const productsByCategory: CategoryProducts[] = [];

      // Process each category
      for (const category of categories) {
        if (category.id || category._id) {
          const categoryId = category.id || category._id || "";
          // Get the category name based on current language
          const categoryName = getCategoryName(category);

          // Filter products for this category
          const categoryProds = allProducts
            .filter((product) => {
              if (
                typeof product.mainCategory === "object" &&
                product.mainCategory
              ) {
                return (
                  product.mainCategory.id === categoryId ||
                  product.mainCategory._id === categoryId
                );
              }
              if (typeof product.mainCategory === "string") {
                return product.mainCategory === categoryId;
              }
              return false;
            })
            .slice(0, 8);

          // Debug logging
          console.log(
            `Category: ${categoryName}, Products found: ${categoryProds.length}`
          );

          // Only add categories with products
          if (categoryProds.length > 0) {
            productsByCategory.push({
              category: categoryName,
              categoryId: categoryId,
              products: categoryProds,
            });
          }
        }
      }

      setCategoryProducts(productsByCategory);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing categories and products:", error);
      setIsLoading(false);
    }
  }, [categories, getCategoryName]);

  // Process categories and products when categories or getCategoryName changes
  useEffect(() => {
    if (categories && Array.isArray(categories) && categories.length > 0) {
      // When language changes, getCategoryName will change, triggering this effect
      processCategoriesAndProducts();
    }
  }, [categories, getCategoryName, processCategoriesAndProducts]);

  // Direct effect to update category names when language changes
  useEffect(() => {
    // Skip on initial render or if there's no data yet
    if (categoryProducts.length > 0 && categories.length > 0) {
      // Using a reference comparison to avoid unnecessary updates
      const currentCategoryNames = categoryProducts
        .map((cp) => cp.category)
        .join(",");

      // Update category names based on current language
      const updatedCategoryProducts = categoryProducts.map(
        (categoryProduct) => {
          // Find the category
          const category = categories.find(
            (c) =>
              c.id === categoryProduct.categoryId ||
              c._id === categoryProduct.categoryId
          );

          if (category) {
            // Update the category name
            return {
              ...categoryProduct,
              category: getCategoryName(category),
            };
          }
          return categoryProduct;
        }
      );

      // Only update if names actually changed
      const updatedCategoryNames = updatedCategoryProducts
        .map((cp) => cp.category)
        .join(",");
      if (currentCategoryNames !== updatedCategoryNames) {
        setCategoryProducts(updatedCategoryProducts);
      }
    }
  }, [language, getCategoryName, categoryProducts, categories]);

  useEffect(() => {
    // Animation observer
    const observeElements = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("animate-visible");
              // Once animation is triggered, stop observing this element
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );

      // Observe section elements
      sectionRefs.current.forEach((el) => {
        if (el) {
          // Reset animation classes first
          el.classList.remove("animate-visible");
          observer.observe(el);
        }
      });

      // Observe title elements separately for different animation
      titleRefs.current.forEach((el) => {
        if (el) {
          // Reset animation classes first
          el.classList.remove("animate-visible");
          observer.observe(el);
        }
      });

      return observer;
    };

    const observer = observeElements();

    return () => {
      observer.disconnect();
    };
  }, [categoryProducts.length, language]);

  return (
    <div className=" shop-container" key={`shop-container-${language}`}>
      <div className="content">
        {isLoading ? (
          <div className="loading-container">
            <p>{t("shop.loading")}</p>
          </div>
        ) : (
          <div className="product-sections">
            {categoryProducts.length > 0 ? (
              categoryProducts.map((categoryData, index) => (
                <div
                  key={`${categoryData.categoryId}-${language}-${index}`}
                  className="product-section"
                  ref={(el) => {
                    sectionRefs.current[index] = el;
                  }}
                >
                  <div className="section-header">
                    <h2
                      className={`section-title ${
                        categoryData.category === "ხელნაკეთი" ||
                        categoryData.category === "Handmade" ||
                        categoryData.category === "ხელნაკეთი ნივთები" ||
                        categoryData.category === "Handmades"
                          ? "category-handmade"
                          : categoryData.category === "ნახატები" ||
                            categoryData.category === "Paintings"
                          ? "category-paintings"
                          : ""
                      }`}
                      ref={(el) => {
                        titleRefs.current[index] = el;
                      }}
                    >
                      {categoryData.category}
                      {/* ემოჯი ეფექტი */}
                      {(categoryData.category === "ხელნაკეთი ნივთები" ||
                        categoryData.category === "Handmades" ||
                        categoryData.category === "ხელნაკეთი" ||
                        categoryData.category === "Handmade") && (
                        <span className="category-emoji">
                          <Image
                            src="/handmade.png"
                            alt="Handmade"
                            width={30}
                            height={30}
                          />
                        </span>
                      )}
                      {(categoryData.category === "ნახატები" ||
                        categoryData.category === "Paintings") && (
                        <span className="category-emoji">
                          <Image
                            src="/loading.png"
                            alt="Paintings"
                            width={30}
                            height={30}
                          />
                        </span>
                      )}
                    </h2>

                    <div className="see-more-desktop see-more">
                      <Link
                        href={`/shop?page=1&mainCategory=${categoryData.categoryId}`}
                        onClick={() =>
                          trackSeeMoreClick(
                            categoryData.category,
                            categoryData.products.length
                          )
                        }
                      >
                        <button className="see-more-btn">
                          {t("shop.seeAll")}
                        </button>
                      </Link>
                    </div>
                  </div>
                  <ProductGrid
                    products={categoryData.products.slice(0, 8)} // Take first 8 products
                    theme={
                      categoryData.category === "ხელნაკეთი" ||
                      categoryData.category === "Handmade" ||
                      categoryData.category === "ხელნაკეთი ნივთები" ||
                      categoryData.category === "Handmades"
                        ? "handmade-theme"
                        : "default"
                    }
                    isShopPage={false}
                  />
                  <div className="see-more-mobile see-more">
                    <Link
                      href={`/shop?page=1&mainCategory=${categoryData.categoryId}`}
                      onClick={() =>
                        trackSeeMoreClick(
                          categoryData.category,
                          categoryData.products.length
                        )
                      }
                    >
                      <button className="see-more-btn">
                        {t("shop.seeAll")}
                      </button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>{t("shop.emptyDescription")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Remove memo to ensure component re-renders when language changes
export default HomePageShop;
