"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import "./auction-filters.css";

interface FilterState {
  artworkType: string;
  material: string;
  minPrice: string;
  maxPrice: string;
}

interface AuctionFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const ARTWORK_TYPES = [
  { value: "", label: "ყველა" },
  { value: "ORIGINAL", label: "ორიგინალი" },
  { value: "REPRODUCTION", label: "ასლი" },
];

const MATERIALS = [
  { value: "", label: "ყველა მასალა" },
  { value: "ზეთი", label: "ზეთი" },
  { value: "აკვარელი", label: "აკვარელი" },
  { value: "აკრილი", label: "აკრილი" },
  { value: "გრაფიტი", label: "გრაფიტი" },
  { value: "ფანქარი", label: "ფანქარი" },
  { value: "შერეული", label: "შერეული ტექნიკა" },
];

export default function AuctionFilters({
  filters,
  onFilterChange,
}: AuctionFiltersProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({
      artworkType: "",
      material: "",
      minPrice: "",
      maxPrice: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <div className="auction-filters">
      <div
        className="filters-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="filters-title">
          <Filter size={20} />
          <span>{t("auctions.filters")}</span>
        </div>
        <button className="filters-toggle">{isExpanded ? "−" : "+"}</button>
      </div>

      <div className={`filters-content ${isExpanded ? "expanded" : ""}`}>
        {/* Artwork Type Filter */}
        <div className="filter-group">
          <label className="filter-label">{t("auctions.artworkType")}</label>
          <select
            value={filters.artworkType}
            onChange={(e) => handleFilterChange("artworkType", e.target.value)}
            className="filter-select"
          >
            {ARTWORK_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Material Filter */}
        <div className="filter-group">
          <label className="filter-label">{t("auctions.material")}</label>
          <select
            value={filters.material}
            onChange={(e) => handleFilterChange("material", e.target.value)}
            className="filter-select"
          >
            {MATERIALS.map((material) => (
              <option key={material.value} value={material.value}>
                {material.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div className="filter-group">
          <label className="filter-label">{t("auctions.priceRange")}</label>
          <div className="price-range">
            <input
              type="number"
              placeholder={t("auctions.minPrice")}
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
              className="price-input"
              min="0"
            />
            <span className="price-separator">-</span>
            <input
              type="number"
              placeholder={t("auctions.maxPrice")}
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
              className="price-input"
              min="0"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="clear-filters-btn">
            <X size={16} />
            {t("auctions.clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
