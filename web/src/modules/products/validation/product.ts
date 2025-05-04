import * as z from "zod";

const fileSchema = z.custom<File>((file) => {
  return file instanceof File;
}, "Must be a file");

export const productSchema = z.object({
  name: z.string().min(1, "პროდუქტის სახელი სავალდებულოა"),
  nameEn: z.string().optional(),
  description: z.string().min(5, "აღწერა უნდა იყოს მინიმუმ 5 სიმბოლო"),
  descriptionEn: z.string().optional(),
  brand: z.string().min(1, "ბრენდის სახელი სავალდებულოა"),
  category: z.string().min(1, "კატეგორია სავალდებულოა"),
  subcategory: z
    .string()
    .refine(
      (value) => value !== "" && value !== "default" && value !== undefined,
      {
        message: "გთხოვთ აირჩიოთ ქვეკატეგორია",
      }
    ),
  price: z.coerce.number().positive("ფასი უნდა იყოს დადებითი რიცხვი"),
  countInStock: z.coerce
    .number()
    .min(0, "მარაგის რაოდენობა არ შეიძლება იყოს უარყოფითი"),
  images: z.array(fileSchema).min(1, "მინიმუმ ერთი სურათი სავალდებულოა"),
  brandLogo: fileSchema.optional().nullable().or(z.literal("")),
  deliveryType: z
    .enum(["SELLER", "SoulArt"], {
      errorMap: () => ({ message: "მიწოდების ტიპი სავალდებულოა" }),
    })
    .optional()
    .nullable(),
  minDeliveryDays: z.number().optional().nullable(),
  maxDeliveryDays: z.number().optional().nullable(),
  dimensions: z
    .object({
      width: z.number().optional().nullable(),
      height: z.number().optional().nullable(),
      depth: z.number().optional().nullable(),
    })
    .optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Helper function to validate the form before submission
export const validateProductForm = (data: unknown) => {
  const result = productSchema.safeParse(data);
  if (!result.success) {
    // Format errors for display
    const formattedErrors = result.error.format();
    return { success: false, errors: formattedErrors };
  }
  return { success: true, data: result.data };
};
