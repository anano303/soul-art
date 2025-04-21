"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { productSchema } from "@/modules/products/validation/product";
import { ZodError } from "zod";
import { ProductFormData as BaseProductFormData } from "@/modules/products/validation/product";

// Extended ProductFormData to include categoryStructure
interface ProductFormData extends BaseProductFormData {
  categoryStructure?: {
    main: MainCategory;
    sub: string;
  };
}
import "./CreateProductForm.css";
import Image from "next/image";
import { getAccessToken } from "@/lib/auth";
import { useUser } from "@/modules/auth/hooks/use-user";

// Ensure enum values are the same as what we expect from the database
enum MainCategory {
  PAINTINGS = "PAINTINGS",
  HANDMADE = "HANDMADE",
}

// Make sure this object uses the same keys as in the MainCategory enum
const categoryStructure = {
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

interface CreateProductFormProps {
  initialData?: ProductFormData & { _id?: string };
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
  console.log("Initial Data in Form:", initialData);
  const router = useRouter();
  const { user } = useUser();
  const isSeller = user?.role?.toLowerCase() === "seller";

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});
  const [formData, setFormData] = useState<ProductFormData & { _id?: string }>(
    initialData || {
      name: "",
      price: 0,
      description: "",
      images: [],
      brand: "",
      category: "",
      countInStock: 0,
      brandLogo: undefined,
    }
  );

  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>(
    initialData?.categoryStructure?.main || MainCategory.PAINTINGS
  );
  const [deliveryType, setDeliveryType] = useState<"SELLER" | "SoulArt">(
    "SoulArt"
  );
  const [minDeliveryDays, setMinDeliveryDays] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");

  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-fill seller info when user data loads
  useEffect(() => {
    if (user && isSeller && !isEdit) {
      setFormData((prevData) => ({
        ...prevData,
        brand: user.name || user.storeName || "",
        brandLogo: user.storeLogo || undefined,
      }));
    }
  }, [user, isSeller, isEdit]);

  useEffect(() => {
    if (initialData) {
      console.log("Initial Data in Form:", initialData);

      setFormData((prev) => ({
        ...prev,
        _id: initialData._id,
        name: initialData.name || "",
        brand: initialData.brand || "",
        brandLogo:
          typeof initialData.brandLogo === "string"
            ? initialData.brandLogo
            : undefined,
        category: initialData.category || "",
        images: initialData.images || [],
        description: initialData.description || "",
        price: initialData.price || 0,
        countInStock: initialData.countInStock || 0,
      }));

      if (initialData.deliveryType) {
        setDeliveryType(initialData.deliveryType as "SELLER" | "SoulArt");
      }
      if (initialData.minDeliveryDays) {
        setMinDeliveryDays(initialData.minDeliveryDays.toString());
      }
      if (initialData.maxDeliveryDays) {
        setMaxDeliveryDays(initialData.maxDeliveryDays.toString());
      }

      // Fix dimensions parsing - handle both object and string formats
      if (initialData.dimensions) {
        let dimensionsObj;

        // If dimensions is a string, parse it
        if (typeof initialData.dimensions === "string") {
          try {
            dimensionsObj = JSON.parse(initialData.dimensions);
            console.log("Parsed dimensions from string:", dimensionsObj);
          } catch (error) {
            console.error("Error parsing dimensions:", error);
            dimensionsObj = {};
          }
        } else {
          // If it's already an object
          dimensionsObj = initialData.dimensions;
          console.log("Using dimensions as object:", dimensionsObj);
        }

        // Set dimensions values
        if (dimensionsObj) {
          if (dimensionsObj.width) {
            setWidth(dimensionsObj.width.toString());
          }
          if (dimensionsObj.height) {
            setHeight(dimensionsObj.height.toString());
          }
          if (dimensionsObj.depth) {
            setDepth(dimensionsObj.depth.toString());
          }
        }
      }

      // Handle category structure if available
      if (initialData.categoryStructure) {
        // Check if the value from the API matches our enum values
        const mainCat = initialData.categoryStructure.main;
        // Make sure we use a valid value that exists in our enum
        if (mainCat && Object.values(MainCategory).includes(mainCat as MainCategory)) {
          setSelectedMainCategory(mainCat as MainCategory);
        } else {
          // Default to PAINTINGS if the value doesn't match
          setSelectedMainCategory(MainCategory.PAINTINGS);
        }
      } else {
        // Default for legacy products without category structure
        setSelectedMainCategory(MainCategory.PAINTINGS);
      }
    }
  }, [initialData]);

  const resetForm = () => {
    setFormData({
      name: "",
      price: 0,
      description: "",
      images: [],
      brand: "",
      category: "",
      countInStock: 0,
      brandLogo: undefined,
    });
    setErrors({});
    setServerError(null);
    setSuccess(null);

    setDeliveryType("SoulArt");
    setMinDeliveryDays("");
    setMaxDeliveryDays("");
    setWidth("");
    setHeight("");
    setDepth("");
  };

  const validateField = (field: keyof ProductFormData, value: unknown) => {
    try {
      // Check if the field exists in productSchema before validating
      if (field in productSchema.shape) {
        const shape = productSchema.shape as Record<string, {parse(value: unknown): unknown}>;
        shape[field].parse(value);
      }
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors((prev) => ({ ...prev, [field]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "price" || name === "countInStock" ? Number(value) : value,
    }));
  };

  const handleMainCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMainCategory = e.target.value as MainCategory;
    setSelectedMainCategory(newMainCategory);
    setFormData((prev) => ({
      ...prev,
      category: "", // Reset subcategory when main category changes
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      category: e.target.value,
    }));
    validateField("category", e.target.value);
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

  const handleBrandLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        brandLogo: files[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data on submit", formData);
    console.log("Initial Data:", initialData);
    setPending(true);
    setServerError(null);
    setSuccess(null);

    try {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (
        formData.images.some(
          (image) => image instanceof File && !allowedTypes.includes(image.type)
        )
      ) {
        setErrors((prev) => ({
          ...prev,
          images: "მხოლოდ JPG, JPEG და PNG ფორმატის სურათებია დაშვებული",
        }));
        setPending(false);
        return;
      }

      // Verify we have at least one image
      if (formData.images.length === 0) {
        setErrors((prev) => ({
          ...prev,
          images: "მინიმუმ ერთი სურათი მაინც უნდა აიტვირთოს",
        }));
        setPending(false);
        return;
      }

      if (deliveryType === "SELLER" && (!minDeliveryDays || !maxDeliveryDays)) {
        setServerError(
          "გთხოვთ მიუთითოთ მიწოდების დრო თუ გამყიდველი ასრულებს მიწოდებას."
        );
        setPending(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setServerError("ავტორიზაცია ვერ მოხერხდა. გთხოვთ, შეხვიდეთ თავიდან.");
        setPending(false);
        setTimeout(() => {
          window.location.href = "/login?redirect=/admin/products";
        }, 2000);
        return;
      }

      const formDataToSend = new FormData();

      // Add basic form fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("price", String(formData.price));
      formDataToSend.append("description", formData.description);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("countInStock", String(formData.countInStock));

      // Handle brand name
      if (isSeller) {
        formDataToSend.append(
          "brand",
          user?.name || user?.storeName || formData.brand
        );
      } else {
        formDataToSend.append("brand", formData.brand);
      }

      // SIMPLIFIED logo handling - THIS IS THE FIX
      // For new uploads (File objects)
      if (formData.brandLogo instanceof File) {
        console.log("Sending brand logo file", formData.brandLogo.name);
        formDataToSend.append("brandLogo", formData.brandLogo);
      } 
      // For existing logo URLs - just pass the URL as a string
      else if (typeof formData.brandLogo === "string" && formData.brandLogo) {
        console.log("Sending brand logo URL", formData.brandLogo);
        formDataToSend.append("brandLogoUrl", formData.brandLogo);
      }
      // For sellers with profiles - use their store logo
      else if (isSeller && user?.storeLogo) {
        console.log("Using seller store logo from profile", user.storeLogo);
        formDataToSend.append("brandLogoUrl", user.storeLogo);
      }

      // Add delivery type
      formDataToSend.append("deliveryType", deliveryType);

      // Add delivery days if SELLER type
      if (deliveryType === "SELLER") {
        formDataToSend.append("minDeliveryDays", minDeliveryDays);
        formDataToSend.append("maxDeliveryDays", maxDeliveryDays);
      }

      // Add dimensions if provided
      if (width || height || depth) {
        const dimensionsObj: Record<string, string> = {};
        if (width) dimensionsObj["width"] = width;
        if (height) dimensionsObj["height"] = height;
        if (depth) dimensionsObj["depth"] = depth;
        formDataToSend.append("dimensions", JSON.stringify(dimensionsObj));
      }

      // Add category structure to form data
      formDataToSend.append("categoryStructure", JSON.stringify({
        main: selectedMainCategory,
        sub: formData.category,
      }));

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
          images: "მინიმუმ ერთი სურათი მაინც უნდა აიტვირთოს",
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
          images: "მინიმუმ ერთი სურათი მაინც უნდა აიტვირთოს",
        }));
        setPending(false);
        return;
      }

      console.log("===== Form Data Contents =====");
      for (const [key, value] of formDataToSend.entries()) {
        if (key === "images") {
          console.log(`${key}: [File object]`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      console.log("=============================");

      const method = isEdit ? "PUT" : "POST";
      const endpoint = isEdit ? `/products/${formData._id}` : "/products";

      console.log("Sending request:", {
        method,
        endpoint,
      });

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
        let errorMessage = "ნამუშევრის დამატება/განახლება ვერ მოხერხდა";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Server response:", data);
      const successMessage = isEdit
        ? "ნამუშევარი წარმატებით განახლდა!"
        : "ნამუშევარი წარმატებით დაემატა!";
      setSuccess(successMessage);

      toast({
        title: isEdit ? "ნამუშევარი განახლდა" : "ნამუშევარი დაემატა",
        description: "წარმატებით!",
      });

      if (!isEdit) {
        resetForm();
      }

      if (onSuccess) {
        onSuccess(data);
      } else {
        setTimeout(() => {
          router.push("/admin/products");
        }, 1500);
      }
    } catch (error) {
      console.error("Error:", error);
      setServerError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setPending(false);
    }
  };

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
        )}
        <div>
          <label htmlFor="name">ნამუშევარის სახელი</label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="create-product-input"
            required
          />
          {errors.name && <p className="create-product-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="description">Description</label>
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
        </div>

        <div>
          <label htmlFor="price">Price</label>
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

        <div>
          <label htmlFor="mainCategory">მთავარი კატეგორია</label>
          <select
            name="mainCategory"
            value={selectedMainCategory}
            onChange={handleMainCategoryChange}
            className="create-product-select"
          >
            <option value={MainCategory.PAINTINGS}>ნახატები</option>
            <option value={MainCategory.HANDMADE}>ხელნაკეთი ნივთები</option>
          </select>
        </div>

        <div>
          <label htmlFor="category">ქვეკატეგორია</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleCategoryChange}
            className="create-product-select"
          >
            <option value="">აირჩიეთ ქვეკატეგორია</option>
            {/* Add a safety check to ensure categoryStructure[selectedMainCategory] exists */}
            {categoryStructure[selectedMainCategory] && 
              categoryStructure[selectedMainCategory].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))
            }
          </select>
          {errors.category && (
            <p className="create-product-error">{errors.category}</p>
          )}
        </div>

        <div>
          <label>მიუთითეთ ნახატის ზომები (არასავალდებულოა)</label>
          <div className="dimensions-inputs">
            <div className="dimension-input">
              <label htmlFor="width">სიგანე (სმ)</label>
              <input
                id="width"
                type="number"
                min="0"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="create-product-input"
              />
            </div>
            <div className="dimension-input">
              <label htmlFor="height">სიმაღლე (სმ)</label>
              <input
                id="height"
                type="number"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="create-product-input"
              />
            </div>
            <div className="dimension-input">
              <label htmlFor="depth">სიღრმე (სმ)</label>
              <input
                id="depth"
                type="number"
                min="0"
                step="0.1"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="create-product-input"
              />
            </div>
          </div>
        </div>

        <div>
          <label>მიტანის ტიპი</label>
          <div className="delivery-options">
            <div className="delivery-type-selector">
              <div className="delivery-type-option">
                <input
                  type="radio"
                  id="soulart-delivery"
                  name="deliveryType"
                  checked={deliveryType === "SoulArt"}
                  onChange={() => setDeliveryType("SoulArt")}
                />
                <label htmlFor="soulart-delivery">SoulArt-ის კურიერი</label>
              </div>
              <div className="delivery-type-option">
                <input
                  type="radio"
                  id="seller-delivery"
                  name="deliveryType"
                  checked={deliveryType === "SELLER"}
                  onChange={() => setDeliveryType("SELLER")}
                />
                <label htmlFor="seller-delivery">გამყიდველი</label>
              </div>
            </div>

            {deliveryType === "SELLER" && (
              <div className="delivery-days">
                <div>
                  <label htmlFor="minDeliveryDays">
                    მინიმალური ვადა (დღეები)
                  </label>
                  <input
                    id="minDeliveryDays"
                    type="number"
                    min="1"
                    value={minDeliveryDays}
                    onChange={(e) => setMinDeliveryDays(e.target.value)}
                    className="create-product-input"
                    required={deliveryType === "SELLER"}
                  />
                </div>
                <div>
                  <label htmlFor="maxDeliveryDays">
                    მაქსიმალური ვადა (დღეები)
                  </label>
                  <input
                    id="maxDeliveryDays"
                    type="number"
                    min="1"
                    value={maxDeliveryDays}
                    onChange={(e) => setMaxDeliveryDays(e.target.value)}
                    className="create-product-input"
                    required={deliveryType === "SELLER"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="images">Product Images</label>
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
              გთხოვთ აირჩიოთ მინიმუმ ერთი სურათი
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
          <label htmlFor="brand">მხატვრის/კომპანიის სახელი</label>
          <input
            id="brand"
            name="brand"
            value={
              isSeller
                ? user?.name || user?.storeName || formData.brand
                : formData.brand
            }
            onChange={isSeller ? undefined : handleChange}
            placeholder="Enter brand name"
            disabled={isSeller}
            className={
              isSeller
                ? "create-product-input disabled"
                : "create-product-input"
            }
            required
          />
          {errors.brand && (
            <p className="create-product-error">{errors.brand}</p>
          )}
          {isSeller && (
            <p className="brand-notice">
              მხატვრის/კომპანიის სახელი ავტომატურად ივსება თქვენი პროფილიდან
            </p>
          )}
        </div>
        <div>
          <label htmlFor="countInStock">Stock Count</label>
          <input
            id="countInStock"
            name="countInStock"
            type="number"
            value={formData.countInStock}
            onChange={handleChange}
            min={0}
            required
          />
          {errors.countInStock && (
            <p className="create-product-error">{errors.countInStock}</p>
          )}
        </div>

        <div>
          <label htmlFor="brandLogo">
            მხატვრის/კომპანიის ლოგო (არასავალდებულო)
          </label>
          {/* For seller accounts, show their existing logo */}
          {isSeller &&
          (user?.storeLogo ||
            (typeof formData.brandLogo === "string" && formData.brandLogo)) ? (
            <div className="brand-logo-container">
              <div className="image-preview">
                <Image
                  loader={({ src }) => src}
                  src={
                    user?.storeLogo ||
                    (typeof formData.brandLogo === "string"
                      ? formData.brandLogo
                      : "")
                  }
                  alt="Brand logo preview"
                  width={100}
                  height={100}
                  unoptimized
                  className="preview-image"
                />
              </div>
              <p className="brand-notice">
                ლოგო ავტომატურად მოიტანება თქვენი პროფილიდან
              </p>
            </div>
          ) : !isSeller ? (
            <>
              <input
                id="brandLogo"
                name="brandLogo"
                type="file"
                accept="image/*"
                onChange={handleBrandLogoChange}
                className="create-product-file"
              />
              {formData.brandLogo && typeof formData.brandLogo === "string" && (
                <div className="image-preview">
                  <Image
                    loader={({ src }) => src}
                    src={formData.brandLogo}
                    alt="Brand logo preview"
                    width={100}
                    height={100}
                    unoptimized
                    className="preview-image"
                  />
                </div>
              )}
              <p className="logo-optional-note">
                ლოგოს დამატება არასავალდებულოა
              </p>
            </>
          ) : (
            <div className="no-logo-message">
              <p>
                ლოგო არ არის მითითებული თქვენს პროფილში. პროდუქტი შეიქმნება
                ლოგოს გარეშე, ან შეგიძლიათ{" "}
                <a href="/profile">პროფილის გვერდზე</a> დაამატოთ ლოგო.
              </p>
            </div>
          )}
          {errors.brandLogo && (
            <p className="create-product-error">{errors.brandLogo}</p>
          )}
        </div>

        <button
          type="submit"
          className="create-product-button"
          disabled={pending || !formData.name}
        >
          {pending && <Loader2 className="loader" />}
          {isEdit ? "ნამუშევარის განახლება" : "ნამუშევარის დამატება"}
        </button>
      </form>
    </div>
  );
}
