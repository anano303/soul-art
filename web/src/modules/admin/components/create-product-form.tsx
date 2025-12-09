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
  youtubeVideoId?: string;
  youtubeVideoUrl?: string;
  youtubeEmbedUrl?: string;
  // Discount functionality
  discountPercentage?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  // New fields are already included in BaseProductFormData
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
  const { user, isLoading: userLoading } = useUser();
  const isSeller =
    user?.role?.toLowerCase() === "seller" ||
    user?.role === "Seller" ||
    user?.role === "SELLER";

  // Debug logging

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});
  const [formData, setFormData] = useState<ProductFormData & { _id?: string }>(
    initialData
      ? {
          ...initialData,
          materials: initialData.materials ?? [],
          materialsEn: initialData.materialsEn ?? [],
        }
      : {
          name: "",
          nameEn: "",
          price: 1,
          description: "",
          descriptionEn: "",
          images: [],
          brand: "SoulArt", // Set default brand here
          category: "",
          subcategory: "",
          countInStock: 1,
          hashtags: [],
          brandLogo: undefined,
          isOriginal: true,
          materials: [],
          materialsEn: [],
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
  const [isSaving, setIsSaving] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string>("");
  const [uploadedYoutubeData, setUploadedYoutubeData] = useState<{
    videoId: string;
    videoUrl: string;
    embedUrl: string;
  } | null>(null);
  const [existingYoutubeVideoUrl, setExistingYoutubeVideoUrl] = useState<
    string | null
  >(initialData?.youtubeVideoUrl || null);

  // New fields for original/copy and materials
  const [isOriginal, setIsOriginal] = useState<boolean>(true);
  const [addToPortfolio, setAddToPortfolio] = useState<boolean>(true);
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialsInput, setMaterialsInput] = useState<string>("");
  const [materialsEn, setMaterialsEn] = useState<string[]>([]);
  const [materialsEnInput, setMaterialsEnInput] = useState<string>("");

  // Dimensions state
  const [dimensions, setDimensions] = useState<{
    width?: number;
    height?: number;
    depth?: number;
  }>({
    width: undefined,
    height: undefined,
    depth: undefined,
  });

  // Authorization check - redirect if not authenticated or not authorized
  useEffect(() => {
    if (!userLoading && !user) {
      toast({
        title: language === "en" ? "Access Denied" : "წვდომა აკრძალულია",
        description:
          language === "en"
            ? "You must be logged in to access this page"
            : "ამ გვერდზე შესასვლელად საჭიროა ავტორიზაცია",
        variant: "destructive",
      });
      router.push("/login");
    } else if (user && !isSeller && user.role?.toLowerCase() !== "admin") {
      toast({
        title: language === "en" ? "Access Denied" : "წვდომა აკრძალულია",
        description:
          language === "en"
            ? "You don't have permission to access this page"
            : "თქვენ არ გაქვთ ამ გვერდზე წვდომის ნებართვა",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [user, userLoading, router, language, toast, isSeller]);

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
      if (
        !selectedCategory ||
        selectedCategory === "undefined" ||
        selectedCategory === "null"
      )
        return [];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subcategories?categoryId=${selectedCategory}&includeInactive=false`
      );
      return response.json();
    },
    enabled:
      !!selectedCategory &&
      selectedCategory !== "undefined" &&
      selectedCategory !== "null",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce API calls
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (colors change rarely)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (age groups change rarely)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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
      setExistingYoutubeVideoUrl(initialData.youtubeVideoUrl || null);
      setVideoFile(null);
      setVideoError(null);
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
        countInStock: initialData.countInStock || 1,
        ageGroups: initialData.ageGroups || [],
        sizes: initialData.sizes || [],
        colors: initialData.colors || [],
        hashtags: initialData.hashtags || [],
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

      // Initialize new fields
      if (initialData.isOriginal !== undefined) {
        setIsOriginal(initialData.isOriginal);
      } else {
        setIsOriginal(true); // Default to true
      }

      if (initialData.dimensions) {
        setDimensions({
          width: initialData.dimensions.width ?? undefined,
          height: initialData.dimensions.height ?? undefined,
          depth: initialData.dimensions.depth ?? undefined,
        });
      }

      if (initialData.materials) {
        setMaterials(initialData.materials);
        setMaterialsInput(initialData.materials.join(", "));
      }
      if (initialData.materialsEn) {
        setMaterialsEn(initialData.materialsEn);
        setMaterialsEnInput(initialData.materialsEn.join(", "));
      }

      // Extract category ID correctly, handling both object and string formats
      if (initialData.mainCategory) {
        const categoryId =
          typeof initialData.mainCategory === "object"
            ? initialData.mainCategory._id || initialData.mainCategory.id
            : initialData.mainCategory;

        setSelectedCategory(categoryId ? String(categoryId) : "");
      } else if (initialData.categoryId) {
        setSelectedCategory(
          initialData.categoryId ? String(initialData.categoryId) : ""
        );
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
      countInStock: 1,
      hashtags: [],
      ageGroups: [],
      sizes: [],
      colors: [],
      brandLogo: undefined,
      isOriginal: true,
      materials: [],
      materialsEn: [],
    });
    setHashtagsInput("");
    setErrors({});
    setServerError(null);
    setSuccess(null);
    setVideoFile(null);
    setVideoError(null);
    setVideoFile(null);
    setVideoError(null);
    setExistingYoutubeVideoUrl(null);
    setSelectedSubcategory("");
    setSelectedAgeGroups([]);
    setSelectedSizes([]);
    setSelectedColors([]);

    setDeliveryType("SoulArt");
    setMinDeliveryDays("");
    setMaxDeliveryDays("");
    setDiscountPercentage("");
    setDiscountStartDate("");
    setDiscountEndDate("");

    // Reset new fields
    setIsOriginal(true);
    setMaterials([]);
    setMaterialsInput("");
    setMaterialsEn([]);
    setMaterialsEnInput("");
    setDimensions({
      width: undefined,
      height: undefined,
      depth: undefined,
    });
    setAddToPortfolio(true);

    // Clear saved form data when resetting
    clearFormFromStorage();
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

  // Form data persistence key
  const FORM_DATA_KEY = `product-form-${isEdit ? formData._id : "new"}`;

  // Save form data to localStorage
  const saveFormToStorage = (data: typeof formData) => {
    try {
      const formDataToSave = {
        ...data,
        // Convert File objects to null for localStorage (can't serialize File objects)
        images: data.images.map((img) =>
          typeof img === "string" ? img : null
        ),
        brandLogo: typeof data.brandLogo === "string" ? data.brandLogo : null,
        materials,
        materialsEn,
        materialsInput,
        materialsEnInput,
        // Include additional state
        selectedCategory,
        selectedSubcategory,
        selectedAgeGroups,
        selectedSizes,
        selectedColors,
        hashtagsInput,
        deliveryType,
        minDeliveryDays,
        maxDeliveryDays,
        discountPercentage,
        discountStartDate,
        discountEndDate,
        addToPortfolio,
      };
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(formDataToSave));
    } catch (error) {
      console.error("Error saving form to localStorage:", error);
    }
  };

  // Load form data from localStorage
  const loadFormFromStorage = () => {
    try {
      const savedData = localStorage.getItem(FORM_DATA_KEY);
      if (savedData && !initialData) {
        const parsedData = JSON.parse(savedData);

        // Restore form data
        setFormData((prev) => ({
          ...prev,
          ...parsedData,
          // Filter out null images (File objects can't be restored)
          images:
            parsedData.images?.filter(
              (img: string | null) => typeof img === "string"
            ) || [],
          brandLogo: parsedData.brandLogo || undefined,
        }));

        // Restore additional state
        if (parsedData.selectedCategory)
          setSelectedCategory(parsedData.selectedCategory);
        if (parsedData.selectedSubcategory)
          setSelectedSubcategory(parsedData.selectedSubcategory);
        if (parsedData.selectedAgeGroups)
          setSelectedAgeGroups(parsedData.selectedAgeGroups);
        if (parsedData.selectedSizes)
          setSelectedSizes(parsedData.selectedSizes);
        if (parsedData.selectedColors)
          setSelectedColors(parsedData.selectedColors);
        if (parsedData.hashtagsInput)
          setHashtagsInput(parsedData.hashtagsInput);
        if (parsedData.deliveryType) setDeliveryType(parsedData.deliveryType);
        if (parsedData.minDeliveryDays)
          setMinDeliveryDays(parsedData.minDeliveryDays);
        if (parsedData.maxDeliveryDays)
          setMaxDeliveryDays(parsedData.maxDeliveryDays);
        if (parsedData.discountPercentage)
          setDiscountPercentage(parsedData.discountPercentage);
        if (parsedData.discountStartDate)
          setDiscountStartDate(parsedData.discountStartDate);
        if (parsedData.discountEndDate)
          setDiscountEndDate(parsedData.discountEndDate);
        if (parsedData.materials)
          setMaterials(parsedData.materials as string[]);
        if (parsedData.materialsInput)
          setMaterialsInput(parsedData.materialsInput as string);
        if (parsedData.materialsEn)
          setMaterialsEn(parsedData.materialsEn as string[]);
        if (parsedData.materialsEnInput)
          setMaterialsEnInput(parsedData.materialsEnInput as string);
        if (parsedData.addToPortfolio !== undefined) {
          setAddToPortfolio(Boolean(parsedData.addToPortfolio));
        }

        console.log("Form data restored from localStorage");
      }
    } catch (error) {
      console.error("Error loading form from localStorage:", error);
    }
  };

  // Clear saved form data
  const clearFormFromStorage = () => {
    try {
      localStorage.removeItem(FORM_DATA_KEY);
    } catch (error) {
      console.error("Error clearing form from localStorage:", error);
    }
  };

  // Load saved form data on component mount (only for new products)
  useEffect(() => {
    if (!isEdit) {
      const savedData = localStorage.getItem(FORM_DATA_KEY);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          if (parsedData.name || parsedData.description) {
            toast({
              title:
                language === "en"
                  ? "Form Data Restored"
                  : "ფორმის მონაცემები აღდგენილია",
              description:
                language === "en"
                  ? "Your previously entered data has been restored"
                  : "თქვენი წინათ შეყვანილი მონაცემები აღდგენილია",
            });
          }
        } catch (error) {
          console.error("Error parsing saved form data:", error);
        }
      }
      loadFormFromStorage();
    }
  }, [isEdit, language, toast]);

  // Save form data whenever it changes (debounced)
  useEffect(() => {
    if (!isEdit && formData.name) {
      // Only save if there's meaningful data
      setIsSaving(true);
      const timeoutId = setTimeout(() => {
        saveFormToStorage(formData);
        setIsSaving(false);
      }, 1000); // Debounce for 1 second

      return () => {
        clearTimeout(timeoutId);
        setIsSaving(false);
      };
    }
  }, [
    formData,
    selectedCategory,
    selectedSubcategory,
    selectedAgeGroups,
    selectedSizes,
    selectedColors,
    hashtagsInput,
    deliveryType,
    minDeliveryDays,
    maxDeliveryDays,
    discountPercentage,
    discountStartDate,
    discountEndDate,
    addToPortfolio,
    isEdit,
  ]);

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

  // Materials handling functions
  const handleMaterialsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMaterialsInput(value);

    // Update materials array in real-time
    const materialsArray = value
      ? value
          .split(",")
          .map((material) => material.trim())
          .filter((material) => material.length > 0)
      : [];

    setMaterials(materialsArray);
  };

  const handleMaterialsEnChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setMaterialsEnInput(value);

    const materialsArray = value
      ? value
          .split(",")
          .map((material) => material.trim())
          .filter((material) => material.length > 0)
      : [];

    setMaterialsEn(materialsArray);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files) {
      const newImages = Array.from(files);
      const totalImages = formData.images.length + newImages.length;
      const maxImages = 10;

      if (totalImages > maxImages) {
        setErrors((prev) => ({
          ...prev,
          images:
            language === "en"
              ? `Maximum ${maxImages} images allowed. You tried to add ${newImages.length} but already have ${formData.images.length}.`
              : `მაქსიმუმ ${maxImages} სურათის ატვირთვა შეიძლება. თქვენ ცდილობთ ${newImages.length}-ის დამატებას, მაგრამ უკვე გაქვთ ${formData.images.length}.`,
        }));
        // Reset file input
        e.target.value = "";
        return;
      }

      // Clear any previous image error
      setErrors((prev) => {
        const { images, ...rest } = prev;
        return rest;
      });

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

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setVideoFile(null);
      setVideoError(null);
      return;
    }

    const maxSizeMb = 500; // Increased to 500MB
    if (file.size > maxSizeMb * 1024 * 1024) {
      setVideoFile(null);
      setVideoError(
        language === "en"
          ? `Video file is too large. Maximum size is ${maxSizeMb}MB.`
          : `ვიდეოს ზომა არ უნდა აღემატებოდეს ${maxSizeMb}MB-ს.`
      );
      return;
    }

    setVideoFile(file);
    setVideoError(null);
    setVideoUploading(true);
    setVideoUploadProgress(
      language === "en" ? "Uploading to YouTube..." : "იტვირთება YouTube-ზე..."
    );

    try {
      // Create FormData for video upload
      const videoFormData = new FormData();
      videoFormData.append("video", file);
      videoFormData.append("productName", formData.name || "Product Video");
      videoFormData.append("productDescription", formData.description || "");
      videoFormData.append("price", String(formData.price || 0));
      videoFormData.append("brand", formData.brand || user?.name || "SoulArt");

      console.log("📹 Uploading video to YouTube immediately...", {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + "MB",
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/products/upload-video`,
        {
          method: "POST",
          body: videoFormData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Video upload failed");
      }

      const result = await response.json();
      console.log("✅ YouTube upload complete:", result);

      setUploadedYoutubeData({
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        embedUrl: result.embedUrl,
      });
      setVideoUploadProgress(
        language === "en"
          ? "✅ Uploaded to YouTube!"
          : "✅ აიტვირთა YouTube-ზე!"
      );

      toast({
        title: language === "en" ? "Video Uploaded" : "ვიდეო აიტვირთა",
        description:
          language === "en"
            ? "Video successfully uploaded to YouTube"
            : "ვიდეო წარმატებით აიტვირთა YouTube-ზე",
      });
    } catch (error) {
      console.error("❌ YouTube upload error:", error);
      setVideoError(
        language === "en"
          ? `Failed to upload video: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          : `ვიდეოს ატვირთვა ვერ მოხერხდა: ${
              error instanceof Error ? error.message : "უცნობი შეცდომა"
            }`
      );
      setUploadedYoutubeData(null);
      setVideoUploadProgress("");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoError(null);
    setUploadedYoutubeData(null);
    setVideoUploadProgress("");
    const input = document.getElementById(
      "productVideo"
    ) as HTMLInputElement | null;
    if (input) {
      input.value = "";
    }
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

      // Validate minimum price for SoulArt delivery
      if (deliveryType === "SoulArt" && formData.price < 12) {
        setErrors((prev) => ({
          ...prev,
          price: t("adminProducts.minimumPriceForSoulArt"),
        }));
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

      // With HTTP-only cookies, no need to check token manually
      // Server will handle authentication automatically

      if (videoError) {
        setPending(false);
        return;
      }

      const formDataToSend = new FormData();

      // Add basic form fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("nameEn", formData.nameEn || "");
      formDataToSend.append("price", String(formData.price));
      formDataToSend.append("description", formData.description);
      formDataToSend.append("descriptionEn", formData.descriptionEn || "");

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

      // Add new fields: isOriginal, dimensions, materials
      formDataToSend.append("isOriginal", String(isOriginal));
      if (dimensions.width || dimensions.height || dimensions.depth) {
        formDataToSend.append("dimensions", JSON.stringify(dimensions));
      }
      formDataToSend.append("materials", JSON.stringify(materials));
      formDataToSend.append("materialsEn", JSON.stringify(materialsEn));
      formDataToSend.append(
        "addToPortfolio",
        addToPortfolio ? "true" : "false"
      );

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

      // Add YouTube data if video was uploaded
      if (uploadedYoutubeData) {
        console.log("📹 Adding YouTube data to FormData:", uploadedYoutubeData);
        formDataToSend.append("youtubeVideoId", uploadedYoutubeData.videoId);
        formDataToSend.append("youtubeVideoUrl", uploadedYoutubeData.videoUrl);
        formDataToSend.append("youtubeEmbedUrl", uploadedYoutubeData.embedUrl);
      } else if (existingYoutubeVideoUrl) {
        console.log(
          "📹 Keeping existing YouTube URL:",
          existingYoutubeVideoUrl
        );
        formDataToSend.append("youtubeVideoUrl", existingYoutubeVideoUrl);
      } else {
        console.log("📹 No YouTube video data");
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

      // Log what we're sending
      console.log("📤 Sending product request:", {
        method,
        endpoint,
        hasVideo: formDataToSend.has("video"),
        imagesCount: formDataToSend.getAll("images").length,
        hasExistingImages: formDataToSend.has("existingImages"),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          method,
          body: formDataToSend,
          credentials: "include", // Use HTTP-only cookies for authentication
        }
      );

      console.log(
        "📥 Response received:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          toast({
            title:
              language === "en"
                ? "Authentication Required"
                : "ავტორიზაცია საჭიროა",
            description:
              language === "en"
                ? "Your session has expired. Please log in again."
                : "თქვენი სესია ამოიწურა. გთხოვთ ხელახლა შეხვიდეთ სისტემაში.",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }

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
      if (data?.youtubeVideoUrl) {
        setExistingYoutubeVideoUrl(data.youtubeVideoUrl);
      }
      const successMessage = isEdit
        ? t("adminProducts.productUpdatedSuccess")
        : t("adminProducts.productAddedSuccess");
      setSuccess(successMessage);
      setVideoFile(null);
      setVideoError(null);

      toast({
        title: isEdit
          ? t("adminProducts.productUpdatedToast")
          : t("adminProducts.productCreatedToast"),
        description: t("adminProducts.successTitle"),
      });

      // Send new product notification for new products only
      if (!isEdit && data?._id) {
        try {
          await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1"
            }/push/new-product`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                productId: data._id,
                productName: formData.name,
                productPrice: formData.price,
                productImage: data.images?.[0] || null,
                category: selectedCategory,
                subCategory: selectedSubcategory,
              }),
            }
          );
          console.log("✅ New product notification sent:", formData.name);
        } catch (notificationError) {
          console.error(
            "❌ Failed to send new product notification:",
            notificationError
          );
        }
      }

      // Clear saved form data on successful submission
      clearFormFromStorage();

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

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      materials,
      materialsEn,
    }));
  }, [materials, materialsEn]);

  // Warn user before leaving page with unsaved data
  useEffect(() => {
    const hasUnsavedData =
      !isEdit &&
      (formData.name ||
        formData.description ||
        formData.images.length > 0 ||
        selectedCategory ||
        selectedSubcategory);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData && !success) {
        e.preventDefault();
        e.returnValue =
          language === "en"
            ? "You have unsaved changes. Are you sure you want to leave?"
            : "თქვენ გაქვთ შეუნახავი ცვლილებები. დარწმუნებული ხართ რომ გსურთ გვერდის დატოვება?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    formData,
    selectedCategory,
    selectedSubcategory,
    isEdit,
    success,
    language,
  ]);

  const { stocks, totalCount, setStockCount } = useStocks({
    initialData,
    attributes: [selectedAgeGroups, selectedSizes, selectedColors],
  });

  // Don't render form if user is not authenticated and still loading
  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">
          {language === "en" ? "Loading..." : "იტვირთება..."}
        </span>
      </div>
    );
  }

  // Don't render form if user is not authenticated or not authorized
  if (!user || (!isSeller && user.role?.toLowerCase() !== "admin")) {
    return null; // Component will redirect via useEffect
  }

  return (
    <div className="create-product-form">
      {success && (
        <div className="success-message">
          <p className="text-center">{success}</p>
        </div>
      )}

      {/* Auto-save indicator and clear button */}
      {!isEdit && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isSaving && (
              <div className="flex items-center text-sm text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {language === "en" ? "Saving..." : "ინახება..."}
              </div>
            )}
            {!isSaving && formData.name && (
              <div className="text-sm text-green-600">
                ✓ {language === "en" ? "Auto-saved" : "ავტო-შენახვა"}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  language === "en"
                    ? "Are you sure you want to clear all form data?"
                    : "დარწმუნებული ხართ რომ გსურთ ფორმის მონაცემების გასუფთავება?"
                )
              ) {
                resetForm();
                toast({
                  title: language === "en" ? "Form Cleared" : "ფორმა გაიწმინდა",
                  description:
                    language === "en"
                      ? "All form data has been cleared"
                      : "ფორმის ყველა მონაცემი გაიწმინდა",
                });
              }
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {language === "en"
              ? "Clear saved form data"
              : "შენახული მონაცემების გასუფთავება"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="server-error">
            <p className="create-product-error text-center">{serverError}</p>
          </div>
        )}{" "}
        {/* Video and Images - Side by Side */}
        <div className="media-upload-row">
          {/* Video Section */}
          <div className="video-upload-section">
            <label htmlFor="productVideo">
              {language === "en" ? "Video" : "ვიდეო"}
              {/* Green checkmark when video uploaded */}
              {(uploadedYoutubeData || videoFile) && !videoUploading && (
                <span
                  className="video-success-check"
                  title={language === "en" ? "Uploaded" : "აიტვირთა"}
                >
                  ✓
                </span>
              )}
            </label>

            {/* Video uploading indicator */}
            {videoUploading && (
              <div className="video-uploading-indicator">
                <div className="video-upload-spinner"></div>
              </div>
            )}

            {!videoUploading &&
              (uploadedYoutubeData || videoFile ? (
                <div className="video-uploaded-input">
                  <span className="uploaded-text">
                    {language === "en" ? "Uploaded" : "ატვირთულია"}
                  </span>
                  <button
                    type="button"
                    className="remove-video-btn"
                    onClick={() => {
                      setVideoFile(null);
                      setUploadedYoutubeData(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <input
                  id="productVideo"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="video-file-input"
                  disabled={videoUploading}
                />
              ))}
            {videoError && <p className="create-product-error">{videoError}</p>}
          </div>

          {/* Images Section */}
          <div className="images-upload-section">
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
          </div>
        </div>
        {/* Image previews and video embed - full width below */}
        {(formData.images.length > 0 || uploadedYoutubeData) && (
          <div className="image-preview-container">
            {/* Video embed thumbnail first */}
            {uploadedYoutubeData && (
              <div className="image-preview video-preview">
                <iframe
                  src={uploadedYoutubeData.embedUrl}
                  width="100"
                  height="100"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video preview"
                  style={{ pointerEvents: "none" }}
                ></iframe>
                <div className="video-overlay-icon">▶</div>
              </div>
            )}
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
        )}
        {errors.images && (
          <p className="create-product-error">{errors.images}</p>
        )}
        {/* Price + Discount + Dates - All in one row on desktop */}
        <div className="price-discount-dates-row">
          <div className="price-input-wrapper">
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
          <div className="discount-input-wrapper">
            <label htmlFor="discountPercentage">
              % {language === "en" ? "discount" : "ფასდაკლება"}
            </label>
            <input
              id="discountPercentage"
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              className="create-product-input"
              placeholder="0"
              min={0}
              max={100}
              step={1}
            />
          </div>
          {/* Discount Dates - appear inline when discount is set */}
          {discountPercentage && parseFloat(discountPercentage) > 0 && (
            <>
              <div className="date-input-wrapper">
                <label htmlFor="discountStartDate">
                  {language === "en" ? "Start" : "დაწყ."}
                </label>
                <input
                  id="discountStartDate"
                  type="date"
                  value={discountStartDate}
                  onChange={(e) => setDiscountStartDate(e.target.value)}
                  className="create-product-input"
                />
              </div>
              <div className="date-input-wrapper">
                <label htmlFor="discountEndDate">
                  {language === "en" ? "End" : "დასრ."}
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
        {/* Portfolio checkbox - compact */}
        <label className="portfolio-checkbox-compact">
          <input
            type="checkbox"
            checked={addToPortfolio}
            onChange={(e) => setAddToPortfolio(e.target.checked)}
          />
          <span>
            {language === "en" ? "Add to portfolio" : "პორტფოლიოში დამატება"}
          </span>
        </label>
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
          <small
            style={{
              color: "#666",
              fontSize: "0.9rem",
              display: "block",
              marginTop: "4px",
            }}
          >
            {t("adminProducts.productDescriptionHint")}
          </small>
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
        {/* Original/Copy Section */}
        <div>
          <label>{language === "en" ? "Product Type" : "პროდუქტის ტიპი"}</label>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #e9ecef",
                backgroundColor:
                  isOriginal === true ? "#e3f2fd" : "transparent",
                transition: "all 0.2s",
                // flex: 1,
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (isOriginal !== true)
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                if (isOriginal !== true)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <input
                type="radio"
                name="isOriginal"
                value="true"
                checked={isOriginal === true}
                onChange={() => setIsOriginal(true)}
                style={{ marginRight: "6px" }}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                {language === "en" ? "Original" : "ორიგინალი"}
              </span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #e9ecef",
                backgroundColor:
                  isOriginal === false ? "#ffebee" : "transparent",
                transition: "all 0.2s",
                // flex: 1,
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (isOriginal !== false)
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                if (isOriginal !== false)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <input
                type="radio"
                name="isOriginal"
                value="false"
                checked={isOriginal === false}
                onChange={() => setIsOriginal(false)}
                style={{ marginRight: "6px" }}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                {language === "en" ? "Copy" : "ასლი"}
              </span>
            </label>
          </div>
          <small
            style={{
              color: "#666",
              fontSize: "0.85rem",
              display: "block",
              marginTop: "6px",
              lineHeight: "1.4",
            }}
          >
            {language === "en"
              ? "Original products are marked as authentic. Copies are reproductions."
              : "ორიგინალი პროდუქტები მონიშნულია როგორც ავთენტური. ასლები არის რეპროდუქციები."}
          </small>
        </div>
        {/* Dimensions Section */}
        <div>
          <label>{language === "en" ? "Dimensions (cm)" : "ზომები (სმ)"}</label>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                placeholder={language === "en" ? "Width" : "სიგანე"}
                value={dimensions.width || ""}
                onChange={(e) =>
                  setDimensions((prev) => ({
                    ...prev,
                    width: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="create-product-input"
                min={0}
                step={0.1}
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                placeholder={language === "en" ? "Height" : "სიმაღლე"}
                value={dimensions.height || ""}
                onChange={(e) =>
                  setDimensions((prev) => ({
                    ...prev,
                    height: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="create-product-input"
                min={0}
                step={0.1}
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                placeholder={language === "en" ? "Depth" : "სიღრმე"}
                value={dimensions.depth || ""}
                onChange={(e) =>
                  setDimensions((prev) => ({
                    ...prev,
                    depth: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="create-product-input"
                min={0}
                step={0.1}
              />
            </div>
          </div>
          <small
            style={{
              color: "#666",
              fontSize: "0.9rem",
              display: "block",
              marginTop: "4px",
            }}
          >
            {language === "en"
              ? "Enter dimensions in centimeters. Leave empty if not applicable."
              : "ნახატებისთვის სავალდებულოა შეიყვანეთ ზომები სანტიმეტრებში. დატოვეთ ცარიელი თუ არ არის საჭირო."}
          </small>
        </div>
        {/* Materials Section - Side by Side */}
        <div className="form-row-2">
          <div>
            <label htmlFor="materials">
              {language === "en"
                ? "Materials (Georgian)"
                : "მასალა/მასალები (ქართული)"}
            </label>
            <textarea
              id="materials"
              value={materialsInput}
              onChange={handleMaterialsChange}
              className="create-product-textarea"
              placeholder={
                language === "en"
                  ? "Enter materials separated by commas"
                  : "შეიყვანეთ მასალები მძიმეებით გამოყოფილი (მაგ. აკრილი, ტილო, ხე)"
              }
              rows={2}
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
                ? "List the materials used in this product. Separate with commas."
                : "ჩამოწერეთ ამ პროდუქტში გამოყენებული მასალები. გამოყავით მძიმეებით."}
            </small>
          </div>
          <div>
            <label htmlFor="materialsEn">
              {language === "en" ? "Materials (English)" : "მასალა ინგლისურად"}
            </label>
            <textarea
              id="materialsEn"
              value={materialsEnInput}
              onChange={handleMaterialsEnChange}
              className="create-product-textarea"
              placeholder={
                language === "en"
                  ? "Enter English equivalents separated by commas"
                  : "შეიყვანეთ ინგლისური ვერსიები მძიმეებით"
              }
              rows={2}
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
                ? "Optional. Provide English labels matching the Georgian list order."
                : "არასავალდებულოა. ჩაწერეთ შესაბამისი ინგლისური სახელწოდებები იგივე რიგით."}
            </small>
          </div>
        </div>
        {/* Materials preview */}
        {materials.length > 0 && (
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
              {language === "en" ? "Preview:" : "გადახედვა:"}
            </small>
            <div style={{ marginTop: "4px" }}>
              {materials.map((material, index) => (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#28a745",
                    color: "white",
                    padding: "2px 6px",
                    margin: "2px",
                    borderRadius: "3px",
                    fontSize: "0.8rem",
                  }}
                >
                  {material.trim()}
                </span>
              ))}
            </div>
            {materialsEn.length > 0 && (
              <div style={{ marginTop: "6px" }}>
                {materialsEn.map((material, index) => (
                  <span
                    key={`en-${index}`}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      padding: "2px 6px",
                      margin: "2px",
                      borderRadius: "3px",
                      fontSize: "0.8rem",
                    }}
                  >
                    {material.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Stock Section */}
        {stocks && stocks.length > 0 && (
          <div className="stock-section">
            {stocks.map((stock) => (
              <div
                key={`${stock.ageGroup} - ${stock.size} - ${stock.color}`}
                className="stock-info"
              >
                {stocks.length > 1 ? (
                  <label>
                    {stock.ageGroup
                      ? getLocalizedAgeGroupName(stock.ageGroup) + " - "
                      : ""}
                    {stock.size + " - " || ""}
                    {stock.color ? getLocalizedColorName(stock.color) : ""}
                  </label>
                ) : (
                  <label htmlFor="countInStock">
                    {t("adminProducts.stock")}
                  </label>
                )}
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
            ))}
          </div>
        )}
        {/* Category and Subcategory - Side by Side */}
        <div className="form-row-2">
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
          </div>
          <div>
            <label htmlFor="subcategory">
              {t("adminProducts.subcategory")}
            </label>
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
        {stocks?.length > 1 && (
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
        )}
        {/* Hashtags Section - moved before delivery */}
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
                {language === "en" ? "Preview:" : "გადახედვა:"}
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
        </div>
        <label>
          {language === "en" ? "Delivery Section" : "მიწოდების განყოფილება"}
        </label>
        <div className="delivery-section">
          <h3>მიწოდების ტიპი</h3>
          <div className="delivery-type-options form-row-2">
            <div className="delivery-type-option">
              <label htmlFor="soul-art-delivery">SoulArt მიწოდება</label>
              <input
                type="radio"
                name="deliveryType"
                id="soul-art-delivery"
                value="SoulArt"
                checked={deliveryType === "SoulArt"}
                onChange={() => setDeliveryType("SoulArt")}
              />
            </div>
            <div className="delivery-type-option">
              <label htmlFor="seller-delivery">გამყიდველის მიწოდება</label>
              <input
                type="radio"
                name="deliveryType"
                id="seller-delivery"
                value="SELLER"
                checked={deliveryType === "SELLER"}
                onChange={() => setDeliveryType("SELLER")}
              />
            </div>
          </div>
          {deliveryType === "SoulArt" && (
            <div
              className="info-message"
              style={{
                background:
                  "linear-gradient(135deg, rgba(1, 38, 69, 0.1), rgba(123, 86, 66, 0.05))",
                padding: "1rem",
                borderRadius: "8px",
                borderLeft: "4px solid #012645",
                marginTop: "0.75rem",
                fontSize: "0.9rem",
                color: "#012645",
              }}
            >
              <strong>ℹ️ მნიშვნელოვანი:</strong>
              <p style={{ marginTop: "0.5rem", marginBottom: "0" }}>
                SoulArt მიწოდება თბილისში ღირს 5% მინიმუმ 10 ლარი. გთხოვთ,
                პროდუქტის ფასი დააწესოთ მინიმუმ 12 ლარი, რაც მოიცავს:
              </p>
              <ul
                style={{
                  marginTop: "0.5rem",
                  marginBottom: "0",
                  paddingLeft: "1.5rem",
                }}
              >
                <li>10% საიტის საკომისიო</li>
                <li>10 ლარი მიწოდების ღირებულება</li>
              </ul>
            </div>
          )}

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
        {/* Brand Name */}
        <div>
          <label htmlFor="brand">{t("adminProducts.brand")}</label>
          <input
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            placeholder={t("adminProducts.enterBrandName")}
            className={"create-product-input"}
            disabled={isSeller}
            readOnly={isSeller}
          />
          {isSeller && (
            <p className="seller-info-text">
              {language === "en"
                ? "Brand name is automatically set to your store name"
                : "ბრენდის სახელი ავტომატურად დაყენებულია თქვენი მაღაზიის სახელზე, ეს სახელი გამოჩნდება როგორც ავტორი, შეცვლა შეგიძლიათ პროფილიდან"}
            </p>
          )}
          {errors.brand && (
            <p className="create-product-error">{errors.brand}</p>
          )}
        </div>
        {/* Brand Logo - Hidden but still submitted */}
        <div style={{ display: "none" }}>
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
            {!isSeller && (
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
            )}
            {isSeller && (
              <p className="seller-info-text">
                {language === "en"
                  ? "Brand logo is automatically set to your store logo. To change it, update your profile."
                  : "ბრენდის ლოგო ავტომატურად დაყენებულია თქვენი მაღაზიის ლოგოზე. შესაცვლელად განაახლეთ თქვენი პროფილი."}
              </p>
            )}
          </div>
          {errors.brandLogo && (
            <p className="create-product-error">{errors.brandLogo}</p>
          )}
        </div>
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
          formData.images.length === 0 ||
          (deliveryType === "SoulArt" && formData.price < 12)) && (
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
              {deliveryType === "SoulArt" && formData.price < 12 && (
                <li
                  style={{
                    color: "#ca8a04",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  • {t("adminProducts.minimumPriceForSoulArt")}
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
