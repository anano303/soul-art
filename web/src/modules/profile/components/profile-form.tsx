"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/modules/auth/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { motion } from "framer-motion";
import "./ProfileForm.css";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

const formSchema = z
  .object({
    name: z.string().min(1, "სახელის შეყვანა აუცილებელია"),
    email: z.string().email("არასწორი ელ-ფოსტის ფორმატი"),
    password: z
      .string()
      .min(6, "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    storeName: z.string().optional(),
    phoneNumber: z.string().optional(),
    identificationNumber: z.string().optional(),
    accountNumber: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "პაროლები არ ემთხვევა",
      path: ["confirmPassword"],
    }
  );

export function ProfileForm() {
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const [shouldFetchUser, setShouldFetchUser] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [storeLogo, setStoreLogo] = useState("");
  const [isSellerAccount, setIsSellerAccount] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { user, isLoading } = useUser();

  useEffect(() => {
    setShouldFetchUser(true);
  }, []);

  useEffect(() => {
    if (user && user.profileImage) {
      setProfileImage(user.profileImage);
    }
    if (user) {
      setIsSellerAccount(user.role?.toUpperCase() === "SELLER");
      if (user.storeLogo) {
        setStoreLogo(user.storeLogo);
      }
    }
  }, [user]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      storeName: user?.storeName || "",
      phoneNumber: user?.phoneNumber || "",
      identificationNumber: user?.identificationNumber || "",
      accountNumber: user?.accountNumber || "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      try {
        // Start with empty payload
        const payload: Record<string, string | undefined> = {};

        // Only include fields that have been changed from their original values
        if (values.name !== user?.name) {
          payload.name = values.name;
        }

        if (values.email !== user?.email) {
          payload.email = values.email;
        }

        if (values.password) {
          payload.password = values.password;
        }

        // For seller fields, only add them if they've changed and the user is a seller
        if (user && user.role?.toUpperCase() === "SELLER") {
          if (
            values.storeName !== undefined &&
            values.storeName !== user?.storeName
          ) {
            payload.storeName = values.storeName;
          }

          if (
            values.phoneNumber !== undefined &&
            values.phoneNumber !== user?.phoneNumber
          ) {
            payload.phoneNumber = values.phoneNumber;
          }

          if (
            values.identificationNumber !== undefined &&
            values.identificationNumber !== user?.identificationNumber
          ) {
            payload.identificationNumber = values.identificationNumber;
          }

          if (
            values.accountNumber !== undefined &&
            values.accountNumber !== user?.accountNumber
          ) {
            payload.accountNumber = values.accountNumber;
          }
        }

        // Only proceed with the update if there are changes
        if (Object.keys(payload).length === 0) {
          return { message: "No changes to update" };
        }

        const response = await apiClient.put("/auth/profile", payload);
        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw { message: error.message };
        }
        throw { message: "Something went wrong" };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      form.reset({ password: "", confirmPassword: "" });

      toast({
        title: "პროფილი განახლდა",
        description: "თქვენი პროფილი წარმატებით განახლდა.",
      });

      if (data.passwordChanged) {
        toast({
          title: "პაროლი განახლდა",
          description: "თქვენი პაროლი წარმატებით შეიცვალა.",
        });
      }
    },
    onError: (error) => {
      const errorMessage =
        (error as { message?: string }).message ||
        "პროფილის განახლება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.";
      toast({
        title: "შეცდომა",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadSuccess(false);

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/users/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProfileImage(response.data.profileImage);
      setUploadSuccess(true);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast({
        title: "Error",
        description: "Failed to upload profile image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    try {
      setIsUploading(true);

      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/users/seller-logo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setStoreLogo(response.data.logoUrl);
      setUploadSuccess(true);

      toast({
        title: "Success",
        description: "Store logo updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading store logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload store logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const triggerLogoInput = () => {
    if (logoInputRef.current) {
      logoInputRef.current.click();
    }
  };

  if (!shouldFetchUser || isLoading) {
    return <div className="loading-container">პროფილი იტვირთება...</div>;
  }

  return (
    <div className="card">
      <h2>მომხმარებლის პროფილი</h2>

      <div className="profile-images-container">
        {/* User profile image section */}
        <div className="profile-image-section">
          {profileImage && (
            <div className="profile-image-container">
              <Image
                src={profileImage}
                alt="Profile"
                width={150}
                height={150}
                className="profile-image"
              />
            </div>
          )}
          <div>
            <input
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file-input"
              accept="image/*"
            />
            <button
              onClick={triggerFileInput}
              disabled={isUploading}
              className="upload-button"
            >
              {isUploading ? "იტვირთება..." : "პროფილის სურათის ატვირთვა"}
            </button>
            {uploadSuccess && (
              <div className="upload-success">სურათი წარმატებით აიტვირთა</div>
            )}
          </div>
        </div>

        {/* Seller logo section - only show for seller accounts */}
      </div>

      <form
        onSubmit={form.handleSubmit((values) => updateProfile.mutate(values))}
        className="space-y-6"
      >
        <div className="form-field">
          <label htmlFor="name" className="label">
            სახელი
          </label>
          <input id="name" {...form.register("name")} className="input" />
          {form.formState.errors.name && (
            <span className="error-message">
              {form.formState.errors.name.message}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="email" className="label">
            ელ-ფოსტა
          </label>
          <input
            id="email"
            type="email"
            {...form.register("email")}
            className="input"
          />
          {form.formState.errors.email && (
            <span className="error-message">
              {form.formState.errors.email.message}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="password" className="label">
            ახალი პაროლი
          </label>
          <input
            id="password"
            type="password"
            {...form.register("password")}
            placeholder="დატოვეთ ცარიელი არსებული პაროლის შესანარჩუნებლად"
            className="input"
          />
          {form.formState.errors.password && (
            <span className="error-message">
              {form.formState.errors.password.message}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="confirmPassword" className="label">
            გაიმეორეთ ახალი პაროლი
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
            placeholder="დატოვეთ ცარიელი არსებული პაროლის შესანარჩუნებლად"
            className="input"
          />
          {form.formState.errors.confirmPassword && (
            <span className="error-message">
              {form.formState.errors.confirmPassword.message}
            </span>
          )}
        </div>

        {user &&
          user.role &&
          (user.role.toUpperCase() === "SELLER" || isSellerAccount) && (
            <div className="seller-section">
              <h2 className="seller-section-title">Store Information</h2>

              <div className="seller-logo-container">
                <Image
                  src={storeLogo || "/store-placeholder.jpg"}
                  alt="Store Logo"
                  width={120}
                  height={120}
                  className="seller-logo"
                />
                <button
                  type="button"
                  onClick={triggerLogoInput}
                  className="upload-button"
                >
                  {isUploading ? "Uploading..." : "Change Store Logo"}
                </button>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoChange}
                  accept="image/*"
                  className="file-input"
                />
              </div>

              <div className="seller-form-grid">
                <div className="form-field">
                  <label htmlFor="storeName" className="label">
                    Store Name
                  </label>
                  <input
                    id="storeName"
                    {...form.register("storeName")}
                    className="input"
                  />
                  {form.formState.errors.storeName && (
                    <span className="error-message">
                      {form.formState.errors.storeName.message}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="phoneNumber" className="label">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    {...form.register("phoneNumber")}
                    className="input"
                    placeholder="+995..."
                  />
                  {form.formState.errors.phoneNumber && (
                    <span className="error-message">
                      {form.formState.errors.phoneNumber.message}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="identificationNumber" className="label">
                    ID Number
                  </label>
                  <input
                    id="identificationNumber"
                    {...form.register("identificationNumber")}
                    className="input"
                  />
                  {form.formState.errors.identificationNumber && (
                    <span className="error-message">
                      {form.formState.errors.identificationNumber.message}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="accountNumber" className="label">
                    IBAN
                  </label>
                  <input
                    id="accountNumber"
                    {...form.register("accountNumber")}
                    className="input"
                    placeholder="GE..."
                  />
                  {form.formState.errors.accountNumber && (
                    <span className="error-message">
                      {form.formState.errors.accountNumber.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

        <button
          type="submit"
          className="ProfileButton"
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending
            ? "მიმდინარეობს განახლება..."
            : "პროფილის განახლება"}
        </button>
      </form>
      {updateProfile.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="success-message"
        >
          🎉 პროფილი წარმატებით განახლდა!
        </motion.div>
      )}
    </div>
  );
}
