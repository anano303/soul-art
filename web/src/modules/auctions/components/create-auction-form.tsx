"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useUser } from "@/modules/auth/hooks/use-user";
import "./create-auction-form.css";

interface AuctionFormInitialData {
  title: string;
  description: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  mainImage: string;
  additionalImages?: string[];
  startingPrice: number;
  minimumBidIncrement: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  deliveryType?: string;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  sellerId?: string;
  sellerName?: string;
  sellerEmail?: string;
}

interface CreateAuctionFormProps {
  mode: "seller" | "admin" | "auction_admin";
  variant?: "create" | "reschedule";
  auctionId?: string;
  initialData?: AuctionFormInitialData;
  lockedSellerId?: string;
  onSuccess?: (auctionId?: string) => void;
}

interface FormState {
  title: string;
  description: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  mainImage: string;
  additionalImagesRaw: string;
  startingPrice: string;
  minimumBidIncrement: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  deliveryType: "artist" | "soulart";
  deliveryDaysMin: string;
  deliveryDaysMax: string;
}

interface SellerOption {
  id: string;
  name: string;
  email: string;
}

type FormErrors = Partial<Record<keyof FormState | "sellerId", string>>;

const INITIAL_STATE: FormState = {
  title: "",
  description: "",
  artworkType: "ORIGINAL",
  dimensions: "",
  material: "",
  mainImage: "",
  additionalImagesRaw: "",
  startingPrice: "100",
  minimumBidIncrement: "10",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "18:00",
  deliveryType: "soulart",
  deliveryDaysMin: "1",
  deliveryDaysMax: "3",
};

function getDefaultEndDate() {
  const now = new Date();
  now.setDate(now.getDate() + 3);
  return now.toISOString().split("T")[0];
}

function getDefaultStartDate() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now.toISOString().split("T")[0];
}

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

const MAX_IMAGE_SIZE_MB = 8;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

function normalizeDateInput(value?: string, fallback?: string) {
  if (!value) {
    return fallback ?? "";
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  return value;
}

function normalizeTimeInput(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 5);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[1].slice(0, 5);
  }

  return fallback;
}

function createInitialState(initialData?: AuctionFormInitialData): FormState {
  const base = { ...INITIAL_STATE };

  // Determine deliveryType from initialData
  let deliveryType = base.deliveryType;
  if (initialData?.deliveryType) {
    deliveryType =
      initialData.deliveryType.toLowerCase() === "artist"
        ? "artist"
        : "soulart";
  }

  return {
    ...base,
    title: initialData?.title ?? base.title,
    description: initialData?.description ?? base.description,
    artworkType: initialData?.artworkType ?? base.artworkType,
    dimensions: initialData?.dimensions ?? base.dimensions,
    material: initialData?.material ?? base.material,
    mainImage: initialData?.mainImage ?? base.mainImage,
    additionalImagesRaw: (initialData?.additionalImages || []).join("\n"),
    startingPrice:
      initialData?.startingPrice !== undefined
        ? String(initialData.startingPrice)
        : base.startingPrice,
    minimumBidIncrement:
      initialData?.minimumBidIncrement !== undefined
        ? String(initialData.minimumBidIncrement)
        : base.minimumBidIncrement,
    startDate: normalizeDateInput(
      initialData?.startDate,
      getDefaultStartDate(),
    ),
    startTime: normalizeTimeInput(initialData?.startTime, "10:00"),
    endDate: normalizeDateInput(initialData?.endDate, getDefaultEndDate()),
    endTime: normalizeTimeInput(initialData?.endTime, base.endTime),
    deliveryType,
    deliveryDaysMin:
      initialData?.deliveryDaysMin !== undefined
        ? String(initialData.deliveryDaysMin)
        : base.deliveryDaysMin,
    deliveryDaysMax:
      initialData?.deliveryDaysMax !== undefined
        ? String(initialData.deliveryDaysMax)
        : base.deliveryDaysMax,
  };
}

