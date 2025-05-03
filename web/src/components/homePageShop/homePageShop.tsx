"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./homePageShop.css";
import "../../app/(pages)/shop/ShopPage.css";
import "../../app/(pages)/shop/ShopAnimatedIcons.css";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, MainCategory } from "@/types";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { useLanguage } from "@/hooks/LanguageContext";
import {
  Paintbrush,
  Palette,
  Printer,
  Square,
  Scissors,
  CakeSlice,
  Hammer,
  Gem,
} from "lucide-react";

export default function HomePageShop() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<MainCategory>(MainCategory.PAINTINGS);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const { items } = await getProducts(1, 18);
        console.log("Fetched products:", items);

        const processedItems = items.map((item) => {
          if (!item.categoryStructure) {
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
                main: isHandmade
                  ? MainCategory.HANDMADE
                  : MainCategory.PAINTINGS,
                sub: item.category,
              },
            };
          }
          return item;
        });

        setProducts(processedItems);

        const initialFiltered = processedItems.filter((product) => {
          const productMain = product.categoryStructure?.main
            ?.toString()
            ?.toLowerCase();
          const selectedMain = selectedMainCategory?.toString()?.toLowerCase();

          if (!productMain) {
            const handmadeCategories = [
              "კერამიკა",
              "ხის ნაკეთობები",
              "სამკაულები",
              "ტექსტილი",
              "მინანქარი",
              "სკულპტურები",
              "სხვა",
            ];
            const isHandmade = handmadeCategories.includes(product.category);
            return (
              (isHandmade && selectedMain === "handmade") ||
              (!isHandmade && selectedMain === "paintings")
            );
          }

          return productMain === selectedMain;
        });

        setFilteredProducts(initialFiltered.slice(0, 6));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [selectedMainCategory]);

  useEffect(() => {
    if (products.length === 0 || isLoading) return;

    let filtered = [...products];

    console.log("Filtering products with mainCategory:", selectedMainCategory);
    console.log("Products before filtering:", products.length);

    filtered = filtered.filter((product) => {
      const productMain = product.categoryStructure?.main
        ?.toString()
        ?.toLowerCase();
      const selectedMain = selectedMainCategory?.toString()?.toLowerCase();

      if (!productMain) {
        const handmadeCategories = [
          "კერამიკა",
          "ხის ნაკეთობები",
          "სამკაულები",
          "ტექსტილი",
          "მინანქარი",
          "სკულპტურები",
          "სხვა",
        ];
        const isHandmade = handmadeCategories.includes(product.category);
        return (
          (isHandmade && selectedMain === "handmade") ||
          (!isHandmade && selectedMain === "paintings")
        );
      }

      return productMain === selectedMain;
    });

    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    if (selectedArtist) {
      filtered = filtered.filter(
        (product) =>
          product.brand &&
          product.brand.toLowerCase() === selectedArtist.toLowerCase()
      );
    }

    if (sortOption === "asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "desc") {
      filtered.sort((a, b) => b.price - a.price);
    }

    console.log("Filtering results:", {
      total: products.length,
      filtered: filtered.length,
      category: selectedCategory,
      artist: selectedArtist,
      sortOption: sortOption,
      mainCategory: selectedMainCategory,
    });

    setFilteredProducts(filtered.slice(0, 6));
  }, [
    selectedCategory,
    selectedArtist,
    sortOption,
    products,
    isLoading,
    selectedMainCategory,
  ]);

  const handleSortChange = (option: string) => {
    setSortOption(option);
  };

  const handleMainCategoryChange = (mainCategory: MainCategory) => {
    setSelectedMainCategory(mainCategory);
  };

  const renderAnimatedIcons = () => {
    if (selectedMainCategory === MainCategory.HANDMADE) {
      return (
        <div className="shop-animated-icons handmade-theme">
          <div className="icon pottery-icon">
            <CakeSlice />
          </div>
          <div className="icon wood-icon">
            <Hammer />
          </div>
          <div className="icon jewelry-icon">
            <Gem />
          </div>
          <div className="icon textile-icon">
            <Scissors />
          </div>
        </div>
      );
    } else {
      return (
        <div className="shop-animated-icons default">
          <div className="icon brush-icon">
            <Paintbrush />
          </div>
          <div className="icon palette-icon">
            <Palette />
          </div>
          <div className="icon canvas-icon">
            <Square />
          </div>
          <div className="icon frame-icon">
            <Printer />
          </div>
        </div>
      );
    }
  };

  return (
    <div
      className={`container shop-container ${
        selectedMainCategory === MainCategory.HANDMADE
          ? "handmade-theme"
          : "default"
      }`}
    >
      {renderAnimatedIcons()}

      <div className="content">
        <h1
          className="title"
          style={{ marginBottom: -40, marginTop: 70, zIndex: 9 }}
        >
          {t("shop.allArtworks")}{" "}
        </h1>

        <ProductFilters
          products={products}
          onCategoryChange={setSelectedCategory}
          onArtistChange={setSelectedArtist}
          onSortChange={handleSortChange}
          selectedMainCategory={selectedMainCategory}
          onMainCategoryChange={handleMainCategoryChange}
        />

        {isLoading ? (
          <div className="loading-container">
            <p>{t("shop.loading")}</p>
          </div>
        ) : (
          <>
            <ProductGrid
              products={filteredProducts}
              theme={
                selectedMainCategory === MainCategory.HANDMADE
                  ? "handmade-theme"
                  : "default"
              }
              isShopPage={false}
            />

            <div className="see-more">
              <Link href={`/shop?page=1&mainCategory=${selectedMainCategory}`}>
                <button className="see-more-btn">{t("shop.seeAll")}</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
