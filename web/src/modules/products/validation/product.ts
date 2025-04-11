import * as z from "zod";

const fileSchema = z.custom<File>((file) => {
  return file instanceof File;
}, "Must be a file");

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  brand: z.string().min(1, "Brand name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be positive"),
  countInStock: z.coerce.number().min(0, "Stock cannot be negative"),
  images: z.array(fileSchema).min(1, "At least one image is required"),
  brandLogo: fileSchema.optional(),
  deliveryType: z.enum(["SELLER", "SoulArt"]).optional(),
  minDeliveryDays: z.number().optional(),
  maxDeliveryDays: z.number().optional(),
  dimensions: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      depth: z.number().optional(),
    })
    .optional(),
  
});

export type ProductFormData = z.infer<typeof productSchema>;