export function CreateAuctionForm({
  mode,
  variant = "create",
  auctionId,
  initialData,
  lockedSellerId,
  onSuccess,
}: CreateAuctionFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useUser();
  const initialFormState = useMemo(
    () => createInitialState(initialData),
    [initialData],
  );
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const sellerIdFromProps = lockedSellerId ?? initialData?.sellerId ?? "";
  const [selectedSellerId, setSelectedSellerId] =
    useState<string>(sellerIdFromProps);
  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isAdmin = mode === "admin" || mode === "auction_admin";
  const isMainAdmin = mode === "admin"; // მთავარ ადმინს შეუზღუდავი თარიღი აქვს
  const isSeller = mode === "seller";
  const isReschedule = variant === "reschedule";
  const canChangeSeller = isAdmin && variant === "create" && !lockedSellerId;

  useEffect(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  // Only sync selectedSellerId from props if it's actually provided (not empty string)
  useEffect(() => {
    if (sellerIdFromProps) {
      setSelectedSellerId(sellerIdFromProps);
    }
  }, [sellerIdFromProps]);

  // Auto-select seller when a seller is logged in (seller mode OR actual Seller role)
  useEffect(() => {
    if (user?.role === "seller" && user._id && !selectedSellerId) {
      setSelectedSellerId(user._id);
      console.log(
        "✅ Auto-select for Seller role: Setting seller ID to",
        user._id,
      );
    }
  }, [user]);

  useEffect(() => {
    // Load sellers list for admin or auction_admin users
    if (
      !isAdmin ||
      !user ||
      (user.role !== "admin" && user.role !== "auction_admin")
    ) {
      return;
    }

    const loadSellers = async () => {
      try {
        setSellerLoading(true);
        const response = await fetchWithAuth(`/users?role=SELLER&limit=200`);
        const data = await response.json();
        const mapped: SellerOption[] = (data?.items || []).map((item: any) => ({
          id: item?._id,
          name:
            item?.name || (item?.ownerFirstName && item?.ownerLastName)
              ? `${item.ownerFirstName} ${item.ownerLastName}`
              : item?.email?.split("@")[0] || "Unknown",
          email: item?.email,
        }));

        if (
          selectedSellerId &&
          !mapped.some((seller) => seller.id === selectedSellerId)
        ) {
          mapped.unshift({
            id: selectedSellerId,
            name:
              initialData?.sellerName ||
              t("auctionForm.helperTexts.sellerFallback") ||
              selectedSellerId,
            email: initialData?.sellerEmail || selectedSellerId,
          });
        }

        setSellers(mapped);
      } catch (error: unknown) {
        console.error("Failed to fetch sellers", error);
        toast.error(
          t("auctionForm.errors.sellers") || "Failed to load sellers",
        );
      } finally {
        setSellerLoading(false);
      }
    };

    loadSellers();
  }, [isAdmin, user, selectedSellerId, initialData, t]);

  const timezoneHint = useMemo(() => {
    return t("auctionForm.helperTexts.timezone");
  }, [t]);

  const todayDate = useMemo(() => getTodayDate(), []);

  const additionalImages = useMemo(() => {
    return formState.additionalImagesRaw
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }, [formState.additionalImagesRaw]);

  const selectedSellerOption = useMemo(() => {
    if (!selectedSellerId) {
      return undefined;
    }
    return sellers.find((seller) => seller.id === selectedSellerId);
  }, [selectedSellerId, sellers]);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateImageFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(
        t("auctionForm.validation.imageType") || "Unsupported image format",
      );
      return false;
    }

    const sizeInMb = file.size / (1024 * 1024);
    if (sizeInMb > MAX_IMAGE_SIZE_MB) {
      toast.error(
        t("auctionForm.validation.imageSize", {
          size: MAX_IMAGE_SIZE_MB,
        }) || `Image must be under ${MAX_IMAGE_SIZE_MB}MB`,
      );
      return false;
    }

    return true;
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post(
        "/auctions/media/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const url = response?.data?.url || response?.data?.Location;

      if (!url) {
        throw new Error(
          t("auctionForm.errors.imageUpload") || "Image upload failed",
        );
      }

      return url as string;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const backendMessage = axiosError?.response?.data?.message;
      throw new Error(
        backendMessage ||
          t("auctionForm.errors.imageUpload") ||
          "Image upload failed",
      );
    }
  };

  const handleMainImageFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!validateImageFile(file)) {
      event.target.value = "";
      return;
    }

    setIsUploadingMainImage(true);
    setUploadError(null);

    try {
      const url = await uploadImage(file);
      handleInputChange("mainImage", url);
      setUploadError(null);
      toast.success(t("auctionForm.success.imageUploaded") || "Image uploaded");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to upload main image", error);
      setUploadError(
        errorMessage ||
          t("auctionForm.errors.imageUpload") ||
          "Image upload failed",
      );
      toast.error(errorMessage);
    } finally {
      setIsUploadingMainImage(false);
      event.target.value = "";
    }
  };

  const handleAdditionalImagesUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const validFiles = files.filter((file) => validateImageFile(file));

    if (!validFiles.length) {
      event.target.value = "";
      return;
    }

    setIsUploadingAdditional(true);
    setUploadError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of validFiles) {
        const url = await uploadImage(file);
        uploadedUrls.push(url);
      }

      setFormState((prev) => {
        const existing = prev.additionalImagesRaw
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        return {
          ...prev,
          additionalImagesRaw: [...existing, ...uploadedUrls].join("\n"),
        };
      });

      setUploadError(null);
      toast.success(
        t("auctionForm.success.additionalImagesUploaded") ||
          "Images added to gallery",
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to upload additional images", error);
      setUploadError(
        errorMessage ||
          t("auctionForm.errors.imageUpload") ||
          "Image upload failed",
      );
      toast.error(errorMessage);
    } finally {
      setIsUploadingAdditional(false);
      event.target.value = "";
    }
  };

  const handleRemoveAdditionalImage = (index: number) => {
    setFormState((prev) => {
      const current = prev.additionalImagesRaw
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const updated = current.filter((_, idx) => idx !== index);

      return {
        ...prev,
        additionalImagesRaw: updated.join("\n"),
      };
    });
  };

  const handleClearMainImage = () => {
    setFormState((prev) => ({
      ...prev,
      mainImage: "",
    }));
    setErrors((prev) => ({ ...prev, mainImage: undefined }));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    // Admins must select a seller when creating (not editing/rescheduling)
    if (isAdmin && canChangeSeller && !selectedSellerId) {
      newErrors.sellerId =
        t("auctionForm.validation.sellerRequired") || "Select seller";
    }

    // Sellers (actual Seller role) - they use their own user._id automatically
    // No error needed if user._id exists (it should for logged-in sellers)
    // This is just a safety check
    if (user?.role === "seller") {
      console.log(
        "🔍 Seller validation check - user.role:",
        user.role,
        "selectedSellerId:",
        selectedSellerId,
        "user._id:",
        user._id,
      );
      const effectiveSellerId = selectedSellerId || user?._id;
      console.log("🔍 effectiveSellerId:", effectiveSellerId);
      if (!effectiveSellerId) {
        newErrors.sellerId =
          t("auctionForm.validation.sellerRequired") || "Seller ID is required";
      }
    }

    if (!formState.title.trim()) {
      newErrors.title =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.description.trim()) {
      newErrors.description =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.dimensions.trim()) {
      newErrors.dimensions =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.material.trim()) {
      newErrors.material =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.mainImage.trim()) {
      newErrors.mainImage =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.startDate) {
      newErrors.startDate =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.startTime) {
      newErrors.startTime =
        t("auctionForm.validation.required") || "Required field";
    }

    const startingPrice = Number(formState.startingPrice);
    if (Number.isNaN(startingPrice) || startingPrice < 1) {
      newErrors.startingPrice =
        t("auctionForm.validation.price") || "Invalid amount";
    }

    const minIncrement = Number(formState.minimumBidIncrement);
    if (Number.isNaN(minIncrement) || minIncrement < 1) {
      newErrors.minimumBidIncrement =
        t("auctionForm.validation.increment") || "Invalid amount";
    }

    const deliveryDaysMin = Number(formState.deliveryDaysMin);
    const deliveryDaysMax = Number(formState.deliveryDaysMax);
    if (Number.isNaN(deliveryDaysMin) || deliveryDaysMin < 1) {
      newErrors.deliveryDaysMin =
        t("auctionForm.validation.delivery") || "Invalid value";
    }
    if (Number.isNaN(deliveryDaysMax) || deliveryDaysMax < 1) {
      newErrors.deliveryDaysMax =
        t("auctionForm.validation.delivery") || "Invalid value";
    }
    if (deliveryDaysMax < deliveryDaysMin) {
      newErrors.deliveryDaysMax =
        t("auctionForm.validation.deliveryMaxMin") || "Max must be >= Min";
    }

    if (!formState.endDate) {
      newErrors.endDate =
        t("auctionForm.validation.required") || "Required field";
    }

    if (!formState.endTime) {
      newErrors.endTime =
        t("auctionForm.validation.required") || "Required field";
    }

    let startDateTime: Date | null = null;
    if (formState.endDate && formState.endTime) {
      startDateTime =
        formState.startDate && formState.startTime
          ? new Date(
              `${formState.startDate}T${formState.startTime}:00.000+04:00`,
            )
          : null;

      const endDateTime = new Date(
        `${formState.endDate}T${formState.endTime}:00.000+04:00`,
      );

      if (Number.isNaN(endDateTime.getTime())) {
        newErrors.endDate =
          t("auctionForm.validation.dateFormat") || "Invalid date format";
      } else {
        const now = new Date();
        if (!newErrors.endDate && endDateTime <= now) {
          newErrors.endDate =
            t("auctionForm.validation.futureDate") ||
            "End date must be in the future";
        }

        if (
          startDateTime &&
          !Number.isNaN(startDateTime.getTime()) &&
          !newErrors.startDate
        ) {
          if (Number.isNaN(startDateTime.getTime())) {
            newErrors.startDate =
              t("auctionForm.validation.dateFormat") || "Invalid date format";
          } else if (startDateTime <= now) {
            newErrors.startDate =
              t("auctionForm.validation.startFuture") ||
              "Start date must be in the future";
          } else if (endDateTime <= startDateTime) {
            const message =
              t("auctionForm.validation.scheduleOrder") ||
              "End time must be after start time";
            newErrors.endDate = message;
            newErrors.endTime = message;
          }
        }
      }
    }

    if (!newErrors.startDate && formState.startDate && formState.startTime) {
      const parsedStart = new Date(
        `${formState.startDate}T${formState.startTime}:00.000+04:00`,
      );
      if (Number.isNaN(parsedStart.getTime())) {
        newErrors.startDate =
          t("auctionForm.validation.dateFormat") || "Invalid date format";
      } else if (parsedStart <= new Date()) {
        newErrors.startDate =
          t("auctionForm.validation.startFuture") ||
          "Start date must be in the future";
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log("📋 Validation result:", isValid, "Errors:", newErrors);
    return isValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("🔵 handleSubmit called");

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    console.log("✅ Form validation passed, setting isSubmitting to true");
    setIsSubmitting(true);

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      artworkType: formState.artworkType,
      dimensions: formState.dimensions.trim(),
      material: formState.material.trim(),
      mainImage: formState.mainImage.trim(),
      additionalImages: additionalImages,
      startingPrice: Number(formState.startingPrice),
      minimumBidIncrement: Number(formState.minimumBidIncrement),
      startDate: formState.startDate,
      startTime: formState.startTime,
      endDate: formState.endDate,
      endTime: formState.endTime,
      deliveryType: formState.deliveryType.toUpperCase(),
      deliveryDaysMin: Number(formState.deliveryDaysMin),
      deliveryDaysMax: Number(formState.deliveryDaysMax),
    };

    if (!payload.additionalImages.length) {
      delete (payload as any).additionalImages;
    }

    try {
      let response;
      if (isReschedule) {
        if (!auctionId) {
          toast.error(
            t("auctionForm.errors.missingAuctionId") ||
              "Missing auction reference",
          );
          setIsSubmitting(false);
          return;
        }

        response = await apiClient.patch(
          `/auctions/${auctionId}/reschedule`,
          payload,
        );
      } else if (user?.role === "admin" || user?.role === "auction_admin") {
        // Admin or AuctionAdmin creating auction for a seller
        response = await apiClient.post("/auctions/admin", {
          ...payload,
          sellerId: selectedSellerId || sellerIdFromProps,
        });
      } else {
        // Seller submitting their own auction - sellerId comes from JWT token on backend
        response = await apiClient.post("/auctions", payload);
      }

      const createdAuctionId = response?.data?._id || auctionId;

      const successKey = isReschedule
        ? isAdmin
          ? "auctionForm.success.rescheduleAdmin"
          : "auctionForm.success.rescheduleSeller"
        : isAdmin
          ? "auctionForm.success.admin"
          : "auctionForm.success.seller";

      toast.success(
        t(successKey) ||
          (isReschedule
            ? "Auction updated"
            : isAdmin
              ? "Auction created"
              : "Auction submitted"),
      );

      if (!isReschedule) {
        setFormState(createInitialState());
        setSelectedSellerId(lockedSellerId ?? "");
      }

      setErrors({});

      if (onSuccess) {
        onSuccess(createdAuctionId);
      } else if (mode === "seller") {
        router.push("/profile/auctions");
      } else if (isReschedule) {
        router.refresh();
      }
    } catch (error: any) {
      console.error("❌ Failed to create auction", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("auctionForm.errors.generic") ||
        "Failed to create auction";
      toast.error(message);
    } finally {
      console.log("🔴 Finally block: setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  const titleKey = isReschedule
    ? isAdmin
      ? "auctionForm.titles.adminReschedule"
      : "auctionForm.titles.sellerReschedule"
    : isAdmin
      ? "auctionForm.titles.adminCreate"
      : "auctionForm.titles.sellerCreate";

  const subtitleKey = isReschedule
    ? isAdmin
      ? "auctionForm.subtitles.adminReschedule"
      : "auctionForm.subtitles.sellerReschedule"
    : isAdmin
      ? "auctionForm.subtitles.adminCreate"
      : "auctionForm.subtitles.sellerCreate";

  const submitLabel = isSubmitting
    ? t("auctionForm.buttons.submitting") || "..."
    : isReschedule
      ? isAdmin
        ? t("auctionForm.buttons.rescheduleAdmin") || "Update auction"
        : t("auctionForm.buttons.rescheduleSeller") || "Resubmit auction"
      : isAdmin
        ? t("auctionForm.buttons.submitAdmin") || "Create auction"
        : t("auctionForm.buttons.submitSeller") || "Submit auction";

  const titleText =
    t(titleKey) ||
    (isReschedule
      ? isAdmin
        ? "Update seller auction"
        : "Resubmit auction"
      : isAdmin
        ? "Create auction for seller"
        : "Submit new auction");

  const subtitleText =
    t(subtitleKey) ||
    (isReschedule
      ? t("auctionForm.subtitles.defaultReschedule") ||
        "Review details and set a new schedule."
      : t("auctionForm.subtitles.defaultCreate") ||
        "Fill in artwork details to publish the auction.");

  const sellerSelectionDisabled =
    !canChangeSeller || sellerLoading || isSubmitting;

  const lockedSellerLabel = useMemo(() => {
    if (selectedSellerOption) {
      return `${selectedSellerOption.name} · ${selectedSellerOption.email}`;
    }

    if (initialData?.sellerName || initialData?.sellerEmail) {
      return [initialData?.sellerName, initialData?.sellerEmail]
        .filter(Boolean)
        .join(" · ");
    }

    // Show current user's name if they're a seller and no seller is explicitly selected
    if (isSeller && user) {
      return `${user.name || user.email || "Seller"}`;
    }

    if (selectedSellerId) {
      return selectedSellerId;
    }

    return t("auctionForm.helperTexts.sellerUnknown") || "Seller pending";
  }, [initialData, selectedSellerId, selectedSellerOption, t, isSeller, user]);

  return (
    <form className="create-auction-form" onSubmit={handleSubmit} noValidate>
      <h2>{titleText}</h2>
      <p className="form-subtitle">{subtitleText}</p>

      {isAdmin && (
        <div className="timezone-note" style={{ marginBottom: "1.25rem" }}>
          {t("auctionForm.helperTexts.adminNotice")}
        </div>
      )}

      <div className="timezone-note">{timezoneHint}</div>

      <div className="form-grid">
        {isAdmin &&
          user &&
          (user.role === "admin" || user.role === "auction_admin") && (
            <div className="form-section">
              <div className="section-title">
                {t("auctionForm.sections.seller")}
              </div>
              <div className="section-description">
                {canChangeSeller
                  ? t("auctionForm.helperTexts.selectSeller")
                  : selectedSellerId
                    ? t("auctionForm.helperTexts.sellerLocked")
                    : t("auctionForm.helperTexts.sellerAuto")}
              </div>
              {canChangeSeller ? (
                <div className="seller-select">
                  <select
                    value={selectedSellerId}
                    onChange={(event) =>
                      setSelectedSellerId(event.target.value)
                    }
                    disabled={sellerSelectionDisabled}
                  >
                    <option value="">
                      {sellerLoading
                        ? t("auctionForm.loading.sellers")
                        : t("auctionForm.placeholders.seller")}
                    </option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name} · {seller.email}
                      </option>
                    ))}
                  </select>
                  {errors.sellerId && (
                    <div className="error-message">{errors.sellerId}</div>
                  )}
                </div>
              ) : (
                <div className="seller-info-card">
                  <div className="seller-info-primary">{lockedSellerLabel}</div>
                  <div className="helper-text">
                    {selectedSellerId
                      ? t("auctionForm.helperTexts.sellerLocked")
                      : t("auctionForm.helperTexts.sellerAuto")}
                  </div>
                </div>
              )}
            </div>
          )}

        <div className="form-section">
          <div className="section-title">
            {t("auctionForm.sections.basicInfo")}
          </div>
          <div className="field-grid">
            <div>
              <label htmlFor="auction-title">
                {t("auctionForm.labels.title")}
              </label>
              <input
                id="auction-title"
                value={formState.title}
                onChange={(event) =>
                  handleInputChange("title", event.target.value)
                }
                maxLength={100}
                placeholder={t("auctionForm.placeholders.title") || ""}
                disabled={isSubmitting}
              />
              {errors.title && (
                <div className="error-message">{errors.title}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-description">
                {t("auctionForm.labels.description")}
              </label>
              <textarea
                id="auction-description"
                value={formState.description}
                onChange={(event) =>
                  handleInputChange("description", event.target.value)
                }
                maxLength={500}
                placeholder={t("auctionForm.placeholders.description") || ""}
                disabled={isSubmitting}
              />
              {errors.description && (
                <div className="error-message">{errors.description}</div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            {t("auctionForm.sections.artwork")}
          </div>
          <div className="field-grid two-columns">
            <div>
              <label htmlFor="auction-artwork-type">
                {t("auctionForm.labels.artworkType")}
              </label>
              <select
                id="auction-artwork-type"
                value={formState.artworkType}
                onChange={(event) =>
                  handleInputChange(
                    "artworkType",
                    event.target.value as FormState["artworkType"],
                  )
                }
                disabled={isSubmitting}
              >
                <option value="ORIGINAL">{t("auctions.type.original")}</option>
                <option value="REPRODUCTION">
                  {t("auctions.type.reproduction")}
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="auction-dimensions">
                {t("auctionForm.labels.dimensions")}
              </label>
              <input
                id="auction-dimensions"
                value={formState.dimensions}
                onChange={(event) =>
                  handleInputChange("dimensions", event.target.value)
                }
                placeholder={t("auctionForm.placeholders.dimensions") || ""}
                disabled={isSubmitting}
              />
              {errors.dimensions && (
                <div className="error-message">{errors.dimensions}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-material">
                {t("auctionForm.labels.material")}
              </label>
              <input
                id="auction-material"
                value={formState.material}
                onChange={(event) =>
                  handleInputChange("material", event.target.value)
                }
                placeholder={t("auctionForm.placeholders.material") || ""}
                disabled={isSubmitting}
              />
              {errors.material && (
                <div className="error-message">{errors.material}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-main-image">
                {t("auctionForm.labels.mainImage")}
              </label>
              <input
                id="auction-main-image"
                type="url"
                value={formState.mainImage}
                onChange={(event) =>
                  handleInputChange("mainImage", event.target.value)
                }
                placeholder={t("auctionForm.placeholders.mainImage") || ""}
                disabled={isSubmitting || isUploadingMainImage}
              />
              <div className="image-upload-actions">
                <input
                  id="auction-main-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageFileChange}
                  disabled={isSubmitting || isUploadingMainImage}
                  className="file-input-hidden"
                />
                <label
                  htmlFor="auction-main-image-file"
                  className={`upload-button${
                    isSubmitting || isUploadingMainImage ? " disabled" : ""
                  }`}
                >
                  {isUploadingMainImage
                    ? t("auctionForm.loading.uploading") || "Uploading..."
                    : t("auctionForm.buttons.uploadMainImage") ||
                      "Upload image"}
                </label>
                {formState.mainImage && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={handleClearMainImage}
                    disabled={isSubmitting || isUploadingMainImage}
                  >
                    {t("auctionForm.buttons.clearMainImage") || "Remove"}
                  </button>
                )}
              </div>
              <div className="helper-text">
                {t("auctionForm.helperTexts.imageUpload")}
              </div>
              {uploadError && (
                <div className="upload-error-message">⚠️ {uploadError}</div>
              )}
              {formState.mainImage && (
                <div className="image-preview">
                  <img
                    src={formState.mainImage}
                    alt={formState.title || "Auction main image"}
                  />
                </div>
              )}
              {errors.mainImage && (
                <div className="error-message">{errors.mainImage}</div>
              )}
            </div>
          </div>

          <div className="field-grid" style={{ marginTop: "1rem" }}>
            <div>
              <label htmlFor="auction-additional-images">
                {t("auctionForm.labels.additionalImages")}
              </label>
              <textarea
                id="auction-additional-images"
                value={formState.additionalImagesRaw}
                onChange={(event) =>
                  handleInputChange("additionalImagesRaw", event.target.value)
                }
                placeholder={
                  t("auctionForm.placeholders.additionalImages") || ""
                }
                disabled={isSubmitting}
              />
              <div className="helper-text">
                {t("auctionForm.helperTexts.additionalImages")}
              </div>
              <div className="image-upload-actions">
                <input
                  id="auction-additional-images-files"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesUpload}
                  disabled={isSubmitting || isUploadingAdditional}
                  className="file-input-hidden"
                />
                <label
                  htmlFor="auction-additional-images-files"
                  className={`upload-button${
                    isSubmitting || isUploadingAdditional ? " disabled" : ""
                  }`}
                >
                  {isUploadingAdditional
                    ? t("auctionForm.loading.uploading") || "Uploading..."
                    : t("auctionForm.buttons.uploadAdditionalImages") ||
                      "Upload gallery images"}
                </label>
              </div>
              {additionalImages.length > 0 && (
                <div className="image-preview-grid">
                  {additionalImages.map((url, index) => (
                    <div className="image-preview" key={`${url}-${index}`}>
                      <img src={url} alt={`Additional image ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-image-button"
                        onClick={() => handleRemoveAdditionalImage(index)}
                        disabled={isSubmitting}
                      >
                        {t("auctionForm.buttons.removeImage") || "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            {t("auctionForm.sections.pricing")}
          </div>
          <div className="field-grid two-columns">
            <div>
              <label htmlFor="auction-starting-price">
                {t("auctionForm.labels.startingPrice")}
              </label>
              <input
                id="auction-starting-price"
                type="number"
                min="1"
                step="0.01"
                value={formState.startingPrice}
                onChange={(event) =>
                  handleInputChange("startingPrice", event.target.value)
                }
                disabled={isSubmitting}
              />
              {errors.startingPrice && (
                <div className="error-message">{errors.startingPrice}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-min-increment">
                {t("auctionForm.labels.minimumBidIncrement")}
              </label>
              <input
                id="auction-min-increment"
                type="number"
                min="1"
                step="0.01"
                value={formState.minimumBidIncrement}
                onChange={(event) =>
                  handleInputChange("minimumBidIncrement", event.target.value)
                }
                disabled={isSubmitting}
              />
              {errors.minimumBidIncrement && (
                <div className="error-message">
                  {errors.minimumBidIncrement}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            {t("auctionForm.sections.schedule")}
          </div>
          <div className="field-grid two-columns">
            <div>
              <label htmlFor="auction-start-date">
                {t("auctionForm.labels.startDate")}
              </label>
              <input
                id="auction-start-date"
                type="date"
                min={isMainAdmin ? undefined : todayDate}
                value={formState.startDate}
                onChange={(event) =>
                  handleInputChange("startDate", event.target.value)
                }
                disabled={isSubmitting}
              />
              {errors.startDate && (
                <div className="error-message">{errors.startDate}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-start-time">
                {t("auctionForm.labels.startTime")}
              </label>
              <input
                id="auction-start-time"
                type="time"
                value={formState.startTime}
                onChange={(event) =>
                  handleInputChange("startTime", event.target.value)
                }
                disabled={isSubmitting}
              />
              {errors.startTime && (
                <div className="error-message">{errors.startTime}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-end-date">
                {t("auctionForm.labels.endDate")}
              </label>
              <input
                id="auction-end-date"
                type="date"
                min={isMainAdmin ? undefined : formState.startDate || todayDate}
                value={formState.endDate}
                onChange={(event) =>
                  handleInputChange("endDate", event.target.value)
                }
                disabled={isSubmitting}
              />
              {errors.endDate && (
                <div className="error-message">{errors.endDate}</div>
              )}
            </div>

            <div>
              <label htmlFor="auction-end-time">
                {t("auctionForm.labels.endTime")}
              </label>
              <input
                id="auction-end-time"
                type="time"
                value={formState.endTime}
                onChange={(event) =>
                  handleInputChange("endTime", event.target.value)
                }
                disabled={isSubmitting}
              />
              {errors.endTime && (
                <div className="error-message">{errors.endTime}</div>
              )}
            </div>
          </div>
          <div className="helper-text" style={{ marginTop: "0.75rem" }}>
            {t("auctionForm.helperTexts.scheduleHint")}
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            {t("auctionForm.sections.delivery")}
          </div>

          {/* Delivery Type Selection */}
          <div className="delivery-type-selector">
            <label className="delivery-type-option">
              <input
                type="radio"
                name="deliveryType"
                value="soulart"
                checked={formState.deliveryType === "soulart"}
                onChange={() => {
                  handleInputChange("deliveryType", "soulart");
                  handleInputChange("deliveryDaysMin", "1");
                  handleInputChange("deliveryDaysMax", "3");
                }}
                disabled={isSubmitting}
              />
              <div className="delivery-type-card">
                <div className="delivery-type-icon">🚚</div>
                <div className="delivery-type-content">
                  <div className="delivery-type-title">
                    {t("auctionForm.deliveryType.soulart") ||
                      "SoulArt-ის მიწოდება"}
                  </div>
                  <div className="delivery-type-desc">
                    {t("auctionForm.deliveryType.soulartDesc") ||
                      "სწრაფი მიწოდება 1-3 სამუშაო დღეში"}
                  </div>
                  {formState.deliveryType === "soulart" && (
                    <div className="delivery-info-inline soulart-info">
                      ✓ მიწოდება 1-3 სამუშაო დღეში მთელი საქართველოს მასშტაბით
                    </div>
                  )}
                </div>
              </div>
            </label>

            <label className="delivery-type-option">
              <input
                type="radio"
                name="deliveryType"
                value="artist"
                checked={formState.deliveryType === "artist"}
                onChange={() => {
                  handleInputChange("deliveryType", "artist");
                }}
                disabled={isSubmitting}
              />
              <div className="delivery-type-card">
                <div className="delivery-type-icon">🎨</div>
                <div className="delivery-type-content">
                  <div className="delivery-type-title">
                    {t("auctionForm.deliveryType.artist") ||
                      "ხელოვანი თვითონ აწვდის"}
                  </div>
                  <div className="delivery-type-desc">
                    {t("auctionForm.deliveryType.artistDesc") ||
                      "მიუთითეთ თქვენი მიწოდების ვადა"}
                  </div>
                  {formState.deliveryType === "artist" && (
                    <div className="delivery-info-inline artist-info">
                      ✓ მიტანა თქვენი მოვალეობაა, მინოდების ვადა
                    </div>
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* Delivery info message - shown below selector */}
          {formState.deliveryType === "soulart" && (
            <div className="delivery-info-box soulart-delivery-info">
              <div className="info-icon">💡</div>
              <div className="info-text">
                <strong>მიტანის სერვისს ემატება გაყიდულის 5%</strong>
                <span className="info-details">
                  მინიმუმ 15₾, მაქსიმუმ 50₾. გთხოვთ საწყისს ფასში გაითვალისწინოთ
                  ეს თანხაც.
                </span>
              </div>
            </div>
          )}
          {formState.deliveryType === "artist" && (
            <div className="delivery-info-box artist-delivery-info">
              <div className="info-icon">⚠️</div>
              <div className="info-text">
                <strong>
                  გთხოვთ საწყისს ფასში გაითვალისწინოთ მიტანის ღირებულებაც!
                </strong>
                <span className="info-details">
                  მყიდველისთვის მიტანა უნდა იყოს უფასო.
                </span>
              </div>
            </div>
          )}

          {/* Artist Delivery Details - only shown when artist delivery selected */}
          {formState.deliveryType === "artist" && (
            <div className="artist-delivery-fields">
              <div className="delivery-days-row">
                <div className="delivery-days-field">
                  <label htmlFor="auction-delivery-days-min">
                    {t("auctionForm.labels.deliveryDaysMin") || "მინ. დღე"}
                  </label>
                  <input
                    id="auction-delivery-days-min"
                    type="number"
                    min="1"
                    value={formState.deliveryDaysMin}
                    onChange={(event) =>
                      handleInputChange("deliveryDaysMin", event.target.value)
                    }
                    disabled={isSubmitting}
                  />
                  {errors.deliveryDaysMin && (
                    <div className="error-message">
                      {errors.deliveryDaysMin}
                    </div>
                  )}
                </div>
                <div className="delivery-days-separator">—</div>
                <div className="delivery-days-field">
                  <label htmlFor="auction-delivery-days-max">
                    {t("auctionForm.labels.deliveryDaysMax") || "მაქს. დღე"}
                  </label>
                  <input
                    id="auction-delivery-days-max"
                    type="number"
                    min="1"
                    value={formState.deliveryDaysMax}
                    onChange={(event) =>
                      handleInputChange("deliveryDaysMax", event.target.value)
                    }
                    disabled={isSubmitting}
                  />
                  {errors.deliveryDaysMax && (
                    <div className="error-message">
                      {errors.deliveryDaysMax}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SoulArt Delivery Info - shown when soulart delivery selected */}
          {formState.deliveryType === "soulart" && (
            <div className="soulart-delivery-info">
              <div className="soulart-delivery-badge">
                ✓{" "}
                {t("auctionForm.deliveryType.soulartBadge") ||
                  "მიწოდება 1-3 სამუშაო დღეში მთელი საქართველოს მასშტაბით"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {t("actions.cancel")}
        </button>
        <button type="submit" className="primary-button">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
