"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/modules/auth/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { motion } from "framer-motion";
import "./ProfileForm.css";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { SellerBalanceWidget } from "@/modules/balance/components/seller-balance-widget";
import { BecomeSellerButton } from "@/components/become-seller-button/become-seller-button";
import { GEORGIAN_BANKS, detectBankFromIban } from "@/utils/georgian-banks";
const SLUG_PATTERN = /^[a-z0-9]*(?:-[a-z0-9]+)*$/;
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
    ownerFirstName: z.string().optional(),
    ownerLastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    identificationNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    beneficiaryBankCode: z.string().optional(),
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
  )
  .refine(
    (data) => {
      if (data.accountNumber && data.accountNumber.trim()) {
        const iban = data.accountNumber.trim();
        const detectedBank = detectBankFromIban(iban);
        return detectedBank !== null;
      }
      return true;
    },
    {
      message:
        "არასწორი IBAN. გთხოვთ შეიყვანოთ ქართული IBAN (22 სიმბოლო, იწყება GE-ით)",
      path: ["accountNumber"],
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
  const { t, language } = useLanguage();
  const [slugInput, setSlugInput] = useState("");
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const [slugMessage, setSlugMessage] = useState<string>("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  // Helper function to check if user has seller role (including combined roles)
  const isSellerRole = (role?: string) => {
    if (!role) return false;
    const upperRole = role.toUpperCase();
    return upperRole === "SELLER" || upperRole === "SELLER_SALES_MANAGER";
  };

  // Helper function to check if user has sales manager role (including combined roles)
  const isSalesManagerRole = (role?: string) => {
    if (!role) return false;
    const upperRole = role.toUpperCase();
    return (
      upperRole === "SALES_MANAGER" || upperRole === "SELLER_SALES_MANAGER"
    );
  };

  const portfolioBaseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL || "https://soulart.ge";
  const portfolioDisplayBase = portfolioBaseUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const slugDisplayPrefix = `${portfolioDisplayBase}/@`;
  const portfolioLinkBase = portfolioBaseUrl.replace(/\/$/, "");
  const buildPortfolioUrl = (slug: string) => `${portfolioLinkBase}/@${slug}`;

  // Helper function to check if URL is from Cloudinary
  const isCloudinaryUrl = useCallback((url: string): boolean => {
    return typeof url === "string" && url.includes("cloudinary.com");
  }, []);

  // Helper function to ensure we can handle both existing uploads and new ones
  const getImageSrc = useCallback(
    (imagePath: string | null) => {
      if (!imagePath) return null;

      // If it's a Cloudinary URL, return it directly without modifications
      if (isCloudinaryUrl(imagePath)) {
        return imagePath;
      }

      // If already a URL, return it directly
      if (imagePath.startsWith("http")) {
        return imagePath;
      }

      // Don't append /api/ if the path already contains it
      if (imagePath.startsWith("/api/")) {
        return imagePath;
      }

      // Otherwise add API prefix
      return `/api/${imagePath}`;
    },
    [isCloudinaryUrl]
  );

  // Use manual invalidation instead of refetch
  const refreshUserData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user"] });
  }, [queryClient]);

  // Define form before using it in useEffect
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      storeName: user?.storeName || "",
      ownerFirstName: user?.ownerFirstName || "",
      ownerLastName: user?.ownerLastName || "",
      phoneNumber: user?.phoneNumber || "",
      identificationNumber: user?.identificationNumber || "",
      accountNumber: user?.accountNumber || "",
      beneficiaryBankCode: user?.beneficiaryBankCode || "",
    },
  });

  useEffect(() => {
    setShouldFetchUser(true);
  }, []);

  // Remove the automatic refresh when shouldFetchUser changes to prevent loops
  // useEffect(() => {
  //   if (shouldFetchUser) {
  //     refreshUserData();
  //   }
  // }, [shouldFetchUser, refreshUserData]);

  useEffect(() => {
    if (user) {
      // For profile image:
      // 1. Use profile image if exists
      // 2. If user is a seller without profile image, use store logo as profile image
      // 3. Otherwise, no image (will show initials)
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      } else if (isSellerRole(user.role) && user.storeLogo) {
        setProfileImage(user.storeLogo);
      } else {
        setProfileImage(null);
      }

      setIsSellerAccount(isSellerRole(user.role));

      if (user.storeLogo) {
        setLogoError(false);
        setStoreLogo(getImageSrc(user.storeLogo) || user.storeLogo);
      } else {
        setStoreLogo(null);
      }

      // Reset form with current user data
      form.reset({
        name: user.name || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
        storeName: user.storeName || "",
        ownerFirstName: user.ownerFirstName || "",
        ownerLastName: user.ownerLastName || "",
        phoneNumber: user.phoneNumber || "",
        identificationNumber: user.identificationNumber || "",
        accountNumber: user.accountNumber || "",
        beneficiaryBankCode: user.beneficiaryBankCode || "",
      });

      const existingSlug = user.artistSlug ?? "";
      setSlugInput(existingSlug);
      setCopyState("idle");
      if (existingSlug) {
        setSlugStatus("available");
        setSlugMessage("");
      } else {
        setSlugStatus("idle");
        setSlugMessage("");
      }
    }
  }, [user, getImageSrc, form]);

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

        // Seller-specific fields
        if (user && isSellerRole(user.role)) {
          if (
            values.storeName !== undefined &&
            values.storeName !== user?.storeName
          ) {
            payload.storeName = values.storeName;
          }

          if (
            values.ownerFirstName !== undefined &&
            values.ownerFirstName !== user?.ownerFirstName
          ) {
            payload.ownerFirstName = values.ownerFirstName;
          }

          if (
            values.ownerLastName !== undefined &&
            values.ownerLastName !== user?.ownerLastName
          ) {
            payload.ownerLastName = values.ownerLastName;
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

        // Sales Manager bank details
        if (user && user.role === "sales_manager") {
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

          if (
            values.beneficiaryBankCode !== undefined &&
            values.beneficiaryBankCode !== user?.beneficiaryBankCode
          ) {
            payload.beneficiaryBankCode = values.beneficiaryBankCode;
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

      // If this is a seller and we're potentially updating logo-related data,
      // invalidate product queries as well
      if (isSellerRole(user?.role)) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
        queryClient.invalidateQueries({ queryKey: ["similarProducts"] });
      }

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

  const slugMutation = useMutation({
    mutationFn: async (slug: string) => {
      const normalized = slug.trim().toLowerCase();
      const payload = {
        artistSlug: normalized.length > 0 ? normalized : null,
      };
      const response = await apiClient.patch("/artists/profile", payload);
      return response.data;
    },
    onSuccess: (data, slug) => {
      const normalized = slug.trim().toLowerCase();
      const activeSlug: string | undefined =
        data?.artist?.artistSlug ?? (normalized || undefined);

      if (activeSlug) {
        setSlugInput(activeSlug);
        setSlugStatus("available");
        setSlugMessage("");
        toast({
          title:
            language === "en"
              ? "Portfolio link saved"
              : "პორტფოლიოს ბმული შენახულია",
        });
      } else {
        setSlugStatus("idle");
        setSlugMessage("");
        toast({
          title:
            language === "en"
              ? "Personal link removed"
              : "პირადი ბმული გაუქმდა",
        });
      }

      setCopyState("idle");
      refreshUserData();
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      const description = error instanceof Error ? error.message : undefined;
      toast({
        title:
          language === "en"
            ? "Failed to save portfolio link"
            : "ბმულის შენახვა ვერ მოხერხდა",
        description,
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
    } catch {
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

      const response = await apiClient.post("/users/seller-logo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.logoUrl) {
        setStoreLogo(response.data.logoUrl);
        setUploadSuccess(true);

        // Use the refreshUserData function instead of refetch
        refreshUserData();

        // Invalidate product queries to refresh brand logos on product pages
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
        queryClient.invalidateQueries({ queryKey: ["similarProducts"] });

        toast({
          title: t("profile.logoUploadSuccess"),
          description: t("profile.logoUploadSuccessDescription"),
        });
      } else {
        throw new Error("Logo URL not found in response");
      }
    } catch {
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

  const handleSlugCheck = async () => {
    const slug = slugInput.trim().toLowerCase();

    if (!slug) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    if (slug.length > 40 || slug.length < 3 || !SLUG_PATTERN.test(slug)) {
      setSlugStatus("error");
      setSlugMessage(
        language === "en"
          ? "Use 3-40 lowercase letters or numbers. Hyphen allowed between words."
          : "გამოიყენე 3-40 სიმბოლო: პატარა ასოები, რიცხვები და ჰიფენი სიტყვებს შორის."
      );
      return;
    }

    setSlugStatus("checking");
    setSlugMessage(
      language === "en"
        ? "Checking availability..."
        : "მიმდინარეობს თავისუფლების შემოწმება..."
    );

    try {
      const { data } = await apiClient.get("/artists/slug/check", {
        params: {
          slug,
          excludeId: user?._id,
        },
      });

      if (data.available) {
        setSlugStatus("available");
        setSlugMessage(
          language === "en"
            ? `Great news! Your portfolio will be ${portfolioBaseUrl}/@${slug}`
            : `სუპერ! შენი პორტფოლიო იქნება ${portfolioBaseUrl}/@${slug}`
        );
      } else {
        setSlugStatus("taken");
        setSlugMessage(
          language === "en"
            ? "Slug is already taken"
            : "ეს სლაგი უკვე დაკავებულია"
        );
      }
    } catch (error) {
      console.error("Slug check failed", error);
      setSlugStatus("error");
      setSlugMessage(
        language === "en"
          ? "Couldn't verify slug. Try again later."
          : "სლაგის შემოწმება ვერ მოხერხდა. სცადე მოგვიანებით."
      );
    }
  };

  const handleSlugSave = async () => {
    const slug = slugInput.trim().toLowerCase();

    if (!slug) {
      slugMutation.mutate("");
      return;
    }

    if (slug.length > 40 || slug.length < 3 || !SLUG_PATTERN.test(slug)) {
      setSlugStatus("error");
      setSlugMessage(
        language === "en"
          ? "Use 3-40 lowercase letters or numbers. Hyphen allowed between words."
          : "გამოიყენე 3-40 სიმბოლო: პატარა ასოები, რიცხვები და ჰიფენი სიტყვებს შორის."
      );
      return;
    }

    slugMutation.mutate(slug);
  };

  const handleCopyPortfolioLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
      toast({
        title: language === "en" ? "Link copied" : "ბმული წარმატებით დაკოპირდა",
      });
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error("Copy link failed", error);
      toast({
        title:
          language === "en"
            ? "Couldn't copy link"
            : "ბმულის დაკოპირება ვერ მოხერხდა",
        variant: "destructive",
      });
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

  const savedSlug = user?.artistSlug ?? "";
  const savedPortfolioLink = savedSlug ? buildPortfolioUrl(savedSlug) : "";
  const slugStatusClass = `seller-portfolio-cta__status seller-portfolio-cta__status--${slugStatus}`;

  if (!shouldFetchUser || isLoading) {
    return <div className="loading-container">{t("profile.loading")}</div>;
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2>{t("profile.title")}</h2>
        {/* Show become seller button only for regular users (not for sellers, admins, or sales managers) */}
        {user &&
          user.role?.toUpperCase() !== "SELLER" &&
          user.role?.toUpperCase() !== "SELLER_SALES_MANAGER" &&
          user.role?.toUpperCase() !== "SALES_MANAGER" &&
          user.role?.toUpperCase() !== "ADMIN" && (
            <BecomeSellerButton
              userPhone={user.phoneNumber}
              userIdentificationNumber={user.identificationNumber}
              userAccountNumber={user.accountNumber}
              userBeneficiaryBankCode={user.beneficiaryBankCode}
            />
          )}
      </div>

      {/* Balance widget only for sellers, not admins */}
      {isSellerRole(user?.role) && user._id && (
        <SellerBalanceWidget userId={user._id} />
      )}

      <div className="profile-images-container">
        {/* Profile image section - only show for non-sellers */}
        {!isSellerAccount && (
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
                  key={`profile-${new Date().getTime()}`} // Add key for cache busting
                  onError={() => {
                    setProfileImage(null); // Show initials on error
                  }}
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
                {isUploading
                  ? t("profile.uploading")
                  : t("profile.uploadAvatar")}
              </button>
              {uploadSuccess && (
                <div className="upload-success">
                  {t("profile.uploadSuccess")}
                </div>
              )}
            </div>
          </div>
        )}
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

        {user && user.role && (isSellerRole(user.role) || isSellerAccount) && (
          <div className="seller-section">
            <h2 className="seller-section-title">{t("profile.sellerInfo")}</h2>

            <div className="seller-logo-container">
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#666",
                  marginBottom: "0.75rem",
                  textAlign: "center",
                }}
              >
                {language === "en"
                  ? "Your logo will also be used as your profile photo"
                  : "ლოგო ავტომატურად გამოიყენება პროფილის ფოტოდაც"}
              </p>
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
                        key={`logo-${new Date().getTime()}`} // Add key for cache busting
                        unoptimized
                        onError={() => {
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
                {isUploading ? t("profile.uploading") : t("profile.uploadLogo")}
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
                  placeholder={t("profile.accountNumberPlaceholder") as string}
                  onChange={(e) => {
                    // Auto-detect bank from IBAN
                    const iban = e.target.value.trim();
                    const detectedBank = detectBankFromIban(iban);
                    if (detectedBank) {
                      form.setValue("beneficiaryBankCode", detectedBank);
                    } else if (iban.length >= 22) {
                      form.setValue("beneficiaryBankCode", "");
                    }
                    // Still register the change
                    form.register("accountNumber").onChange(e);
                  }}
                />
                {form.formState.errors.accountNumber && (
                  <span className="error-message">
                    {form.formState.errors.accountNumber.message}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="beneficiaryBankCode" className="label">
                  {t("profile.bankName") || "ბანკი"}
                </label>
                <select
                  id="beneficiaryBankCode"
                  {...form.register("beneficiaryBankCode")}
                  className="input"
                  disabled={true}
                >
                  <option value="">
                    {t("profile.selectBank") || "აირჩიეთ ბანკი"}
                  </option>
                  {GEORGIAN_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} ({bank.nameEn})
                    </option>
                  ))}
                </select>
                {form.formState.errors.beneficiaryBankCode && (
                  <span className="error-message">
                    {form.formState.errors.beneficiaryBankCode.message}
                  </span>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {t("profile.bankAutoDetect") ||
                    "ბანკი ავტომატურად დადგინდება ანგარიშის ნომრით"}
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="ownerFirstName" className="label">
                  {t("profile.ownerFirstName")}
                </label>
                <input
                  id="ownerFirstName"
                  {...form.register("ownerFirstName")}
                  className="input"
                />
                {form.formState.errors.ownerFirstName && (
                  <span className="error-message">
                    {form.formState.errors.ownerFirstName.message}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="ownerLastName" className="label">
                  {t("profile.ownerLastName")}
                </label>
                <input
                  id="ownerLastName"
                  {...form.register("ownerLastName")}
                  className="input"
                />
                {form.formState.errors.ownerLastName && (
                  <span className="error-message">
                    {form.formState.errors.ownerLastName.message}
                  </span>
                )}
              </div>
            </div>

            <div className="seller-portfolio-cta">
              <div className="seller-portfolio-cta__header">
                <h3>
                  {language === "en" ? "Portfolio link" : "პორტფოლიოს ბმული"}
                </h3>
                <p>
                  {language === "en"
                    ? "Choose a short username to unlock your public artist page."
                    : "აირჩიე მოკლე მეტსახელი და გააქტიურე საჯარო არტისტის გვერდი."}
                </p>
              </div>
              <div className="seller-portfolio-cta__field">
                <label htmlFor="sellerSlug">
                  {language === "en"
                    ? "Choose your username"
                    : "აირჩიე მეტსახელი"}
                </label>
                <div className="seller-portfolio-cta__input">
                  <span className="seller-portfolio-cta__prefix">
                    {slugDisplayPrefix}
                  </span>
                  <input
                    id="sellerSlug"
                    type="text"
                    value={slugInput}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => {
                      const nextValue = event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "");
                      setSlugInput(nextValue);
                      setSlugStatus("idle");
                      setSlugMessage("");
                    }}
                    placeholder={language === "en" ? "username" : "მეტსახელი"}
                  />
                </div>
              </div>
              <div className="seller-portfolio-cta__actions">
                <button
                  type="button"
                  className="seller-portfolio-cta__button seller-portfolio-cta__button--ghost"
                  onClick={handleSlugCheck}
                  disabled={slugStatus === "checking"}
                >
                  {slugStatus === "checking"
                    ? language === "en"
                      ? "Checking..."
                      : "ვამოწმებ..."
                    : language === "en"
                    ? "Check availability"
                    : "შეამოწმე"}
                </button>
                <button
                  type="button"
                  className="seller-portfolio-cta__button"
                  onClick={handleSlugSave}
                  disabled={slugMutation.isPending}
                >
                  {slugMutation.isPending
                    ? language === "en"
                      ? "Saving..."
                      : "ვინახავ..."
                    : language === "en"
                    ? "Save username"
                    : "მეტსახელის შენახვა"}
                </button>
              </div>
              {slugMessage && <p className={slugStatusClass}>{slugMessage}</p>}
              {savedPortfolioLink ? (
                <div className="seller-portfolio-cta__share">
                  <p>
                    {language === "en"
                      ? "Your live page opens in a new tab. Edit all sections from there."
                      : "შენი პორტფოლიო ახალ ტაბში გაიხსნება. იქიდან მართე ყველა განყოფილება."}
                  </p>
                  <div className="seller-portfolio-cta__share-actions">
                    <a
                      href={savedPortfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="seller-portfolio-cta__button seller-portfolio-cta__button--ghost"
                    >
                      {language === "en"
                        ? "Visit portfolio"
                        : "პორტფოლიოს ნახვა"}
                    </a>
                    <button
                      type="button"
                      className="seller-portfolio-cta__button seller-portfolio-cta__button--outline"
                      onClick={() =>
                        handleCopyPortfolioLink(savedPortfolioLink)
                      }
                    >
                      {copyState === "copied"
                        ? language === "en"
                          ? "Copied!"
                          : "დაკოპირდა!"
                        : language === "en"
                        ? "Copy link"
                        : "ბმულის დაკოპირება"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Sales Manager Bank Details Section */}
        {user && user.role && user.role === "sales_manager" && (
          <div className="seller-section">
            <h2 className="seller-section-title">
              {language === "en" ? "Bank Details" : "საბანკო რეკვიზიტები"}
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#666",
                marginBottom: "1.5rem",
              }}
            >
              {language === "en"
                ? "Required for commission withdrawal"
                : "საჭიროა საკომისიოს გასატანად"}
            </p>

            <div className="seller-form-grid">
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
                  placeholder={
                    language === "en" ? "Personal ID" : "პირადი ნომერი"
                  }
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
                  placeholder="GE..."
                  onChange={(e) => {
                    const iban = e.target.value.trim();
                    const detectedBank = detectBankFromIban(iban);
                    if (detectedBank) {
                      form.setValue("beneficiaryBankCode", detectedBank);
                    } else if (iban.length >= 22) {
                      form.setValue("beneficiaryBankCode", "");
                    }
                    form.register("accountNumber").onChange(e);
                  }}
                />
                {form.formState.errors.accountNumber && (
                  <span className="error-message">
                    {form.formState.errors.accountNumber.message}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="beneficiaryBankCode" className="label">
                  {t("profile.bankName") || "ბანკი"}
                </label>
                <select
                  id="beneficiaryBankCode"
                  {...form.register("beneficiaryBankCode")}
                  className="input"
                  disabled={true}
                >
                  <option value="">
                    {t("profile.selectBank") || "აირჩიეთ ბანკი"}
                  </option>
                  {GEORGIAN_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} ({bank.nameEn})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t("profile.bankAutoDetect") ||
                    "ბანკი ავტომატურად დადგინდება ანგარიშის ნომრით"}
                </p>
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
