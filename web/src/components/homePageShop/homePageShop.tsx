"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./homePageShop.css";
import "../../app/(pages)/shop/ShopPage.css";
import "../../app/(pages)/shop/ShopAnimatedIcons.css";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getProducts } from "@/modules/products/api/get-products";
import { Product, MainCategory } from "@/types";
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
  const [paintingsProducts, setPaintingsProducts] = useState<Product[]>([]);
  const [handmadeProducts, setHandmadeProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

        // Split products into two categories
        const paintings = processedItems
          .filter((product) => {
            const productMain = product.categoryStructure?.main
              ?.toString()
              ?.toLowerCase();
            return productMain === MainCategory.PAINTINGS.toLowerCase();
          })
          .slice(0, 6);

        const handmade = processedItems
          .filter((product) => {
            const productMain = product.categoryStructure?.main
              ?.toString()
              ?.toLowerCase();
            return productMain === MainCategory.HANDMADE.toLowerCase();
          })
          .slice(0, 6);

        setPaintingsProducts(paintings);
        setHandmadeProducts(handmade);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const renderAnimatedIcons = () => {
    return (
      <div className="shop-animated-icons">
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
  };

  return (
    <div className="container shop-container">
      {renderAnimatedIcons()}

      <div className="content">
        <h1
          className="title"
          style={{ marginBottom: 40, marginTop: 70, zIndex: 9 }}
        >
          {t("shop.allArtworks")}
        </h1>

        {isLoading ? (
          <div className="loading-container">
            <p>{t("shop.loading")}</p>
          </div>
        ) : (
          <div className="product-sections">
            {/* Paintings Section */}
            <div className="product-section">
              <h2 className="section-title">{t("categories.paintings")}</h2>
              <ProductGrid
                products={paintingsProducts}
                theme="default"
                isShopPage={false}
              />
              <div className="see-more">
                <Link href={`/shop?page=1&mainCategory=PAINTINGS`}>
                  <button className="see-more-btn">{t("shop.seeAll")}</button>
                </Link>
              </div>
            </div>

            {/* Handmade Section */}
            <div className="product-section">
              <h2 className="section-title">{t("categories.handmade")}</h2>
              <ProductGrid
                products={handmadeProducts}
                theme="handmade-theme"
                isShopPage={false}
              />
              <div className="see-more">
                <Link href={`/shop?page=1&mainCategory=HANDMADE`}>
                  <button className="see-more-btn">{t("shop.seeAll")}</button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
