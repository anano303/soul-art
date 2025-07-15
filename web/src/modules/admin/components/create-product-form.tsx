"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ProductFormData as BaseProductFormData } from "@/modules/products/validation/product";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import "./CreateProductForm.css";
import Image from "next/image";
import { getAccessToken } from "@/lib/auth";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Category, SubCategory } from "@/types";
import { useStocks } from "@/hooks/useStocks";

// Extended ProductFormData to include all needed properties
interface ProductFormData extends BaseProductFormData {
  _id?: string;
  nameEn?: string;
  descriptionEn?: string;
  mainCategory?: string | { name: string; id?: string; _id?: string };
  subCategory?: string | { name: string; id?: string; _id?: string };
  ageGroups?: string[];
  sizes?: string[];
  colors?: string[];
  hashtags?: string[];
  categoryId?: string;
  categoryStructure?: {
    main: string;
    sub: string;
    ageGroup?: string;
  };
  videoDescription?: string; // YouTube embed code or URL
  // Discount functionality
  discountPercentage?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  variants?: Array<{
    ageGroup?: string;
    size?: string;
    color?: string;
    stock: number;
  }>; // Product variants with specific attributes and stock
}

interface CreateProductFormProps {
  initialData?: ProductFormData;
  onSuccess?: (data: {
    id: string;
    name: string;
    [key: string]: string | number | boolean | null | undefined;
  }) => void;
  isEdit?: boolean;
}

