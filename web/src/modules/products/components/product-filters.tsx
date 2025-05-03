"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import "./product-filters.css";
import { Product, MainCategory } from "@/types";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";

interface FilterProps {
  products: Product[];
  onCategoryChange: (category: string) => void;
  onArtistChange: (artist: string) => void;
  onSortChange?: (sortOption: "asc" | "desc" | "") => void;
  selectedCategory?: string;
  selectedMainCategory?: MainCategory;
  onMainCategoryChange?: (mainCategory: MainCategory) => void;
}

export function ProductFilters({
  products,
  onCategoryChange,
  onArtistChange,
  onSortChange,
  selectedCategory: initialCategory = "all",
  selectedMainCategory: initialMainCategory = MainCategory.PAINTINGS,
  onMainCategoryChange,
}: FilterProps) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedArtist, setSelectedArtist] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [artists, setArtists] = useState<string[]>(["all"]);
  const [filteredArtists, setFilteredArtists] = useState<string[]>(["all"]);
  const [sortOption, setSortOption] = useState<"asc" | "desc" | "">("");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState(initialMainCategory);

  const categoriesByType = {
    [MainCategory.PAINTINGS]: [
      "პეიზაჟი",
      "პორტრეტი",
      "აბსტრაქცია",
      "შავ-თეთრი",
      "ანიმაციური",
      "ციფრული ილუსტრაციები",
      "სხვა",
    ],
    [MainCategory.HANDMADE]: [
      "კერამიკა",
      "ხის ნაკეთობები",
      "სამკაულები",
      "ტექსტილი",
      "მინანქარი",
      "სკულპტურები",
      "სხვა",
    ],
  };

  const categories = ["all", ...categoriesByType[selectedMainCategory]];

  useEffect(() => {
    const uniqueBrands = Array.from(
      new Set(products.map((product) => product.brand))
    )
      .filter(Boolean)
      .sort();

    setArtists(["all", ...uniqueBrands]);
  }, [products]);

  const filterArtists = (search: string) => {
    setSearchTerm(search);
    setIsSearching(search.length > 0);

    if (search) {
      const filtered = artists.filter(
        (artist) =>
          artist !== "all" &&
          artist.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredArtists(filtered);
    } else {
      setFilteredArtists(["all"]);
    }
  };

  const handleArtistChange = useCallback(
    (artist: string) => {
      const newArtist = artist === "all" ? "" : artist;
      setSelectedArtist(artist);
      onArtistChange(newArtist);

      if (selectedCategory !== "all") {
        setSelectedCategory("all");
        onCategoryChange("");
      }
    },
    [selectedCategory, onArtistChange, onCategoryChange]
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      const newCategory = category === "all" ? "" : category;
      setSelectedCategory(category);
      onCategoryChange(newCategory);

      if (selectedArtist !== "all") {
        handleArtistChange("all");
      }
    },
    [selectedArtist, onCategoryChange, handleArtistChange]
  );

  const handleMainCategoryChange = (mainCategory: MainCategory) => {
    setSelectedMainCategory(mainCategory);
    setSelectedCategory("all");
    onCategoryChange("");

    if (onMainCategoryChange) {
      onMainCategoryChange(mainCategory);
    }
  };

  const handleArtistClick = (brand: string) => {
    setSelectedArtist(brand);
    setSearchTerm("");
    setIsSearching(false);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const option = event.target.value as "asc" | "desc" | "";
    setSortOption(option);
    if (onSortChange) {
      onSortChange(option);
    }
  };

  useEffect(() => {
    if (initialCategory !== "all") {
      handleCategoryChange(initialCategory);
    }
  }, [initialCategory, handleCategoryChange]);

  // Determine the theme class based on the selected main category
  const themeClass =
    selectedMainCategory === MainCategory.HANDMADE ? "handmade-theme" : "";

  // Get the appropriate search label based on the selected main category
  const getSearchLabel = () => {
    return selectedMainCategory === MainCategory.PAINTINGS
      ? t("shop.painters")
      : t("shop.authorCompany");
  };

  // Get placeholder text for search input
  const getSearchPlaceholder = () => {
    return selectedMainCategory === MainCategory.PAINTINGS
      ? t("shop.searchPainter")
      : t("shop.searchAuthorCompany");
  };

  return (
    <div className={`filters-container ${themeClass}`}>
      <div className="filter-section">
        <h3 className="filter-title">{t("shop.mainCategory")}</h3>
        <div className="main-category-buttons">
          <button
            className={`main-category-btn paintings ${
              selectedMainCategory === MainCategory.PAINTINGS ? "active" : ""
            }`}
            onClick={() => handleMainCategoryChange(MainCategory.PAINTINGS)}
          >
            {MainCategory.PAINTINGS}
          </button>
          <button
            className={`main-category-btn handmade ${
              selectedMainCategory === MainCategory.HANDMADE ? "active" : ""
            }`}
            onClick={() => handleMainCategoryChange(MainCategory.HANDMADE)}
          >
            {MainCategory.HANDMADE}
          </button>
        </div>
      </div>

      <div className="filter-section">
        <h3 className="filter-title">{t("shop.categories")}</h3>
        <div className="filter-options">
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-btn ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              {category === "all" ? t("shop.allArtworks") : category}
            </button>
          ))}
        </div>
        {selectedCategory !== "all" && (
          <div className="selected-filter">
            <button
              className="clear-filter"
              onClick={() => handleCategoryChange("all")}
            >
              × {selectedCategory}
            </button>
          </div>
        )}
      </div>

      <div className="filter-section">
        {/* Dynamic title based on selected main category */}
        <h3 className="filter-title">{getSearchLabel()}</h3>
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchTerm}
            onChange={(e) => filterArtists(e.target.value)}
            onFocus={() => setIsSearching(true)}
            className="search-input"
          />
        </div>
        {(isSearching || selectedArtist !== "all") && (
          <div className="filter-options scrollable">
            {(searchTerm ? filteredArtists : artists).map(
              (brand) =>
                brand !== "all" && (
                  <Link
                    key={brand}
                    href={`/shop?brand=${encodeURIComponent(brand)}`}
                    className={`filter-btn ${
                      selectedArtist === brand ? "active" : ""
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleArtistClick(brand);
                    }}
                  >
                    {brand}
                  </Link>
                )
            )}
          </div>
        )}
        {selectedArtist !== "all" && (
          <div className="selected-filter">
            <button
              className="clear-filter"
              onClick={() => {
                handleArtistChange("all");
                setSearchTerm("");
                setIsSearching(false);
              }}
            >
              × {selectedArtist}
            </button>
          </div>
        )}
      </div>

      {/* Sort dropdown as normal flow element with inline layout */}
      <div className="filter-section sort-section">
        <h3 className="filter-title sort-title">{t("shop.sort")}</h3>
        <div className="sort-dropdown inline">
          <select
            className="sort-dropdown-select inline"
            value={sortOption}
            onChange={handleSortChange}
            title={t("shop.sort")}
          >
            <option value={undefined}>{t("shop.defaultSort")}</option>
            <option value="asc">{t("shop.priceLowToHigh")}</option>
            <option value="desc">{t("shop.priceHighToLow")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
