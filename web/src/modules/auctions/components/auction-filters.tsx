"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import "./auction-filters.css";

interface FilterState {
  artworkType: string;
  material: string;
  dimensions: string;
  minPrice: string;
  maxPrice: string;
}

interface FilterOptions {
  materials: string[];
  dimensions: string[];
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

export default function AuctionFilters({
  filters,
  onFilterChange,
}: AuctionFiltersProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    materials: [],
    dimensions: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch available filter options from active auctions
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await apiClient.get<FilterOptions>("/auctions/filters/options");
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({
      artworkType: "",
      material: "",
      dimensions: "",
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

        {/* Material Filter - Dynamic from active auctions */}
        <div className="filter-group">
          <label className="filter-label">{t("auctions.material") || "მასალა"}</label>
          <select
            value={filters.material}
            onChange={(e) => handleFilterChange("material", e.target.value)}
            className="filter-select"
            disabled={loading}
          >
            <option value="">ყველა მასალა</option>
            {filterOptions.materials.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        </div>

        {/* Dimensions Filter - Dynamic from active auctions */}
        <div className="filter-group">
          <label className="filter-label">{t("auctions.dimensions") || "ზომა"}</label>
          <select
            value={filters.dimensions}
            onChange={(e) => handleFilterChange("dimensions", e.target.value)}
            className="filter-select"
            disabled={loading}
          >
            <option value="">ყველა ზომა</option>
            {filterOptions.dimensions.map((dimension) => (
              <option key={dimension} value={dimension}>
                {dimension}
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