export function CreateProductForm({
  initialData,
  onSuccess,
  isEdit = !!initialData?._id,
}: CreateProductFormProps) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const { user } = useUser();
  const isSeller = user?.role?.toLowerCase() === "seller";

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});
  const [formData, setFormData] = useState<ProductFormData & { _id?: string }>(
    initialData || {
      name: "",
      nameEn: "",
      price: 0,
      description: "",
      descriptionEn: "",
      images: [],
      brand: "SoulArt", // Set default brand here
      category: "",
      subcategory: "",
      countInStock: 0,
      hashtags: [],
      brandLogo: undefined,
      videoDescription: "",
    }
  );

  // State for new category structure
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const [availableAgeGroups, setAvailableAgeGroups] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  const [deliveryType, setDeliveryType] = useState<"SELLER" | "SoulArt">(
    "SoulArt"
  );
  const [minDeliveryDays, setMinDeliveryDays] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");

  // Discount functionality states
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [discountStartDate, setDiscountStartDate] = useState<string>("");
  const [discountEndDate, setDiscountEndDate] = useState<string>("");

  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/categories?includeInactive=false`
      );
      return response.json();
    },
  });

  // Fetch subcategories based on selected category
  const { data: subcategories, isLoading: isSubcategoriesLoading } = useQuery<
    SubCategory[]
  >({
    queryKey: ["subcategories", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subcategories?categoryId=${selectedCategory}&includeInactive=false`
      );
      return response.json();
    },
    enabled: !!selectedCategory,
  });

  // Fetch all colors for proper nameEn support
  const { data: availableColorsData = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Fetch all age groups for proper nameEn support
  const { data: availableAgeGroupsData = [] } = useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories/attributes/age-groups"
        );
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Get localized color name based on current language
  const getLocalizedColorName = (colorName: string): string => {
    if (language === "en") {
      // Find the color in availableColorsData to get its English name
      const colorObj = availableColorsData.find(
        (color) => color.name === colorName
      );
      return colorObj?.nameEn || colorName;
    }
    return colorName;
  };

  // Get localized age group name based on current language
  const getLocalizedAgeGroupName = (ageGroupName: string): string => {
    if (language === "en") {
      // Find the age group in availableAgeGroupsData to get its English name
      const ageGroupObj = availableAgeGroupsData.find(
        (ageGroup) => ageGroup.name === ageGroupName
      );
      return ageGroupObj?.nameEn || ageGroupName;
    }
    return ageGroupName;
  };

  // Update available attributes when subcategory changes
  useEffect(() => {
    if (subcategories && selectedSubcategory) {
      const subcategory = subcategories.find(
        (sub) => sub.id === selectedSubcategory
      );
      if (subcategory) {
        setAvailableAgeGroups(subcategory.ageGroups || []);
        setAvailableSizes(subcategory.sizes || []);
        setAvailableColors(subcategory.colors || []);
      }
    }
  }, [subcategories, selectedSubcategory]);

  // Auto-fill seller info when user data loads
  useEffect(() => {
    if (user && isSeller && !isEdit) {
      setFormData((prevData) => ({
        ...prevData,
        brand: user.name || user.storeName || "SoulArt",
        brandLogo: user.storeLogo || undefined,
      }));
    }
  }, [user, isSeller, isEdit]);

  useEffect(() => {
    if (initialData) {
      console.log("InitialData received:", initialData);
      console.log("InitialData hashtags:", initialData.hashtags);
      console.log("InitialData variants:", initialData.variants);

      // Basic form data setup
      setFormData((prev) => ({
        ...prev,
        _id: initialData._id,
        name: initialData.name || "",
        nameEn: initialData.nameEn || "",
        brand: initialData.brand || "SoulArt",
        brandLogo:
          typeof initialData.brandLogo === "string"
            ? initialData.brandLogo
            : undefined,
        category: initialData.category || "",
        images: initialData.images || [],
        description: initialData.description || "",
        descriptionEn: initialData.descriptionEn || "",
        price: initialData.price || 0,
        countInStock: initialData.countInStock || 0,
        ageGroups: initialData.ageGroups || [],
        sizes: initialData.sizes || [],
        colors: initialData.colors || [],
        hashtags: initialData.hashtags || [],
        videoDescription: initialData.videoDescription || "",
      }));

      // Set hashtags input text
      const hashtagsText =
        initialData.hashtags && initialData.hashtags.length > 0
          ? initialData.hashtags.join(", ")
          : "";
      setHashtagsInput(hashtagsText);

      if (initialData.deliveryType) {
        setDeliveryType(initialData.deliveryType as "SELLER" | "SoulArt");
      }
      if (initialData.minDeliveryDays) {
        setMinDeliveryDays(initialData.minDeliveryDays.toString());
      }
      if (initialData.maxDeliveryDays) {
        setMaxDeliveryDays(initialData.maxDeliveryDays.toString());
      }

      // Set discount fields
      if (initialData.discountPercentage) {
        setDiscountPercentage(initialData.discountPercentage.toString());
      }
      if (initialData.discountStartDate) {
        // Convert date to YYYY-MM-DD format for HTML date input
        const startDate = new Date(initialData.discountStartDate);
        if (!isNaN(startDate.getTime())) {
          setDiscountStartDate(startDate.toISOString().split("T")[0]);
        }
      }
      if (initialData.discountEndDate) {
        // Convert date to YYYY-MM-DD format for HTML date input
        const endDate = new Date(initialData.discountEndDate);
        if (!isNaN(endDate.getTime())) {
          setDiscountEndDate(endDate.toISOString().split("T")[0]);
        }
      }

      // Extract category ID correctly, handling both object and string formats
      if (initialData.mainCategory) {
        const categoryId =
          typeof initialData.mainCategory === "object"
            ? initialData.mainCategory._id || initialData.mainCategory.id
            : initialData.mainCategory;

        setSelectedCategory(String(categoryId || ""));
      } else if (initialData.categoryId) {
        setSelectedCategory(String(initialData.categoryId || ""));
      }
    }
  }, [initialData]);

  // Add a separate effect for handling subcategory after category is set and subcategories are loaded
  useEffect(() => {
    // Only run this effect when editing and we have both initialData and subcategories loaded
    if (
      initialData &&
      selectedCategory &&
      subcategories &&
      subcategories.length > 0
    ) {
      // Extract subcategory ID correctly, handling both object and string formats
      if (initialData.subCategory) {
        const subcategoryId =
          typeof initialData.subCategory === "object"
            ? initialData.subCategory._id || initialData.subCategory.id
            : initialData.subCategory;

        setSelectedSubcategory(String(subcategoryId || ""));
      } else if (initialData.subcategory) {
        setSelectedSubcategory(String(initialData.subcategory || ""));
      }
    }
  }, [initialData, selectedCategory, subcategories]);

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      price: 0,
      description: "",
      descriptionEn: "",
      images: [],
      brand: "SoulArt", // Set default brand here too
      category: "",
      subcategory: "",
      countInStock: 0,
      hashtags: [],
      ageGroups: [],
      sizes: [],
      colors: [],
      brandLogo: undefined,
    });
    setHashtagsInput("");
    setErrors({});
    setServerError(null);
    setSuccess(null);

    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedAgeGroups([]);
    setSelectedSizes([]);
    setSelectedColors([]);

    setDeliveryType("SoulArt");
    setMinDeliveryDays("");
    setMaxDeliveryDays("");
  };
  const validateField = (field: keyof ProductFormData, value: unknown) => {
    // All validation is handled with translation keys for consistent language support
    let translatedError: string | null = null;

    switch (field) {
      case "name":
        if (!value || String(value).trim() === "") {
          translatedError = t("adminProducts.productNameRequired");
        } else if (String(value).length < 2) {
          translatedError = t("adminProducts.productNameInvalid");
        }
        break;
      case "price":
        if (!value || value === "" || value === 0) {
          translatedError = t("adminProducts.priceRequired");
        } else if (Number(value) <= 0 || isNaN(Number(value))) {
          translatedError = t("adminProducts.priceInvalid");
        }
        break;
      case "description":
        if (!value || String(value).trim() === "") {
          translatedError = t("adminProducts.descriptionRequired");
        } else if (String(value).length < 10) {
          translatedError = t("adminProducts.descriptionInvalid");
        }
        break;
      case "brand":
        if (!value || String(value).trim() === "") {
          translatedError = t("adminProducts.brandRequired");
        } else if (String(value).length < 2) {
          translatedError = t("adminProducts.brandInvalid");
        }
        break;
      case "countInStock":
        if (value !== undefined && value !== null && value !== "") {
          const numValue = Number(value);
          if (isNaN(numValue) || numValue < 0) {
            translatedError = t("adminProducts.priceInvalid"); // Reuse price validation message for now
          }
        }
        break;
      // Note: Other fields don't need explicit validation here as they're handled elsewhere
      // or don't require complex validation
    }
    if (translatedError) {
      setErrors((prev) => ({ ...prev, [field]: translatedError }));
      return false;
    } else {
      // Remove the error from the errors object completely
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  };
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const processedValue =
      name === "price" || name === "countInStock" ? Number(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Validate the field in real-time to clear errors as user types
    if (
      name in { name: 1, price: 1, description: 1, brand: 1, countInStock: 1 }
    ) {
      validateField(name as keyof ProductFormData, processedValue);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setSelectedSubcategory("");
    setSelectedAgeGroups([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setAvailableAgeGroups([]);
    setAvailableSizes([]);
    setAvailableColors([]);
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subcategoryId = e.target.value;
    setSelectedSubcategory(subcategoryId);
    setSelectedAgeGroups([]);
    setSelectedSizes([]);
    setSelectedColors([]);
  };

  const handleAttributeChange = (
    type: "ageGroups" | "sizes" | "colors",
    value: string
  ) => {
    if (type === "ageGroups") {
      setSelectedAgeGroups((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );
    } else if (type === "sizes") {
      setSelectedSizes((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );
    } else if (type === "colors") {
      setSelectedColors((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );
    }
  };

  // Add state for hashtags input text
  const [hashtagsInput, setHashtagsInput] = useState<string>("");

  // Hashtags handling functions
  const handleHashtagsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setHashtagsInput(value);

    // Update hashtags array in real-time
    const hashtagsArray = value
      ? value
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    setFormData((prev) => ({
      ...prev,
      hashtags: hashtagsArray,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files) {
      const newImages = Array.from(files);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setPending(true);
    setServerError(null);
    setSuccess(null);

    try {
      // Use validateField for validating form fields
      const isNameValid = validateField("name", formData.name);
      const isPriceValid = validateField("price", formData.price);
      const isDescriptionValid = validateField(
        "description",
        formData.description
      );

      if (!isNameValid || !isPriceValid || !isDescriptionValid) {
        setPending(false);
        return;
      }

      // Validate required fields
      if (!selectedCategory) {
        setServerError(t("adminProducts.selectCategoryError"));
        setPending(false);
        return;
      }

      if (!selectedSubcategory) {
        setServerError(t("adminProducts.selectSubcategoryError"));
        setPending(false);
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (
        formData.images.some(
          (image) => image instanceof File && !allowedTypes.includes(image.type)
        )
      ) {
        setErrors((prev) => ({
          ...prev,
          images: t("adminProducts.invalidImageFormat"),
        }));
        setPending(false);
        return;
      } // Verify we have at least one image
      if (formData.images.length === 0) {
        setErrors((prev) => ({
          ...prev,
          images: t("adminProducts.noImageSelected"),
        }));
        setPending(false);
        return;
      }

      if (deliveryType === "SELLER" && (!minDeliveryDays || !maxDeliveryDays)) {
        setServerError(t("adminProducts.deliveryDaysRequired"));
        setPending(false);
        return;
      }

      // Validate discount fields
      if (discountPercentage && parseFloat(discountPercentage) > 0) {
        const discountValue = parseFloat(discountPercentage);
        if (discountValue < 0 || discountValue > 100) {
          setServerError(
            language === "en"
              ? "Discount percentage must be between 0 and 100"
              : "ფასდაკლების პროცენტი უნდა იყოს 0-სა და 100-ს შორის"
          );
          setPending(false);
          return;
        }

        // If discount is set, validate dates
        if (discountStartDate && discountEndDate) {
          const startDate = new Date(discountStartDate);
          const endDate = new Date(discountEndDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (endDate <= startDate) {
            setServerError(
              language === "en"
                ? "Discount end date must be after start date"
                : "ფასდაკლების დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ"
            );
            setPending(false);
            return;
          }
        }
      }

      const token = getAccessToken();
      if (!token) {
        setServerError(t("adminProducts.authError"));
        setPending(false);
        setTimeout(() => {
          window.location.href = "/login?redirect=/admin/products";
        }, 2000);
        return;
      }

      const formDataToSend = new FormData();

      // Add basic form fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("nameEn", formData.nameEn || "");
      formDataToSend.append("price", String(formData.price));
      formDataToSend.append("description", formData.description);
      formDataToSend.append("descriptionEn", formData.descriptionEn || "");

      // Add video description if present
      if (formData.videoDescription) {
        formDataToSend.append("videoDescription", formData.videoDescription);
      }

      formDataToSend.append("countInStock", String(totalCount));

      // Add new category structure - ensure we're sending strings, not objects
      formDataToSend.append("mainCategory", selectedCategory);
      formDataToSend.append("subCategory", selectedSubcategory);

      // Add selected attributes
      if (selectedAgeGroups.length > 0) {
        formDataToSend.append("ageGroups", JSON.stringify(selectedAgeGroups));
      }

      if (selectedSizes.length > 0) {
        formDataToSend.append("sizes", JSON.stringify(selectedSizes));
      }

      if (selectedColors.length > 0) {
        formDataToSend.append("colors", JSON.stringify(selectedColors));
      }

      // Add hashtags if they exist
      if (formData.hashtags && formData.hashtags.length > 0) {
        formDataToSend.append("hashtags", JSON.stringify(formData.hashtags));
      }

      if (stocks.length > 0) {
        console.log("Sending stocks:", stocks);
        formDataToSend.append("variants", JSON.stringify(stocks));
      }

      // Handle brand name - ensure it's always set to SoulArt if empty
      if (isSeller) {
        formDataToSend.append(
          "brand",
          user?.name || user?.storeName || formData.brand || "SoulArt"
        );
      } else {
        formDataToSend.append("brand", formData.brand || "SoulArt");
      }

      // SIMPLIFIED logo handling - THIS IS THE FIX
      // For new uploads (File objects)
      if (formData.brandLogo instanceof File) {
        formDataToSend.append("brandLogo", formData.brandLogo);
      }
      // For existing logo URLs - just pass the URL as a string
      else if (typeof formData.brandLogo === "string" && formData.brandLogo) {
        formDataToSend.append("brandLogoUrl", formData.brandLogo);
      }
      // For sellers with profiles - use their store logo
      else if (isSeller && user?.storeLogo) {
        formDataToSend.append("brandLogoUrl", user.storeLogo);
      }

      // Add delivery type
      formDataToSend.append("deliveryType", deliveryType);

      // Add delivery days if SELLER type
      if (deliveryType === "SELLER") {
        formDataToSend.append("minDeliveryDays", minDeliveryDays);
        formDataToSend.append("maxDeliveryDays", maxDeliveryDays);
      }

      // Add discount fields
      if (discountPercentage && parseFloat(discountPercentage) > 0) {
        formDataToSend.append("discountPercentage", discountPercentage);
      }
      if (discountStartDate) {
        formDataToSend.append("discountStartDate", discountStartDate);
      }
      if (discountEndDate) {
        formDataToSend.append("discountEndDate", discountEndDate);
      }

      // Handle images - separate existing images from new ones
      const existingImages: string[] = [];
      const newFiles: File[] = [];

      formData.images.forEach((image) => {
        if (typeof image === "string") {
          existingImages.push(image);
        } else if (image instanceof File) {
          newFiles.push(image);
        }
      });

      // Add existing images as JSON array
      if (existingImages.length > 0) {
        formDataToSend.append("existingImages", JSON.stringify(existingImages));
      }

      // Add new image files
      if (newFiles.length > 0) {
        newFiles.forEach((file) => {
          formDataToSend.append("images", file);
        });
      } else if (existingImages.length === 0) {
        // If no images are provided at all, throw an error
        setErrors((prev) => ({
          ...prev,
          images: t("adminProducts.noImageSelected"),
        }));
        setPending(false);
        return;
      }

      // Double check that we're sending either existingImages or new images
      const hasImages =
        (formDataToSend.has("existingImages") &&
          JSON.parse(formDataToSend.get("existingImages") as string).length >
            0) ||
        formDataToSend.getAll("images").length > 0;
      if (!hasImages) {
        setErrors((prev) => ({
          ...prev,
          images: t("adminProducts.noImageSelected"),
        }));
        setPending(false);
        return;
      }

      const method = isEdit ? "PUT" : "POST";
      const endpoint = isEdit ? `/products/${formData._id}` : "/products";

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          method,
          body: formDataToSend,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = t("adminProducts.createUpdateError");
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const successMessage = isEdit
        ? t("adminProducts.productUpdatedSuccess")
        : t("adminProducts.productAddedSuccess");
      setSuccess(successMessage);

      toast({
        title: isEdit
          ? t("adminProducts.productUpdatedToast")
          : t("adminProducts.productCreatedToast"),
        description: t("adminProducts.successTitle"),
      });

      if (!isEdit) {
        resetForm();
      }

      if (onSuccess) {
        // Set a flag to force refresh when we return to the products list
        sessionStorage.setItem("returnFromEdit", "true");
        onSuccess(data);
      } else {
        // Also set the flag for direct navigation
        sessionStorage.setItem("returnFromEdit", "true");
        setTimeout(() => {
          router.push("/admin/products");
        }, 1500);
      }
    } catch (error) {
      console.error("Error:", error);
      setServerError(
        error instanceof Error ? error.message : t("adminProducts.generalError")
      );
    } finally {
      setPending(false);
    }
  };

  // Also add a useEffect to fetch subcategory details when selectedSubcategory changes
  useEffect(() => {
    if (selectedSubcategory && subcategories) {
      const subcategory = subcategories.find(
        (sub) => String(sub.id) === String(selectedSubcategory)
      );

      if (subcategory) {
        // Set available options based on subcategory
        setAvailableAgeGroups(subcategory.ageGroups || []);
        setAvailableSizes(subcategory.sizes || []);
        setAvailableColors(subcategory.colors || []);

        // If we have initial data with attribute selections, make sure they're valid
        // for this subcategory before applying them
        if (initialData) {
          if (initialData.ageGroups && Array.isArray(initialData.ageGroups)) {
            const validAgeGroups = initialData.ageGroups.filter((ag) =>
              subcategory.ageGroups.includes(ag)
            );
            setSelectedAgeGroups(validAgeGroups);
          }

          if (initialData.sizes && Array.isArray(initialData.sizes)) {
            const validSizes = initialData.sizes.filter((size) =>
              subcategory.sizes.includes(size)
            );
            setSelectedSizes(validSizes);
          }

          if (initialData.colors && Array.isArray(initialData.colors)) {
            const validColors = initialData.colors.filter((color) =>
              subcategory.colors.includes(color)
            );
            setSelectedColors(validColors);
          }
        }
      }
    }
  }, [selectedSubcategory, subcategories, initialData]);

  // Add a cleanup effect when the form unmounts
  useEffect(() => {
    return () => {
      // Clean up any lingering edit flags
      const returnFromEdit = sessionStorage.getItem("returnFromEdit");
      if (returnFromEdit) {
        sessionStorage.removeItem("returnFromEdit");
      }
    };
  }, []);

  const { stocks, totalCount, setStockCount } = useStocks({
    initialData,
    attributes: [selectedAgeGroups, selectedSizes, selectedColors],
  });

  return (
    <div className="create-product-form">
      {success && (
        <div className="success-message">
          <p className="text-center">{success}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="server-error">
            <p className="create-product-error text-center">{serverError}</p>
          </div>
        )}{" "}
        <div>
          <label htmlFor="videoDescription">
            YouTube Embed Code (optional)
          </label>
          <textarea
            id="videoDescription"
            name="videoDescription"
            value={formData.videoDescription || ""}
            onChange={handleChange}
            className="create-product-textarea"
            placeholder="Paste YouTube embed code or iframe here"
            rows={3}
          />
        </div>
        {/* Discount Section */}
        <div className="discount-section">
          <h3>
            {language === "en"
              ? "Discount Settings"
              : "ფასდაკლების პარამეტრები"}
          </h3>

          <div>
            <label htmlFor="discountPercentage">
              {language === "en"
                ? "Discount Percentage (%)"
                : "ფასდაკლების პროცენტი (%)"}
            </label>
            <input
              id="discountPercentage"
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              className="create-product-input"
              placeholder={
                language === "en"
                  ? "Enter discount percentage (0-100)"
                  : "შეიყვანეთ ფასდაკლების პროცენტი (0-100)"
              }
              min={0}
              max={100}
              step={0.01}
            />
            <small
              style={{
                color: "#666",
                fontSize: "0.9rem",
                display: "block",
                marginTop: "4px",
              }}
            >
              {language === "en"
                ? "Leave empty or set to 0 for no discount"
                : "დატოვეთ ცარიელი ან დააყენეთ 0 ფასდაკლების გარეშე"}
            </small>
          </div>

          {discountPercentage && parseFloat(discountPercentage) > 0 && (
            <>
              <div>
                <label htmlFor="discountStartDate">
                  {language === "en"
                    ? "Discount Start Date"
                    : "ფასდაკლების დაწყების თარიღი"}
                </label>
                <input
                  id="discountStartDate"
                  type="date"
                  value={discountStartDate}
                  onChange={(e) => setDiscountStartDate(e.target.value)}
                  className="create-product-input"
                />
              </div>

              <div>
                <label htmlFor="discountEndDate">
                  {language === "en"
                    ? "Discount End Date"
                    : "ფასდაკლების დასრულების თარიღი"}
                </label>
                <input
                  id="discountEndDate"
                  type="date"
                  value={discountEndDate}
                  onChange={(e) => setDiscountEndDate(e.target.value)}
                  className="create-product-input"
                />
              </div>
            </>
          )}
        </div>
        <div>
          <label htmlFor="name">{t("adminProducts.productNameGe")}</label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="create-product-input"
            required
          />
          {errors.name && <p className="create-product-error">{errors.name}</p>}
        </div>{" "}
        <div>
          <label htmlFor="nameEn">{t("adminProducts.productNameEn")}</label>
          <input
            id="nameEn"
            name="nameEn"
            value={formData.nameEn}
            onChange={handleChange}
            className="create-product-input"
            placeholder={t("adminProducts.productNameEnPlaceholder")}
          />
          {errors.nameEn && (
            <p className="create-product-error">{errors.nameEn}</p>
          )}
        </div>{" "}
        <div>
          <label htmlFor="description">
            {t("adminProducts.descriptionGe")}
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="create-product-textarea"
            required
          />
          {errors.description && (
            <p className="create-product-error">{errors.description}</p>
          )}
        </div>{" "}
        <div>
          <label htmlFor="descriptionEn">
            {t("adminProducts.descriptionEn")}
          </label>
          <textarea
            id="descriptionEn"
            name="descriptionEn"
            value={formData.descriptionEn}
            onChange={handleChange}
            className="create-product-textarea"
            placeholder={t("adminProducts.descriptionEnPlaceholder")}
          />
          {errors.descriptionEn && (
            <p className="create-product-error">{errors.descriptionEn}</p>
          )}
        </div>{" "}
        <div>
          <label htmlFor="price">{t("adminProducts.price")}</label>
          <input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            className="create-product-input"
            required
          />
          {errors.price && (
            <p className="create-product-error">{errors.price}</p>
          )}
        </div>
        {/* New Category Structure */}{" "}
        <div>
          <label htmlFor="category">{t("adminProducts.category")}</label>
          <select
            id="category"
            name="category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="create-product-select"
            required
            disabled={isCategoriesLoading}
          >
            {" "}
            <option value="">
              {isCategoriesLoading
                ? t("adminProducts.loading")
                : t("adminProducts.selectCategory")}
            </option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {language === "en" && category.nameEn
                  ? category.nameEn
                  : category.name}
              </option>
            ))}
          </select>
        </div>{" "}
        <div>
          <label htmlFor="subcategory">{t("adminProducts.subcategory")}</label>
          <select
            id="subcategory"
            name="subcategory"
            value={selectedSubcategory}
            onChange={handleSubcategoryChange}
            className="create-product-select"
            required
            disabled={!selectedCategory || isSubcategoriesLoading}
          >
            <option value="">{t("adminProducts.selectSubcategory")}</option>
            {subcategories?.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {language === "en" && subcategory.nameEn
                  ? subcategory.nameEn
                  : subcategory.name}
              </option>
            ))}
          </select>
        </div>
        {/* Attributes Section */}
        {selectedSubcategory && (
          <div className="attributes-section">
            {availableAgeGroups.length > 0 && (
              <div className="attribute-group">
                <h3>{t("adminProducts.ageGroups")}</h3>
                <div className="attribute-options">
                  {availableAgeGroups.map((ageGroup) => (
                    <label key={ageGroup} className="attribute-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedAgeGroups.includes(ageGroup)}
                        onChange={() =>
                          handleAttributeChange("ageGroups", ageGroup)
                        }
                      />{" "}
                      <span>{getLocalizedAgeGroupName(ageGroup)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {availableSizes.length > 0 && (
              <div className="attribute-group">
                <h3>{t("adminProducts.sizes")}</h3>
                <div className="attribute-options">
                  {availableSizes.map((size) => (
                    <label key={size} className="attribute-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(size)}
                        onChange={() => handleAttributeChange("sizes", size)}
                      />
                      <span>{size}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {availableColors.length > 0 && (
              <div className="attribute-group">
                <h3>{t("adminProducts.colors")}</h3>
                <div className="attribute-options">
                  {availableColors.map((color) => (
                    <label key={color} className="attribute-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color)}
                        onChange={() => handleAttributeChange("colors", color)}
                      />
                      <span>{getLocalizedColorName(color)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {stocks &&
          stocks.map((stock) => (
            <div
              key={`${stock.ageGroup} - ${stock.size} - ${stock.color}`}
              className="stock-info"
            >
              {" "}
              <label>
                {stock.ageGroup ? getLocalizedAgeGroupName(stock.ageGroup) : ""}{" "}
                - {stock.size || ""} -{" "}
                {stock.color ? getLocalizedColorName(stock.color) : ""}
              </label>
              <input
                id="countInStock"
                name="countInStock"
                type="number"
                value={stock.stock}
                onChange={(elem) => setStockCount(stock, +elem.target.value)}
                min={0}
                required
              />
            </div>
          ))}{" "}
        <div>
          <label htmlFor="countInStock">{t("adminProducts.stock")}</label>
          <input
            id="countInStock"
            name="countInStock"
            type="number"
            disabled
            value={totalCount}
            onChange={handleChange}
            min={0}
            required
          />
          <small
            style={{
              color: "#666",
              fontSize: "0.9rem",
              display: "block",
              marginTop: "4px",
            }}
          >
            {language === "en"
              ? "Total stock calculated automatically from variants above."
              : "მთლიანი მარაგი ავტომატურად ითვლება ზემოთ მითითებული ვარიანტებიდან."}
          </small>
          {errors.countInStock && (
            <p className="create-product-error">{errors.countInStock}</p>
          )}
        </div>
        Delivery Section
        <div className="delivery-section">
          <h3>მიწოდების ტიპი</h3>
          <div className="delivery-type-options">
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="SoulArt"
                checked={deliveryType === "SoulArt"}
                onChange={() => setDeliveryType("SoulArt")}
              />
              <span>SoulArt მიწოდება</span>
            </label>
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="SELLER"
                checked={deliveryType === "SELLER"}
                onChange={() => setDeliveryType("SELLER")}
              />
              <span>გამყიდველის მიწოდება</span>
            </label>
          </div>

          {deliveryType === "SELLER" && (
            <div className="delivery-days">
              <div>
                <label htmlFor="minDeliveryDays">მინიმუმ დღეები</label>
                <input
                  id="minDeliveryDays"
                  type="number"
                  value={minDeliveryDays}
                  onChange={(e) => setMinDeliveryDays(e.target.value)}
                  min={1}
                  required
                />
              </div>
              <div>
                <label htmlFor="maxDeliveryDays">მაქსიმუმ დღეები</label>
                <input
                  id="maxDeliveryDays"
                  type="number"
                  value={maxDeliveryDays}
                  onChange={(e) => setMaxDeliveryDays(e.target.value)}
                  min={1}
                  required
                />
              </div>
            </div>
          )}
        </div> 
        <div>
          <label htmlFor="brand">{t("adminProducts.brand")}</label>
          <input
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            placeholder={t("adminProducts.enterBrandName")}
            className={"create-product-input"}
          />
          {errors.brand && (
            <p className="create-product-error">{errors.brand}</p>
          )}
        </div>
        {/* Hashtags Field for SEO */}
        <div>
          <label htmlFor="hashtags">
            {language === "en"
              ? "Hashtags for SEO (English)"
              : "ჰეშთეგები SEO-სთვის"}
          </label>
          <textarea
            id="hashtags"
            name="hashtags"
            value={hashtagsInput}
            onChange={handleHashtagsChange}
            className="create-product-textarea"
            placeholder={
              language === "en"
                ? "Enter hashtags separated by commas (e.g., handmade, art, unique)"
                : "შეიყვანეთ ჰეშთეგები მძიმეებით გამოყოფილი (მაგ. ხელნაკეთი, ხელოვნება, უნიკალური)"
            }
            rows={3}
          />
          <small style={{ color: "#666", fontSize: "0.9rem" }}>
            {language === "en"
              ? "Add relevant hashtags to improve search visibility. Separate with commas."
              : "დაამატეთ შესაბამისი ჰეშთეგები ძიების გაუმჯობესებისთვის. გამოყავით მძიმეებით."}
          </small>
          {/* Hashtags preview */}
          {formData.hashtags && formData.hashtags.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                border: "1px solid #e9ecef",
              }}
            >
              <small style={{ color: "#495057", fontWeight: "bold" }}>
                {language === "en" ? "Preview:" : "პრევიუ:"}
              </small>
              <div style={{ marginTop: "4px" }}>
                {formData.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#007bff",
                      color: "white",
                      padding: "2px 6px",
                      margin: "2px",
                      borderRadius: "3px",
                      fontSize: "0.8rem",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>{" "}
        <div>
          <label htmlFor="images">{t("adminProducts.images")}</label>
          <input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="create-product-file"
            multiple
          />
          {formData.images.length === 0 && (
            <p className="upload-reminder">
              {t("adminProducts.uploadReminder")}
            </p>
          )}
          <div className="image-preview-container">
            {formData.images.map((image, index) => {
              const imageUrl =
                image instanceof File ? URL.createObjectURL(image) : image;
              return (
                <div key={index} className="image-preview">
                  <Image
                    loader={({ src }) => src}
                    src={imageUrl}
                    alt="Product preview"
                    width={100}
                    height={100}
                    unoptimized
                    className="preview-image"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="remove-image-button"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          {errors.images && (
            <p className="create-product-error">{errors.images}</p>
          )}
        </div>
        <div>
          <label htmlFor="brandLogo">{t("adminProducts.brandLogo")}</label>
          <div className="brand-logo-container">
            {(user?.storeLogo || typeof formData.brandLogo === "string") && (
              <div className="image-preview">
                <Image
                  loader={({ src }) => src}
                  alt="Brand logo"
                  src={
                    user?.storeLogo ||
                    (typeof formData.brandLogo === "string"
                      ? formData.brandLogo
                      : "")
                  }
                  width={100}
                  height={100}
                  unoptimized
                  className="preview-image"
                />
              </div>
            )}
            <input
              id="brandLogo"
              name="brandLogo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFormData((prev) => ({
                    ...prev,
                    brandLogo: e.target.files?.[0],
                  }));
                }
              }}
              className="create-product-file"
            />
          </div>
          {errors.brandLogo && (
            <p className="create-product-error">{errors.brandLogo}</p>
          )}{" "}
        </div>{" "}
        {/* General Error Display */}
        {Object.keys(errors).length > 0 && (
          <div
            className="general-errors-display"
            style={{
              backgroundColor: "#fef2f2",
              border: "2px solid #ef4444",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <h4
              className="text-red-600 font-semibold mb-2"
              style={{
                color: "#dc2626",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {t("adminProducts.fixErrorsBeforeSubmit")}:
            </h4>
            <ul className="text-red-600 text-sm space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li
                  key={field}
                  style={{
                    color: "#dc2626",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Validation Errors Display */}
        {(!selectedCategory ||
          !selectedSubcategory ||
          formData.images.length === 0) && (
          <div
            className="validation-errors-display"
            style={{
              backgroundColor: "#fefce8",
              border: "2px solid #eab308",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <h4
              className="text-yellow-600 font-semibold mb-2"
              style={{
                color: "#ca8a04",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {t("adminProducts.requiredFields")}:
            </h4>
            <ul className="text-yellow-600 text-sm space-y-1">
              {!selectedCategory && (
                <li
                  style={{
                    color: "#ca8a04",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  • {t("adminProducts.selectCategoryError")}
                </li>
              )}
              {!selectedSubcategory && (
                <li
                  style={{
                    color: "#ca8a04",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  • {t("adminProducts.selectSubcategoryError")}
                </li>
              )}
              {formData.images.length === 0 && (
                <li
                  style={{
                    color: "#ca8a04",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  • {t("adminProducts.noImageSelected")}
                </li>
              )}
            </ul>
          </div>
        )}{" "}
        <button
          type="submit"
          className="create-product-button"
          disabled={
            pending ||
            !formData.name ||
            !selectedCategory ||
            !selectedSubcategory ||
            formData.images.length === 0 ||
            Object.values(errors).some(
              (error) => error !== undefined && error !== null && error !== ""
            )
          }
          style={{
            opacity:
              pending ||
              !formData.name ||
              !selectedCategory ||
              !selectedSubcategory ||
              formData.images.length === 0 ||
              Object.keys(errors).length > 0
                ? 0.5
                : 1,
            cursor:
              pending ||
              !formData.name ||
              !selectedCategory ||
              !selectedSubcategory ||
              formData.images.length === 0 ||
              Object.keys(errors).length > 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {pending && <Loader2 className="loader" />}
          {isEdit
            ? t("adminProducts.updateProduct")
            : t("adminProducts.createProduct")}
        </button>
      </form>
    </div>
  );
}
