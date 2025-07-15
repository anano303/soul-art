import { useState, useEffect } from "react";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../hook/use-categories";
import { SubcategoriesList } from "./subcategories-list";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { Loader } from "lucide-react";
import "./styles/categories-list.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";

interface Category {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  isActive: boolean;
}

interface CategoryCreateInput {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  isActive?: boolean;
}

interface CategoryUpdateInput {
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  isActive?: boolean;
}

export const CategoriesList = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<
    CategoryCreateInput | CategoryUpdateInput
  >({
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
    isActive: true,
  });

  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  // Get categories with refetch capability
  const {
    data: categories,
    isLoading,
    refetch,
    isError,
    
  } = useCategories(showInactive);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Refetch categories when component mounts or when showInactive changes
  useEffect(() => {
    console.log("Refetching categories...");
    refetch();
    // Also invalidate the query to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }, [refetch, queryClient, showInactive]);
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory.mutateAsync(formData as CategoryCreateInput);
      setIsCreating(false);
      setFormData({
        name: "",
        nameEn: "",
        description: "",
        descriptionEn: "",
        isActive: true,
      });
    } catch (error) {
      console.error("Create category error:", error);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      try {
        // Only include fields that have changed to minimize the payload
        const updatedFields: CategoryUpdateInput = {};

        // Create a clean update payload with only changed fields
        if (formData.name !== undefined && formData.name.trim() !== "") {
          updatedFields.name = formData.name.trim();
        }

        if (formData.nameEn !== undefined) {
          updatedFields.nameEn = formData.nameEn.trim();
        }

        if (formData.description !== undefined) {
          updatedFields.description = formData.description;
        }

        if (formData.descriptionEn !== undefined) {
          updatedFields.descriptionEn = formData.descriptionEn;
        }

        if (formData.isActive !== undefined) {
          updatedFields.isActive = formData.isActive;
        }

        await updateCategory.mutateAsync({
          id: isEditing,
          data: updatedFields,
        });

        setIsEditing(null);
        setFormData({
          name: "",
          nameEn: "",
          description: "",
          descriptionEn: "",
          isActive: true,
        });
      } catch (error) {
        console.error("Update category error:", error);
      }
    }
  };
  const startEditing = (category: Category) => {
    setIsEditing(category.id);
    setFormData({
      name: category.name,
      nameEn: category.nameEn || "",
      description: category.description || "",
      descriptionEn: category.descriptionEn || "",
      isActive: category.isActive,
    });
  };
  const handleDelete = async (id: string) => {
    if (window.confirm(t("adminCategories.confirmDeleteCategory"))) {
      try {
        await deleteCategory.mutateAsync(id);
        if (selectedCategory === id) {
          setSelectedCategory(null);
        }
      } catch (error) {
        console.error("Delete category error:", error);
      }
    }
  };

  return (
    <div className="categories-container">
      <div className="categories-header">
        <h2 className="categories-title">{t("adminCategories.categories")}</h2>
        <div className="categories-actions">
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
      </div>{" "}
      {isCreating && (
        <div className="category-form-container">
          <h3>{t("adminCategories.addNewCategory")}</h3>
          <form onSubmit={handleCreateSubmit} className="category-form">
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
            </div>{" "}
            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit"
                disabled={createCategory.isPending}
              >
                {createCategory.isPending ? (
                  <HeartLoading size="medium" inline={true} />
                ) : (
                  t("adminCategories.add")
                )}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({
                    name: "",
                    nameEn: "",
                    description: "",
                    descriptionEn: "",
                    isActive: true,
                  });
                }}
              >
                {t("adminCategories.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}{" "}
      {isLoading ? (
        <div className="loading-container">
          <Loader className="animate-spin" />
          <p>{t("adminCategories.loading")}</p>
        </div>
      ) : isError ? (
        <div className="error-container">
          <p>{t("adminCategories.errorLoading")}</p>
          <button onClick={() => refetch()} className="btn-retry">
            {t("adminCategories.retry")}
          </button>
        </div>
      ) : (
        <div className="categories-list">
          {categories && categories.length > 0 ? (
            categories.map((category: Category) => (
              <div
                key={category.id}
                className={`category-item ${
                  !category.isActive ? "inactive" : ""
                }`}
              >
                {isEditing === category.id ? (
                  <form onSubmit={handleUpdateSubmit} className="category-form">
                    <div className="form-group">
                      <label htmlFor={`edit-name-${category.id}`}>
                        {t("adminCategories.nameGe")}*
                      </label>
                      <input
                        type="text"
                        id={`edit-name-${category.id}`}
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`edit-nameEn-${category.id}`}>
                        {t("adminCategories.nameEn")}
                      </label>
                      <input
                        type="text"
                        id={`edit-nameEn-${category.id}`}
                        value={formData.nameEn}
                        onChange={(e) =>
                          setFormData({ ...formData, nameEn: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`edit-description-${category.id}`}>
                        {t("adminCategories.descriptionGe")}
                      </label>
                      <textarea
                        id={`edit-description-${category.id}`}
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
                      <label htmlFor={`edit-descriptionEn-${category.id}`}>
                        {t("adminCategories.descriptionEn")}
                      </label>
                      <textarea
                        id={`edit-descriptionEn-${category.id}`}
                        value={formData.descriptionEn}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            descriptionEn: e.target.value,
                          })
                        }
                      />
                    </div>
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
                    </div>{" "}
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn-submit"
                        disabled={updateCategory.isPending}
                      >
                        {updateCategory.isPending ? (
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
                            description: "",
                            descriptionEn: "",
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
                    <div className="category-header">
                      <h3 className="category-name">
                        {language === "en" && category.nameEn
                          ? category.nameEn
                          : category.name}
                        {language === "ge" && category.nameEn && (
                          <span className="name-en"> ({category.nameEn})</span>
                        )}{" "}
                        {!category.isActive && (
                          <span className="inactive-label">
                            {" "}
                            ({t("adminCategories.inactive")})
                          </span>
                        )}
                      </h3>
                      <div className="category-actions">
                        <button
                          className="btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(category);
                          }}
                        >
                          {t("adminCategories.edit")}
                        </button>
                        <button
                          className="btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(category.id);
                          }}
                        >
                          {t("adminCategories.delete")}
                        </button>
                      </div>
                    </div>{" "}
                    {(category.description || category.descriptionEn) && (
                      <p className="category-description">
                        {language === "en" && category.descriptionEn
                          ? category.descriptionEn
                          : category.description}
                        {language === "ge" &&
                          category.descriptionEn &&
                          category.description && (
                            <span className="description-en">
                              ({category.descriptionEn})
                            </span>
                          )}
                      </p>
                    )}
                    {/* Always show subcategories */}
                    <div className="subcategories-container">
                      <SubcategoriesList categoryId={category.id} />
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="no-categories">
              <p>{t("adminCategories.noCategoriesFound")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// The component now uses the language context to dynamically switch between displaying
// Georgian and English content based on the user's selected language.
// When language is "en", it prioritizes showing nameEn and descriptionEn
// When language is "ge", it shows the Georgian name/description and only shows English in parentheses
