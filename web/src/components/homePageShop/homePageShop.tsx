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
    [],
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
          "/categories?includeInactive=false",
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
    [language],
  );

  // Function to process categories and products
  const processCategoriesAndProducts = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!categories || categories.length === 0) {
        setIsLoading(false);
        return;
      }

      const cacheKey = `home-category-products-${language}`;
      const cached = memoryCache.get<CategoryProducts[]>(cacheKey);
      if (cached) {
        setCategoryProducts(cached);
        setIsLoading(false);
        return;
      }

      // Fetch products per category in parallel (8 per category instead of 300 total)
      const fetchPromises = categories
        .filter((cat) => cat.id || cat._id)
        .map(async (category) => {
          const categoryId = category.id || category._id || "";
          const categoryName = getCategoryName(category);

          try {
            const { items = [] } = await getProducts(1, 12, {
              mainCategory: categoryId,
              excludeOutOfStock: "true",
              includeVariants: "true",
              sortBy: "createdAt",
              sortDirection: "desc",
            });

            const categoryProds = items
              .filter(
                (p) =>
                  (p.countInStock ?? 0) > 0 ||
                  (p.variants &&
                    p.variants.some((v) => (v.stock ?? 0) > 0))
              )
              .slice(0, 8);

            if (categoryProds.length > 0) {
              return {
                category: categoryName,
                categoryId,
                products: categoryProds,
              };
            }
          } catch (err) {
            console.error(`Error fetching products for ${categoryName}:`, err);
          }
          return null;
        });

      const results = await Promise.all(fetchPromises);
      const productsByCategory = results.filter(
        (r): r is CategoryProducts => r !== null
      );

      // Cache for 5 minutes
      memoryCache.set(cacheKey, productsByCategory, 5 * 60 * 1000);
      setCategoryProducts(productsByCategory);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing categories and products:", error);
      setIsLoading(false);
    }
  }, [categories, getCategoryName, language]);

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
      // Update category names based on current language without refetching
      const updatedCategoryProducts = categoryProducts.map(
        (categoryProduct) => {
          const category = categories.find(
            (c) =>
              c.id === categoryProduct.categoryId ||
              c._id === categoryProduct.categoryId,
          );

          if (category) {
            const newName = getCategoryName(category);
            if (newName !== categoryProduct.category) {
              return { ...categoryProduct, category: newName };
            }
          }
          return categoryProduct;
        },
      );

      // Only update state if something actually changed
      const changed = updatedCategoryProducts.some(
        (cp, i) => cp.category !== categoryProducts[i].category,
      );
      if (changed) {
        setCategoryProducts(updatedCategoryProducts);
      }
    }
  }, [language, getCategoryName, categories]);

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
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
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
                            categoryData.products.length,
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
                          categoryData.products.length,
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
