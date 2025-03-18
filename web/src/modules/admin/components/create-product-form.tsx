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
// import { fetchWithAuth } from "@/lib/fetch-with-auth";

const categories = ["Fishing", "Hunting", "Camping", "Other"];

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

  useEffect(() => {
    // Handle success or error response for product creation
  }, [formData]);
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

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, files } = e.target;
  //   if (files) {
  //     setFormData((prev) => ({
  //       ...prev,
  //       [name]: Array.from(files), // მხოლოდ სახელები გადავა FormData-ში
  //     }));
  //   }
  // };
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
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0], // ბრენდის ლოგოს მხოლოდ სახელი
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data on submit", formData);
    console.log("Submitting form...");
    setPending(true);

    const result = productSchema.safeParse(formData);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Validation Error in `" + result.error.issues[0].path[0] + "`",
        description: result.error.issues[0].message,
      });
      setPending(false);
      return;
    }

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== "images" && key !== "brandLogo") {
        formDataToSend.append(key, String(value)); // სხვა ყველა მონაცემი
      }
    });

    formData.images.forEach((fileName: File) => {
      formDataToSend.append("images", fileName); // სურათების სახელები
    });

    if (formData.brandLogo) {
      formDataToSend.append("brandLogo", formData.brandLogo);
    }

    try {
      const method = initialData?._id ? "PUT" : "POST";
      const url = initialData?._id
        ? `${process.env.NEXT_PUBLIC_API_URL}/products/${initialData._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/products`;

      const response = await fetch(url, {
        method,
        headers: {
          Cookie: `access_token=${
            document.cookie
              .split("; ")
              .find((row) => row.startsWith("access_token="))
              ?.split("=")[1] || ""
          }`,
        },
        body: formDataToSend, // FormData, სადაც მხოლოდ ერთჯერ გაიგზავნება images
      });
      if (!response.ok) {
        throw new Error(
          initialData?._id
            ? "Failed to update product"
            : "Failed to create product"
        );
      }

      toast({
        title: initialData?._id
          ? "Product updated successfully"
          : "Product created successfully",
        description: initialData?._id
          ? "Your product has been updated."
          : "Your product has been added.",
      });

      router.push("/admin/products");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="create-product-form">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          {errors.brand && <p className="text-red-500">{errors.brand}</p>}
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
            <p className="text-red-500">{errors.countInStock}</p>
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
            required
          />

          {errors.brandLogo && (
            <p className="create-product-error">{errors.brandLogo}</p>
          )}
        </div>

        <button
          type="submit"
          className="create-product-button"
          disabled={pending || !formData.name}
          onClick={() => console.log("Button Clicked")}
        >
          {pending && <Loader2 className="loader" />}
          {initialData?._id ? "Update Product" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
