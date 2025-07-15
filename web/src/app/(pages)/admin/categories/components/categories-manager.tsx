import { useState } from "react";
import { CategoriesList } from "./categories-list";
import { AttributesManager } from "./attributes-manager";
import { useLanguage } from "@/hooks/LanguageContext";
import "./styles/categories-manager.css";

type Tab = "categories" | "attributes";

export const CategoriesManager = () => {
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const { t } = useLanguage();

  return (
    <div className="categories-manager">
      <div className="admin-header">
        <h1 className="admin-title">{t("adminCategories.title")}</h1>
        <div className="tabs">
          <button
            className={`tab-button ${
              activeTab === "categories" ? "active" : ""
            }`}
            onClick={() => setActiveTab("categories")}
          >
            {t("adminCategories.categories")}
          </button>
          <button
            className={`tab-button ${
              activeTab === "attributes" ? "active" : ""
            }`}
            onClick={() => setActiveTab("attributes")}
          >
            {t("adminCategories.attributes")}
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === "categories" && <CategoriesList />}
        {activeTab === "attributes" && <AttributesManager />}
      </div>
    </div>
  );
};
