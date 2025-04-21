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
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<MainCategory>(MainCategory.PAINTINGS);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { items } = await getProducts(1, 6);
        console.log("Fetched products:", items);

        // Ensure all products have categoryStructure
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
        setFilteredProducts(processedItems);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    console.log("Filtering products with mainCategory:", selectedMainCategory);
    console.log("Products before filtering:", products);

    // Filter by main category first - improved handling
    filtered = filtered.filter((product) => {
      // Normalize main category values for comparison
      const productMain = product.categoryStructure?.main
        ?.toString()
        ?.toLowerCase();
      const selectedMain = selectedMainCategory?.toString()?.toLowerCase();

      console.log(`Product ${product._id} - ${product.name}:`, {
        productMain,
        selectedMain,
        hasStructure: !!product.categoryStructure,
        match: productMain === selectedMain,
      });

      // Handle legacy products without categoryStructure
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

    if (sortOption === "lowToHigh") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "highToLow") {
      filtered.sort((a, b) => b.price - a.price);
    }

    console.log("Filtering results:", {
      total: products.length,
      filtered: filtered.length,
      category: selectedCategory,
      artist: selectedArtist,
      sortOption: sortOption,
      mainCategory: selectedMainCategory,
      filteredProducts: filtered,
    });

    setFilteredProducts(filtered);
  }, [
    selectedCategory,
    selectedMainCategory,
    selectedArtist,
    sortOption,
    products,
  ]);

  const handleSortChange = (option: string) => {
    setSortOption(option);
  };

  const handleMainCategoryChange = (mainCategory: MainCategory) => {
    setSelectedMainCategory(mainCategory);
  };

  // Render animated icons based on theme
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
      {/* Add animated icons */}
      {renderAnimatedIcons()}

      <div className="content">
        <h1
          className="title"
          style={{ marginBottom: -40, marginTop: 70, zIndex: 9 }}
        >
          ნამუშევრები{" "}
        </h1>

        <ProductFilters
          products={products}
          onCategoryChange={setSelectedCategory}
          onArtistChange={setSelectedArtist}
          onSortChange={handleSortChange}
          selectedMainCategory={selectedMainCategory}
          onMainCategoryChange={handleMainCategoryChange}
        />
        <ProductGrid
          products={filteredProducts}
          theme={
            selectedMainCategory === MainCategory.HANDMADE
              ? "handmade-theme"
              : "default"
          }
        />

        <div className="see-more">
          <Link
            href={`/shop?mainCategory=${selectedMainCategory}${
              selectedCategory !== "all" && selectedCategory
                ? `&category=${encodeURIComponent(selectedCategory)}`
                : ""
            }`}
          >
            <button className="see-more-btn">ნახეთ ყველა...</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
