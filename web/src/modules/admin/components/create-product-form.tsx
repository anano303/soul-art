"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { productSchema } from "@/modules/products/validation/product";
import { ZodError } from "zod";
import { ProductFormData } from "@/modules/products/validation/product";
import "./CreateProductForm.css";
import Image from "next/image";

const categories = [
  "პეიზაჟი",
  "პორტრეტი",
  "აბსტრაქცია",
  "შავ-თეთრი",
  "ანიმაციური",
  "ციფრული ილუსტრაციები",
  "სხვა",
];

interface CreateProductFormProps {
  initialData?: ProductFormData & { _id?: string };
}
export function CreateProductForm({ initialData }: CreateProductFormProps) {
  console.log("Initial Data in Form:", initialData);
  const router = useRouter();
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});
  const [formData, setFormData] = useState<ProductFormData>(
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

  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || "",
        brand: initialData.brand || "",
        // Check brandLogo type
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
    }
  }, [initialData]);

  const validateField = (field: keyof ProductFormData, value: unknown) => {
    try {
      productSchema.shape[field].parse(value);
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
        brandLogo: files[0], // ბრენდის ლოგოს მხოლოდ სახელი
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data on submit", formData);
    console.log("Initial Data:", initialData); // Debug log
    setPending(true);
    setServerError(null); // Clear previous server error

    try {
      // Validate image file type
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (
        formData.images.some(
          (image) =>
            image instanceof File && !allowedTypes.includes(image.type)
        )
      ) {
        setErrors((prev) => ({
          ...prev,
          images: "მხოლოდ JPG, JPEG და PNG ფორმატის სურათებია დაშვებული",
        }));
        setPending(false);
        return;
      }

      const formDataToSend = new FormData();

      // Add all fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "images" && key !== "brandLogo") {
          formDataToSend.append(key, String(value));
        }
      });

      // Add images
      if (formData.images) {
        formData.images.forEach((image) => {
          if (image instanceof File) {
            formDataToSend.append("images", image);
          }
        });
      }

      // Add brand logo
      if (formData.brandLogo instanceof File) {
        formDataToSend.append("brandLogo", formData.brandLogo);
      }

      const method = initialData?._id ? "PUT" : "POST";
      const endpoint = initialData?._id
        ? `/products/${initialData._id}`
        : "/products";

      console.log("Sending request:", {
        method,
        endpoint,
        formData: Object.fromEntries(formDataToSend),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          method,
          body: formDataToSend,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "პროდუქტის დამატება ვერ მოხერხდა"
        );
      }

      const data = await response.json();
      console.log("Server response:", data);

      toast({
        title: initialData?._id ? "Product updated" : "Product created",
        description: "Success!",
      });

      router.push("/admin/products");
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="server-error">
            <p className="create-product-error text-center">{serverError}</p>
          </div>
        )}
        <div>
          <label htmlFor="name">Product Name</label>
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
          <label htmlFor="category">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleCategoryChange}
            className="create-product-select"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="create-product-error">{errors.category}</p>
          )}
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
          <label htmlFor="brand">Brand</label>
          <input
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            placeholder="Enter brand name"
            required
          />
          {errors.brand && <p className="create-product-error">{errors.brand}</p>}
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
          <label htmlFor="brandLogo">Brand Logo</label>
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
          {errors.brandLogo && (
            <p className="create-product-error">{errors.brandLogo}</p>
          )}
        </div>

        {serverError && (
          <p className="create-product-error text-center">{serverError}</p>
        )}

        <button
          type="submit"
          className="create-product-button"
          disabled={pending || !formData.name}
        >
          {pending && <Loader2 className="loader" />}
          {initialData?._id ? "Update Product" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
