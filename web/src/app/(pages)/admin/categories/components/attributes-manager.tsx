import { useState } from "react";
import {
  useColors,
  useSizes,
  useAgeGroups,
  useCreateColor,
  useUpdateColor,
  useDeleteColor,
  useCreateSize,
  useUpdateSize,
  useDeleteSize,
  useCreateAgeGroup,
  useUpdateAgeGroup,
  useDeleteAgeGroup,
  AttributeInput,
  Color,
  AgeGroupItem,
} from "../hook/use-categories";
import { Loader } from "lucide-react";
import "./styles/attributes-manager.css";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { useLanguage } from "@/hooks/LanguageContext";

type AttributeType = "color" | "size" | "ageGroup";

interface AttributeInputExtended extends AttributeInput {
  value?: string;
  nameEn?: string;
}

export const AttributesManager = () => {
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<AttributeType>("color");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputValueEn, setInputValueEn] = useState("");
  // Colors
  const { data: colors, isLoading: isLoadingColors } = useColors();

  const createColor = useCreateColor();
  const updateColor = useUpdateColor();
  const deleteColor = useDeleteColor();

  // Sizes
  const { data: sizes, isLoading: isLoadingSizes } = useSizes();
  const createSize = useCreateSize();
  const updateSize = useUpdateSize();
  const deleteSize = useDeleteSize();

  // Age Groups
  const { data: ageGroups, isLoading: isLoadingAgeGroups } = useAgeGroups();
  const createAgeGroup = useCreateAgeGroup();
  const updateAgeGroup = useUpdateAgeGroup();
  const deleteAgeGroup = useDeleteAgeGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Include English translation for colors and age groups
    const data: AttributeInputExtended = {
      value: inputValue.trim(),
      ...((activeTab === "color" || activeTab === "ageGroup") &&
      inputValueEn.trim()
        ? { nameEn: inputValueEn.trim() }
        : {}),
    };

    try {
      if (isEditing) {
        // Update existing attribute
        if (activeTab === "color") {
          await updateColor.mutateAsync({ color: isEditing, data });
        } else if (activeTab === "size") {
          await updateSize.mutateAsync({ size: isEditing, data });
        } else if (activeTab === "ageGroup") {
          await updateAgeGroup.mutateAsync({ ageGroup: isEditing, data });
        }
        setIsEditing(null);
      } else {
        // Create new attribute
        if (activeTab === "color") {
          await createColor.mutateAsync(data);
        } else if (activeTab === "size") {
          await createSize.mutateAsync(data);
        } else if (activeTab === "ageGroup") {
          await createAgeGroup.mutateAsync(data);
        }
        setIsAdding(false);
      }

      setInputValue("");
      setInputValueEn("");
    } catch (error) {
      console.error("Error submitting attribute:", error);
    }
  };
  const startEditing = (value: string, nameEn?: string) => {
    setIsAdding(false);
    setIsEditing(value);
    setInputValue(value);
    setInputValueEn(nameEn || "");
  };
  const handleDelete = async (value: string) => {
    if (!window.confirm(t("adminCategories.confirmDelete"))) return;

    try {
      if (activeTab === "color") {
        await deleteColor.mutateAsync(value);
      } else if (activeTab === "size") {
        await deleteSize.mutateAsync(value);
      } else if (activeTab === "ageGroup") {
        await deleteAgeGroup.mutateAsync(value);
      }
    } catch (error) {
      console.error("Error deleting attribute:", error);
    }
  };

  const isLoading = isLoadingColors || isLoadingSizes || isLoadingAgeGroups;
  const isPending =
    createColor.isPending ||
    updateColor.isPending ||
    deleteColor.isPending ||
    createSize.isPending ||
    updateSize.isPending ||
    deleteSize.isPending ||
    createAgeGroup.isPending ||
    updateAgeGroup.isPending ||
    deleteAgeGroup.isPending;
  interface AttributeItem {
    value: string;
    nameEn?: string;
  }
  let attributeItems: AttributeItem[] = [];
  if (activeTab === "color" && colors) {
    // For colors, we need both Georgian and English values
    attributeItems = colors.map((color) => {
      // Check if color is an object with name and nameEn properties
      if (typeof color === "object" && color !== null && "name" in color) {
        const result = {
          value: (color as Color).name,
          nameEn: (color as Color).nameEn,
        };
        return result;
      }
      // Fallback for backward compatibility
      return { value: color as string, nameEn: "" };
    });
  } else if (activeTab === "size" && sizes)
    attributeItems = sizes.map((size) => ({ value: size as string }));
  else if (activeTab === "ageGroup" && ageGroups) {
    // For age groups, we need both Georgian and English values
    attributeItems = ageGroups.map((ageGroup) => {
      // Handle both cases: when ageGroup is an object OR just a string
      if (
        typeof ageGroup === "object" &&
        ageGroup !== null &&
        "name" in ageGroup
      ) {
        // Case 1: Proper object with name and nameEn properties
        const result = {
          value: (ageGroup as AgeGroupItem).name,
          nameEn: (ageGroup as AgeGroupItem).nameEn || "",
        };
        return result;
      } else if (typeof ageGroup === "string") {
        // Case 2: Just a string (fallback for production issue)
        // Map known Georgian names to English (temporary fix for production)
        const ageGroupTranslations: Record<string, string> = {
          ბავშვები: "Kids",
          დიდები: "Adults",
          ყრმები: "Toddlers",
          მოზარდები: "Teenagers",
        };

        const result = {
          value: ageGroup,
          nameEn: ageGroupTranslations[ageGroup] || "",
        };
        return result;
      } else {
        // Fallback for any other case
        return { value: String(ageGroup), nameEn: "" };
      }
    });
  }

  return (
    <div className="attributes-manager">
      <div className="attributes-tabs">
        <button
          className={`tab-button ${activeTab === "color" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("color");
            setIsAdding(false);
            setIsEditing(null);
            setInputValue("");
            setInputValueEn("");
          }}
        >
          {t("adminCategories.colors")}
        </button>
        <button
          className={`tab-button ${activeTab === "size" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("size");
            setIsAdding(false);
            setIsEditing(null);
            setInputValue("");
            setInputValueEn("");
          }}
        >
          {t("adminCategories.sizes")}
        </button>
        <button
          className={`tab-button ${activeTab === "ageGroup" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("ageGroup");
            setIsAdding(false);
            setIsEditing(null);
            setInputValue("");
            setInputValueEn("");
          }}
        >
          {t("adminCategories.ageGroups")}
        </button>
      </div>

      <div className="attributes-content">
        <div className="attributes-header">
          {" "}
          <h3 className="attributes-title">
            {activeTab === "color"
              ? t("adminCategories.colors")
              : activeTab === "size"
              ? t("adminCategories.sizes")
              : t("adminCategories.ageGroups")}
          </h3>
          {!isAdding && !isEditing && (
            <button className="btn-add" onClick={() => setIsAdding(true)}>
              + {t("adminCategories.add")}
            </button>
          )}
        </div>

        {(isAdding || isEditing) && (
          <form onSubmit={handleSubmit} className="attribute-form">
            <div className="form-group">
              {" "}
              <label htmlFor="attributeValue">
                {isEditing
                  ? t("adminCategories.editValue")
                  : t("adminCategories.newValue")}{" "}
                ({t("adminCategories.georgian")})
              </label>
              <input
                type="text"
                id="attributeValue"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  activeTab === "color"
                    ? t("adminCategories.enterColor")
                    : activeTab === "size"
                    ? t("adminCategories.enterSize")
                    : t("adminCategories.enterAgeGroup")
                }
                required
              />
            </div>{" "}
            {/* Show English input field for colors and age groups */}
            {(activeTab === "color" || activeTab === "ageGroup") && (
              <div className="form-group">
                {" "}
                <label htmlFor="attributeValueEn">
                  {isEditing
                    ? t("adminCategories.editValue")
                    : t("adminCategories.newValue")}{" "}
                  ({t("adminCategories.english")})
                </label>
                <input
                  type="text"
                  id="attributeValueEn"
                  value={inputValueEn}
                  onChange={(e) => setInputValueEn(e.target.value)}
                  placeholder={
                    activeTab === "color"
                      ? t("adminCategories.enterColorEnglish")
                      : t("adminCategories.enterAgeGroupEnglish")
                  }
                />
              </div>
            )}
            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit"
                disabled={isPending || !inputValue.trim()}
              >
                {" "}
                {isPending ? (
                  <HeartLoading size="medium" inline={true} />
                ) : isEditing ? (
                  t("adminCategories.update")
                ) : (
                  t("adminCategories.add")
                )}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(null);
                  setInputValue("");
                  setInputValueEn("");
                }}
              >
                {t("adminCategories.cancel")}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="loading-container">
            <Loader className="animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="attributes-list">
            {" "}
            {attributeItems.length > 0 ? (
              attributeItems.map((item, index) => {
                return (
                  <div
                    key={`${item.value}-${index}`}
                    className="attribute-item"
                  >
                    <div className="attribute-value-container">
                      {" "}
                      <span className="attribute-value">
                        {(activeTab === "color" || activeTab === "ageGroup") &&
                        language === "en" &&
                        item.nameEn
                          ? item.nameEn
                          : item.value}
                      </span>
                      {(activeTab === "color" || activeTab === "ageGroup") &&
                        language === "ge" &&
                        item.nameEn && (
                          <span className="attribute-value-en">
                            ({item.nameEn})
                          </span>
                        )}
                    </div>
                    <div className="attribute-actions">
                      <button
                        className="btn-edit"
                        onClick={() => startEditing(item.value, item.nameEn)}
                        disabled={isEditing === item.value}
                      >
                        {t("adminCategories.edit")}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(item.value)}
                      >
                        {t("adminCategories.delete")}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-attributes">
                <p>{t("adminCategories.noDataFound")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
