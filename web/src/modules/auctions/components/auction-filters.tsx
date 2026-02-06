"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
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
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    materials: [],
    dimensions: [],
  });
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Fetch available filter options from active auctions
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await apiClient.get<FilterOptions>(
          "/auctions/filters/options",
        );
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
    setOpenDropdown(null);
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

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <div className="auction-filters-dropdown">
      <div className="filters-row">
        {/* Artwork Type Dropdown */}
        <div
          className="filter-dropdown-container"
          ref={(el) => {
            dropdownRefs.current["artworkType"] = el;
          }}
        >
          <button
            className={`filter-dropdown-btn ${filters.artworkType ? "has-value" : ""}`}
            onClick={() => toggleDropdown("artworkType")}
          >
            <span className="filter-label">
              {t("auctions.artworkType") || "ტიპი"}
            </span>
            <span className="filter-value">
              {filters.artworkType
                ? ARTWORK_TYPES.find((t) => t.value === filters.artworkType)
                    ?.label
                : "ყველა"}
            </span>
            <ChevronDown
              size={16}
              className={`dropdown-arrow ${openDropdown === "artworkType" ? "open" : ""}`}
            />
          </button>
          {openDropdown === "artworkType" && (
            <div className="filter-dropdown-menu">
              {ARTWORK_TYPES.map((type) => (
                <button
                  key={type.value}
                  className={`dropdown-item ${filters.artworkType === type.value ? "active" : ""}`}
                  onClick={() => handleFilterChange("artworkType", type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Material Dropdown */}
        <div
          className="filter-dropdown-container"
          ref={(el) => {
            dropdownRefs.current["material"] = el;
          }}
        >
          <button
            className={`filter-dropdown-btn ${filters.material ? "has-value" : ""}`}
            onClick={() => toggleDropdown("material")}
            disabled={loading}
          >
            <span className="filter-label">
              {t("auctions.material") || "მასალა"}
            </span>
            <span className="filter-value">{filters.material || "ყველა"}</span>
            <ChevronDown
              size={16}
              className={`dropdown-arrow ${openDropdown === "material" ? "open" : ""}`}
            />
          </button>
          {openDropdown === "material" && (
            <div className="filter-dropdown-menu">
              <button
                className={`dropdown-item ${!filters.material ? "active" : ""}`}
                onClick={() => handleFilterChange("material", "")}
              >
                ყველა მასალა
              </button>
              {filterOptions.materials.map((material) => (
                <button
                  key={material}
                  className={`dropdown-item ${filters.material === material ? "active" : ""}`}
                  onClick={() => handleFilterChange("material", material)}
                >
                  {material}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dimensions Dropdown */}
        <div
          className="filter-dropdown-container"
          ref={(el) => {
            dropdownRefs.current["dimensions"] = el;
          }}
        >
          <button
            className={`filter-dropdown-btn ${filters.dimensions ? "has-value" : ""}`}
            onClick={() => toggleDropdown("dimensions")}
            disabled={loading}
          >
            <span className="filter-label">
              {t("auctions.dimensions") || "ზომა"}
            </span>
            <span className="filter-value">
              {filters.dimensions || "ყველა"}
            </span>
            <ChevronDown
              size={16}
              className={`dropdown-arrow ${openDropdown === "dimensions" ? "open" : ""}`}
            />
          </button>
          {openDropdown === "dimensions" && (
            <div className="filter-dropdown-menu">
              <button
                className={`dropdown-item ${!filters.dimensions ? "active" : ""}`}
                onClick={() => handleFilterChange("dimensions", "")}
              >
                ყველა ზომა
              </button>
              {filterOptions.dimensions.map((dimension) => (
                <button
                  key={dimension}
                  className={`dropdown-item ${filters.dimensions === dimension ? "active" : ""}`}
                  onClick={() => handleFilterChange("dimensions", dimension)}
                >
                  {dimension}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearAllFilters}>
            <X size={16} />
            <span>{t("auctions.clearFilters") || "გასუფთავება"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
