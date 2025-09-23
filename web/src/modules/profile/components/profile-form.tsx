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
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";

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
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [isSellerAccount, setIsSellerAccount] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { user, isLoading } = useUser();
  const { t } = useLanguage();

  // Use manual invalidation instead of refetch
  const refreshUserData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user"] });
  }, [queryClient]);

  useEffect(() => {
    setShouldFetchUser(true);
  }, []);

  useEffect(() => {
    if (shouldFetchUser) {
      refreshUserData();
    }
  }, [shouldFetchUser, refreshUserData]);

  useEffect(() => {
    if (user) {
      console.log("User data loaded:", {
        name: user.name,
        role: user.role,
        hasProfileImage: !!user.profileImage,
        hasStoreLogo: !!user.storeLogo,
        storeLogo: user.storeLogo,
      });

      if (user.profileImage) {
        setProfileImage(`${user.profileImage}`);
      }

      setIsSellerAccount(user.role?.toUpperCase() === "SELLER");

      if (user.storeLogo) {
        setLogoError(false);
        console.log("Setting store logo:", user.storeLogo);
        setStoreLogo(user.storeLogo);
      } else {
        console.log("No store logo found in user data");
        setStoreLogo(null);
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
        const payload: Record<string, string | undefined> = {};

        if (values.name !== user?.name) {
          payload.name = values.name;
        }

        if (values.email !== user?.email) {
          payload.email = values.email;
        }

        if (values.password) {
          payload.password = values.password;
        }

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
        title: t("profile.updateSuccess"),
        description: t("profile.updateSuccessDescription"),
      });

      if (data.passwordChanged) {
        toast({
          title: t("profile.passwordChanged"),
          description: t("profile.passwordChangedDescription"),
        });
      }
    },
    onError: (error) => {
      const errorMessage =
        (error as { message?: string }).message ||
        t("profile.updateErrorDescription");
      toast({
        title: t("profile.updateError"),
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

      const cacheBustingUrl = `${
        response.data.profileImage
      }?t=${new Date().getTime()}`;
      setProfileImage(cacheBustingUrl);

      queryClient.invalidateQueries({ queryKey: ["user"] });

      setUploadSuccess(true);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast({
        title: t("profile.uploadError"),
        description: t("profile.uploadErrorDescription"),
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
      setLogoError(false);

      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      console.log("Uploading logo file:", file.name);

      const response = await apiClient.post("/users/seller-logo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Logo upload response:", response.data);

      if (response.data && response.data.logoUrl) {
        console.log("Setting new logo URL:", response.data.logoUrl);
        setStoreLogo(response.data.logoUrl);
        setUploadSuccess(true);

        // Use the refreshUserData function instead of refetch
        refreshUserData();

        toast({
          title: t("profile.logoUploadSuccess"),
          description: t("profile.logoUploadSuccessDescription"),
        });
      } else {
        throw new Error("Logo URL not found in response");
      }
    } catch (error) {
      console.error("Error uploading store logo:", error);
      setLogoError(true);
      toast({
        title: t("profile.logoUploadError"),
        description: t("profile.logoUploadErrorDescription"),
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

  const getColorFromName = (name: string): string => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#9370DB",
      "#48A36D",
      "#F9A03F",
      "#D46A6A",
      "#4A90E2",
      "#9C27B0",
      "#673AB7",
      "#3F51B5",
      "#2196F3",
      "#009688",
      "#4CAF50",
      "#8BC34A",
      "#CDDC39",
    ];

    if (!name) return colors[0];

    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }

    return colors[sum % colors.length];
  };

  const AvatarInitial = ({ name }: { name: string }) => {
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    const bgColor = getColorFromName(name);

    return (
      <div
        className="avatar-initial"
        style={{
          backgroundColor: bgColor,
          width: "150px",
          height: "150px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          fontSize: "4rem",
          fontWeight: "bold",
          color: "white",
          textTransform: "uppercase",
        }}
      >
        {initial}
      </div>
    );
  };

  if (!shouldFetchUser || isLoading) {
    return <div className="loading-container">{t("profile.loading")}</div>;
  }

  return (
    <div className="card">
      <h2>{t("profile.title")}</h2>

      <div className="profile-images-container">
        <div className="profile-image-section">
          {profileImage ? (
            <div className="profile-image-container">
              <Image
                src={profileImage}
                alt="Profile"
                width={150}
                height={150}
                className="profile-image"
                unoptimized
              />
            </div>
          ) : (
            <div className="profile-image-container">
              <AvatarInitial name={user?.name || ""} />
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
              {isUploading ? t("profile.uploading") : t("profile.uploadAvatar")}
            </button>
            {uploadSuccess && (
              <div className="upload-success">{t("profile.uploadSuccess")}</div>
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit((values) => updateProfile.mutate(values))}
        className="space-y-6"
      >
        <div className="form-field">
          <label htmlFor="name" className="label">
            {t("profile.name")}
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
            {t("profile.email")}
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
            {t("profile.newPassword")}
          </label>
          <input
            id="password"
            type="password"
            {...form.register("password")}
            placeholder={t("profile.passwordPlaceholder") as string}
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
            {t("profile.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
            placeholder={t("profile.passwordPlaceholder") as string}
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
              <h2 className="seller-section-title">
                {t("profile.sellerInfo")}
              </h2>

              <div className="seller-logo-container">
                {isUploading ? (
                  <div className="loading-logo">{t("profile.logoLoading")}</div>
                ) : (
                  <>
                    {logoError ? (
                      <div className="logo-error">{t("profile.logoError")}</div>
                    ) : storeLogo ? (
                      <div
                        className="logo-wrapper"
                        style={{
                          position: "relative",
                          width: "120px",
                          height: "120px",
                          marginBottom: "1rem",
                        }}
                      >
                        <Image
                          src={storeLogo}
                          alt={t("profile.storeName") as string}
                          width={120}
                          height={120}
                          style={{
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                          onError={() => {
                            console.error("Logo failed to load:", storeLogo);
                            setLogoError(true);
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="no-logo-placeholder"
                        style={{
                          width: "120px",
                          height: "120px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#f0f0f0",
                          borderRadius: "8px",
                          fontSize: "14px",
                          color: "#666",
                        }}
                      >
                        {t("profile.noLogo")}
                      </div>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={triggerLogoInput}
                  className="upload-button"
                  disabled={isUploading}
                >
                  {isUploading
                    ? t("profile.uploading")
                    : t("profile.uploadLogo")}
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
                    {t("profile.storeName")}
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
                    {t("profile.phoneNumber")}
                  </label>
                  <input
                    id="phoneNumber"
                    {...form.register("phoneNumber")}
                    className="input"
                    placeholder={t("profile.phoneNumberPlaceholder") as string}
                  />
                  {form.formState.errors.phoneNumber && (
                    <span className="error-message">
                      {form.formState.errors.phoneNumber.message}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="identificationNumber" className="label">
                    {t("profile.idNumber")}
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
                    {t("profile.accountNumber")}
                  </label>
                  <input
                    id="accountNumber"
                    {...form.register("accountNumber")}
                    className="input"
                    placeholder={
                      t("profile.accountNumberPlaceholder") as string
                    }
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
            ? t("profile.updating")
            : t("profile.updateProfile")}
        </button>
      </form>
      {updateProfile.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="success-message"
        >
          {t("profile.updateSuccess")}
        </motion.div>
      )}
    </div>
  );
}
