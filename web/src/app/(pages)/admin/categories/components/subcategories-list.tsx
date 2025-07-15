import { useState, useEffect } from "react";
import {
  useSubCategories,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
  useAttributes,
  useAttributesWithTranslations,
  SubCategory,
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
  Category,
} from "../hook/use-categories";
import { Loader } from "lucide-react";
import "./styles/subcategories-list.css";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { useLanguage } from "@/hooks/LanguageContext";

interface SubcategoriesListProps {
  categoryId: string;
}

export const SubcategoriesList = ({ categoryId }: SubcategoriesListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState<
    SubCategoryCreateInput | SubCategoryUpdateInput
  >({
    name: "",
    nameEn: "",
    categoryId: categoryId,
    description: "",
    descriptionEn: "",
    ageGroups: [],
    sizes: [],
    colors: [],
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  const { t, language } = useLanguage();

  const {
    data: subcategories,
    isLoading,
    isError,
    error: queryError,
  } = useSubCategories(categoryId, showInactive);
  const { data: attributes, isLoading: isLoadingAttributes } = useAttributes();
  const { data: attributesWithTranslations } = useAttributesWithTranslations();
  const createSubCategory = useCreateSubCategory();
  const updateSubCategory = useUpdateSubCategory();
  const deleteSubCategory = useDeleteSubCategory();
  useEffect(() => {
    // Clear any previous errors when the categoryId changes
    setError(null);
  }, [categoryId]);
  useEffect(() => {
    if (isError) {
      setError(t("adminCategories.noSubcategoriesFound"));
    } else {
      setError(null);
    }
  }, [isError, queryError, subcategories, categoryId, t]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Validation before submission
    if (!formData.name || !formData.name.trim()) {
      return;
    }

    // Ensure categoryId is explicitly set from the parent category
    const dataToSubmit = {
      ...formData,
      categoryId: categoryId, // Ensure categoryId is explicitly set to the selected category
      name: (formData.name || "").trim(), // Trim whitespace with null check
    };

    try {
      await createSubCategory.mutateAsync(
        dataToSubmit as SubCategoryCreateInput
      );
      setIsCreating(false);
      setFormData({
        name: "",
        nameEn: "",
        categoryId: categoryId, // Keep the current categoryId
        description: "",
        descriptionEn: "",
        ageGroups: [],
        sizes: [],
        colors: [],
        isActive: true,
      });
    } catch {
      setError(t("adminCategories.createError"));
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return; // Validation before submission
    if (!formData.name || !formData.name.trim()) {
      return;
    }

    try {
      // Ensure we're maintaining the category relationship
      const updateData = {
        ...formData,
        categoryId, // Make sure categoryId is always set
        name: (formData.name || "").trim(), // Trim whitespace with null check
      };

      await updateSubCategory.mutateAsync({
        id: isEditing,
        data: updateData as SubCategoryUpdateInput,
      });
      setIsEditing(null);
      setFormData({
        name: "",
        nameEn: "",
        categoryId, // Keep categoryId in the form data
        description: "",
        descriptionEn: "",
        ageGroups: [],
        sizes: [],
        colors: [],
        isActive: true,
      });
    } catch {
      setError(t("adminCategories.updateError"));
    }
  };
  const startEditing = (subcategory: SubCategory) => {
    setIsEditing(subcategory.id);
    setFormData({
      name: subcategory.name,
      nameEn: subcategory.nameEn || "",
      categoryId:
        typeof subcategory.categoryId === "string"
          ? subcategory.categoryId
          : (subcategory.categoryId as Category).id,
      description: subcategory.description || "",
      descriptionEn: subcategory.descriptionEn || "",
      ageGroups: subcategory.ageGroups || [],
      sizes: subcategory.sizes || [],
      colors: subcategory.colors || [],
      isActive: subcategory.isActive,
    });
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm(t("adminCategories.confirmDeleteSubcategory"))) {
      return;
    }
    try {
      await deleteSubCategory.mutateAsync(id);
    } catch {
      setError(t("adminCategories.deleteError"));
    }
  };

  const handleAttributeSelection = (
    type: "ageGroups" | "sizes" | "colors",
    value: string
  ) => {
    const currentValues = formData[type] || [];
    const updatedValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    setFormData({ ...formData, [type]: updatedValues });
  };

  // Add a reload function for better error handling
  const handleReload = () => {
    setError(null);
    window.location.reload();
  };

  const renderAttributeSelections = () => {
    if (!attributes) return null;

    return (
      <div className="attributes-section">
        <h5>{t("adminCategories.attributes")}</h5>

        <div className="attribute-group">
          <h6>{t("adminCategories.ageGroups")}</h6>{" "}
          <div className="attribute-options">
            {attributes.ageGroups.map((ageGroup) => (
              <label key={ageGroup} className="attribute-option">
                <input
                  type="checkbox"
                  checked={(formData.ageGroups || []).includes(ageGroup)}
                  onChange={() =>
                    handleAttributeSelection("ageGroups", ageGroup)
                  }
                />
                {translateAgeGroup(ageGroup)}
              </label>
            ))}
          </div>
        </div>

        <div className="attribute-group">
          <h6>{t("adminCategories.sizes")}</h6>
          <div className="attribute-options">
            {attributes.sizes.map((size) => (
              <label key={size} className="attribute-option">
                <input
                  type="checkbox"
                  checked={(formData.sizes || []).includes(size)}
                  onChange={() => handleAttributeSelection("sizes", size)}
                />
                {size}
              </label>
            ))}
          </div>
        </div>

        <div className="attribute-group">
          <h6>{t("adminCategories.colors")}</h6>{" "}
          <div className="attribute-options">
            {attributes.colors.map((color) => (
              <label key={color} className="attribute-option">
                <input
                  type="checkbox"
                  checked={(formData.colors || []).includes(color)}
                  onChange={() => handleAttributeSelection("colors", color)}
                />
                {translateColor(color)}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Helper function to translate color names
  const translateColor = (colorName: string): string => {
    if (!attributesWithTranslations?.colors) return colorName;

    const colorObj = attributesWithTranslations.colors.find(
      (c) => c.name === colorName
    );
    if (!colorObj) return colorName;

    if (language === "en" && colorObj.nameEn) {
      return colorObj.nameEn;
    }
    return colorObj.name;
  };

  // Helper function to translate age group names
  const translateAgeGroup = (ageGroupName: string): string => {
    if (!attributesWithTranslations?.ageGroups) return ageGroupName;

    const ageGroupObj = attributesWithTranslations.ageGroups.find(
      (ag) => ag.name === ageGroupName
    );
    if (!ageGroupObj) return ageGroupName;

    if (language === "en" && ageGroupObj.nameEn) {
      return ageGroupObj.nameEn;
    }
    return ageGroupObj.name;
  };

  // Helper function to get translated attribute display text
  const getTranslatedAttributes = (
    attributeList: string[],
    translateFn: (name: string) => string
  ): string => {
    return attributeList.map(translateFn).join(", ");
  };

  if (isLoading || isLoadingAttributes) {
    return (
      <div className="loading-container">
        {" "}
        <Loader />
        <div className="loading-text">
          <HeartLoading size="medium" inline={true} />
          <span>{t("adminCategories.loading")}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button className="btn-retry" onClick={handleReload}>
          {t("adminCategories.retry")}
        </button>
      </div>
    );
  }
  return (
    <div className="subcategories-list-container">
      <div className="subcategories-header">
        <h3 className="subcategories-title">
          {t("adminCategories.subcategories")}
        </h3>
        <div className="subcategories-actions">
          <button
            className="btn-add"
            onClick={() => {
              setIsCreating(true);
              setIsEditing(null);
            }}
          >
            + {t("adminCategories.add")}
          </button>
          <label className="show-inactive">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
            />
            {t("adminCategories.showInactive")}
          </label>
        </div>
      </div>

      {isCreating && (
        <div className="subcategory-form-container">
          <h4>{t("adminCategories.addNewSubcategory")}</h4>
          <form onSubmit={handleCreateSubmit} className="subcategory-form">
            {" "}
            <div className="form-group">
              <label htmlFor="name">{t("adminCategories.nameGe")}*</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nameEn">{t("adminCategories.nameEn")}</label>
              <input
                type="text"
                id="nameEn"
                value={formData.nameEn}
                onChange={(e) =>
                  setFormData({ ...formData, nameEn: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">
                {t("adminCategories.descriptionGe")}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="descriptionEn">
                {t("adminCategories.descriptionEn")}
              </label>
              <textarea
                id="descriptionEn"
                value={formData.descriptionEn}
                onChange={(e) =>
                  setFormData({ ...formData, descriptionEn: e.target.value })
                }
              />
            </div>
            {renderAttributeSelections()}
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isActive === true}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                {t("adminCategories.active")}
              </label>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit"
                disabled={createSubCategory.isPending}
              >
                {createSubCategory.isPending
                  ? t("adminCategories.loading")
                  : t("adminCategories.add")}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({
                    name: "",
                    nameEn: "",
                    categoryId,
                    description: "",
                    descriptionEn: "",
                    ageGroups: [],
                    sizes: [],
                    colors: [],
                    isActive: true,
                  });
                }}
              >
                {t("adminCategories.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="subcategories-list">
        {subcategories && subcategories.length > 0 ? (
          subcategories.map((subcategory) => (
            <div
              key={subcategory.id}
              className={`subcategory-item ${
                !subcategory.isActive ? "inactive" : ""
              }`}
            >
              {isEditing === subcategory.id ? (
                <form
                  onSubmit={handleUpdateSubmit}
                  className="subcategory-form"
                >
                  {" "}
                  <div className="form-group">
                    <label htmlFor={`edit-name-${subcategory.id}`}>
                      {t("adminCategories.nameGe")}*
                    </label>
                    <input
                      type="text"
                      id={`edit-name-${subcategory.id}`}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-nameEn-${subcategory.id}`}>
                      {t("adminCategories.nameEn")}
                    </label>
                    <input
                      type="text"
                      id={`edit-nameEn-${subcategory.id}`}
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-description-${subcategory.id}`}>
                      {t("adminCategories.descriptionGe")}
                    </label>{" "}
                    <textarea
                      id={`edit-description-${subcategory.id}`}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-descriptionEn-${subcategory.id}`}>
                      {t("adminCategories.descriptionEn")}
                    </label>
                    <textarea
                      id={`edit-descriptionEn-${subcategory.id}`}
                      value={formData.descriptionEn}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          descriptionEn: e.target.value,
                        })
                      }
                    />
                  </div>
                  {renderAttributeSelections()}
                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.isActive === true}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      {t("adminCategories.active")}
                    </label>
                  </div>
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn-submit"
                      disabled={updateSubCategory.isPending}
                    >
                      {updateSubCategory.isPending ? (
                        <HeartLoading size="medium" inline={true} />
                      ) : (
                        t("adminCategories.update")
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setIsEditing(null);
                        setFormData({
                          name: "",
                          nameEn: "",
                          categoryId,
                          description: "",
                          descriptionEn: "",
                          ageGroups: [],
                          sizes: [],
                          colors: [],
                          isActive: true,
                        });
                      }}
                    >
                      {t("adminCategories.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {" "}
                  <div className="subcategory-header">
                    <h4 className="subcategory-name">
                      {language === "en" && subcategory.nameEn
                        ? subcategory.nameEn
                        : subcategory.name}
                      {language === "ge" && subcategory.nameEn && (
                        <span className="name-en"> ({subcategory.nameEn})</span>
                      )}
                      {!subcategory.isActive && (
                        <span className="inactive-label">
                          {" "}
                          ({t("adminCategories.inactive")})
                        </span>
                      )}
                    </h4>
                    <div className="subcategory-actions">
                      <button
                        className="btn-edit"
                        onClick={() => startEditing(subcategory)}
                      >
                        {t("adminCategories.edit")}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(subcategory.id)}
                      >
                        {t("adminCategories.delete")}
                      </button>
                    </div>
                  </div>{" "}
                  {(subcategory.description || subcategory.descriptionEn) && (
                    <p className="subcategory-description">
                      {language === "en" && subcategory.descriptionEn
                        ? subcategory.descriptionEn
                        : subcategory.description}
                      {language === "ge" &&
                        subcategory.descriptionEn &&
                        subcategory.description && (
                          <span className="description-en">
                            {" "}
                            ({subcategory.descriptionEn})
                          </span>
                        )}
                    </p>
                  )}{" "}
                  <div className="subcategory-attributes">
                    {" "}
                    {subcategory.ageGroups &&
                      subcategory.ageGroups.length > 0 && (
                        <div className="attribute-list">
                          <strong>{t("adminCategories.ageGroups")}:</strong>{" "}
                          {getTranslatedAttributes(
                            subcategory.ageGroups,
                            translateAgeGroup
                          )}
                        </div>
                      )}
                    {subcategory.sizes && subcategory.sizes.length > 0 && (
                      <div className="attribute-list">
                        <strong>{t("adminCategories.sizes")}:</strong>{" "}
                        {subcategory.sizes.join(", ")}
                      </div>
                    )}
                    {subcategory.colors && subcategory.colors.length > 0 && (
                      <div className="attribute-list">
                        <strong>{t("adminCategories.colors")}:</strong>{" "}
                        {getTranslatedAttributes(
                          subcategory.colors,
                          translateColor
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="no-subcategories">
            <p>{t("adminCategories.noSubcategoriesFound")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
// The component now uses the language context to dynamically switch between displaying
// Georgian and English content based on the user's selected language.
// When language is "en", it prioritizes showing nameEn and descriptionEn
// When language is "ge", it shows the Georgian name/description and only shows English in parentheses
