"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import { ArtistProfileResponse, User } from "@/types";
import "./ArtistProfileSettings.css";

const socialFieldSchema = z
  .string()
  .max(255, "ბმული არ უნდა აღემატებოდეს 255 სიმბოლოს")
  .optional()
  .or(z.literal(""));

const artistFormSchema = z.object({
  artistSlug: z
    .string()
    .max(40, "სლაგი არ უნდა აღემატებოდეს 40 სიმბოლოს")
    .regex(
      /^[a-z0-9]*(?:-[a-z0-9]+)*$/,
      "გამოიყენეთ მხოლოდ მცირე ასოები და ჰიფენი"
    )
    .optional()
    .or(z.literal("")),
  artistLocation: z
    .string()
    .max(120, "ლოკაცია არ უნდა აღემატებოდეს 120 სიმბოლოს")
    .optional()
    .or(z.literal("")),
  artistBioGe: z
    .string()
    .max(2000, "ბიოგრაფია არ უნდა აღემატებოდეს 2000 სიმბოლოს")
    .optional()
    .or(z.literal("")),
  artistBioEn: z
    .string()
    .max(2000, "Biography must be under 2000 characters")
    .optional()
    .or(z.literal("")),
  artistOpenForCommissions: z.boolean().default(false),
  artistHighlightsInput: z
    .string()
    .max(500, "მთავარი ხაზები არ უნდა აღემატებოდეს 500 სიმბოლოს")
    .optional()
    .or(z.literal("")),
  artistDisciplinesInput: z
    .string()
    .max(600, "შემოქმედებითი მიმართულებები არ უნდა აღემატებოდეს 600 სიმბოლოს")
    .optional()
    .or(z.literal("")),
  artistSocials: z
    .object({
      instagram: socialFieldSchema,
      facebook: socialFieldSchema,
      behance: socialFieldSchema,
      dribbble: socialFieldSchema,
      website: socialFieldSchema,
      tiktok: socialFieldSchema,
      youtube: socialFieldSchema,
      pinterest: socialFieldSchema,
    })
    .partial()
    .optional(),
});

type ArtistFormValues = z.infer<typeof artistFormSchema>;

type ArtistProfileDefaults = ArtistProfileResponse["artist"];

type ArtistProfileSettingsProps = {
  user: User;
  artistDefaults?: ArtistProfileDefaults;
  refreshUserData: () => void;
  onClose?: () => void;
};

const MAX_HIGHLIGHTS = 6;
const MAX_DISCIPLINES = 10;
const MAX_GALLERY_ITEMS = 20;
const CLOUDINARY_HOST_PATTERN = /res\.cloudinary\.com/i;

const SOCIAL_KEYS = [
  "instagram",
  "facebook",
  "behance",
  "dribbble",
  "website",
  "tiktok",
  "youtube",
  "pinterest",
] as const;

type SocialKey = (typeof SOCIAL_KEYS)[number];

const SOCIAL_FIELD_META: Array<{
  key: SocialKey;
  labelEn: string;
  labelGe: string;
  placeholderEn: string;
  placeholderGe: string;
}> = [
  {
    key: "instagram",
    labelEn: "Instagram",
    labelGe: "Instagram",
    placeholderEn: "instagram.com/username",
    placeholderGe: "instagram.com/username",
  },
  {
    key: "facebook",
    labelEn: "Facebook",
    labelGe: "Facebook",
    placeholderEn: "facebook.com/username",
    placeholderGe: "facebook.com/username",
  },
  {
    key: "behance",
    labelEn: "Behance",
    labelGe: "Behance",
    placeholderEn: "behance.net/username",
    placeholderGe: "behance.net/username",
  },
  {
    key: "dribbble",
    labelEn: "Dribbble",
    labelGe: "Dribbble",
    placeholderEn: "dribbble.com/username",
    placeholderGe: "dribbble.com/username",
  },
  {
    key: "website",
    labelEn: "Website",
    labelGe: "ვებგვერდი",
    placeholderEn: "https://your-portfolio.com",
    placeholderGe: "https://your-portfolio.com",
  },
  {
    key: "tiktok",
    labelEn: "TikTok",
    labelGe: "TikTok",
    placeholderEn: "tiktok.com/@username",
    placeholderGe: "tiktok.com/@username",
  },
  {
    key: "youtube",
    labelEn: "YouTube",
    labelGe: "YouTube",
    placeholderEn: "youtube.com/@channel",
    placeholderGe: "youtube.com/@channel",
  },
  {
    key: "pinterest",
    labelEn: "Pinterest",
    labelGe: "Pinterest",
    placeholderEn: "pinterest.com/username",
    placeholderGe: "pinterest.com/username",
  },
];

function toPlainRecord(
  source?: Record<string, string> | Map<string, string> | null
): Record<string, string> {
  if (!source) return {};
  if (source instanceof Map) {
    return Object.fromEntries(source);
  }
  return source;
}

function parseListInput(value: string | undefined, maxItems: number) {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeStringList(list?: string[] | null) {
  if (!list) return [];
  return list.map((value) => value.trim()).filter(Boolean);
}

function sanitizeGallery(list?: string[] | null) {
  if (!list) return [];
  return list.map((item) => item.trim()).filter((item) => item.length > 0);
}

function isCloudinaryUrl(url: string) {
  return CLOUDINARY_HOST_PATTERN.test(url.trim());
}

function mergeBioRecords(
  primary: Record<string, string>,
  fallback: Record<string, string>
) {
  return Object.fromEntries(
    Object.entries({ ...fallback, ...primary }).filter(([, value]) =>
      Boolean(value?.trim())
    )
  );
}

function sanitizeSocials(
  socials?: Partial<Record<SocialKey, string>> | null
): Partial<Record<SocialKey, string>> {
  const result: Partial<Record<SocialKey, string>> = {};

  SOCIAL_KEYS.forEach((key) => {
    const value = socials?.[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        result[key] = trimmed;
      }
    }
  });

  return result;
}

function mergeSocialRecords(
  primary: Partial<Record<SocialKey, string>>,
  fallback: Partial<Record<SocialKey, string>>
): Partial<Record<SocialKey, string>> {
  const result: Partial<Record<SocialKey, string>> = {};

  SOCIAL_KEYS.forEach((key) => {
    const preferred = primary[key] ?? fallback[key];
    if (preferred) {
      result[key] = preferred;
    }
  });

  return result;
}

function areStringArraysEqual(a: string[] = [], b: string[] = []) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function areRecordsEqual(
  current: Partial<Record<string, string>>,
  next: Partial<Record<string, string>>
) {
  const currentKeys = Object.keys(current).sort();
  const nextKeys = Object.keys(next).sort();

  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return currentKeys.every(
    (key, index) =>
      key === nextKeys[index] && current[key]?.trim() === next[key]?.trim()
  );
}

export function ArtistProfileSettings({
  user,
  artistDefaults,
  refreshUserData,
  onClose,
}: ArtistProfileSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  const userBioRecord = useMemo(
    () => toPlainRecord(user.artistBio),
    [user.artistBio]
  );
  const artistBioRecord = useMemo(
    () => toPlainRecord(artistDefaults?.artistBio),
    [artistDefaults?.artistBio]
  );
  const existingBio = useMemo(
    () => mergeBioRecords(userBioRecord, artistBioRecord),
    [userBioRecord, artistBioRecord]
  );

  const baselineValues = useMemo(() => {
    const slug = user.artistSlug ?? artistDefaults?.artistSlug ?? "";
    const location =
      user.artistLocation ?? artistDefaults?.artistLocation ?? "";
    const openForCommissions =
      user.artistOpenForCommissions ??
      artistDefaults?.artistOpenForCommissions ??
      false;
    const highlightsSource = sanitizeStringList(user.artistHighlights);
    const fallbackHighlights = sanitizeStringList(
      artistDefaults?.artistHighlights
    );
    const disciplinesSource = sanitizeStringList(user.artistDisciplines);
    const fallbackDisciplines = sanitizeStringList(
      artistDefaults?.artistDisciplines
    );
    const gallerySource = sanitizeGallery(user.artistGallery);
    const fallbackGallery = sanitizeGallery(artistDefaults?.artistGallery);
    const userSocialRecord = sanitizeSocials(
      (user.artistSocials ?? null) as Partial<Record<SocialKey, string>> | null
    );
    const artistSocialRecord = sanitizeSocials(
      (artistDefaults?.artistSocials ?? null) as Partial<
        Record<SocialKey, string>
      > | null
    );
    const socials = mergeSocialRecords(userSocialRecord, artistSocialRecord);
    const coverCandidate =
      user.artistCoverImage ?? artistDefaults?.artistCoverImage ?? null;
    const cover =
      typeof coverCandidate === "string" && coverCandidate.trim().length > 0
        ? coverCandidate.trim()
        : null;

    return {
      slug,
      location,
      openForCommissions,
      highlights:
        highlightsSource.length > 0 ? highlightsSource : fallbackHighlights,
      disciplines:
        disciplinesSource.length > 0 ? disciplinesSource : fallbackDisciplines,
      gallery: gallerySource.length > 0 ? gallerySource : fallbackGallery,
      socials,
      cover,
    };
  }, [
    artistDefaults?.artistDisciplines,
    artistDefaults?.artistGallery,
    artistDefaults?.artistCoverImage,
    artistDefaults?.artistHighlights,
    artistDefaults?.artistLocation,
    artistDefaults?.artistOpenForCommissions,
    artistDefaults?.artistSlug,
    artistDefaults?.artistSocials,
    user.artistDisciplines,
    user.artistGallery,
    user.artistCoverImage,
    user.artistHighlights,
    user.artistLocation,
    user.artistOpenForCommissions,
    user.artistSocials,
    user.artistSlug,
  ]);

  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const [slugMessage, setSlugMessage] = useState<ReactNode>("");
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(
    baselineValues.slug || null
  );
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [galleryDraft, setGalleryDraft] = useState<string[]>(
    baselineValues.gallery
  );
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const [coverImageDraft, setCoverImageDraft] = useState<string | null>(
    baselineValues.cover ?? null
  );
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const sanitizedGalleryDraft = useMemo(
    () => sanitizeGallery(galleryDraft),
    [galleryDraft]
  );
  const sanitizedCoverDraft = useMemo(() => {
    if (!coverImageDraft) return null;
    const trimmed = coverImageDraft.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [coverImageDraft]);

  const form = useForm<ArtistFormValues>({
    resolver: zodResolver(artistFormSchema),
    defaultValues: {
      artistSlug: baselineValues.slug,
      artistLocation: baselineValues.location,
      artistBioGe: existingBio.ge || "",
      artistBioEn: existingBio.en || "",
      artistOpenForCommissions: baselineValues.openForCommissions,
      artistHighlightsInput: baselineValues.highlights.join(", "),
      artistDisciplinesInput: baselineValues.disciplines.join(", "),
      artistSocials: baselineValues.socials,
    },
  });

  useEffect(() => {
    setLastSavedSlug(baselineValues.slug || null);
    setGalleryDraft(baselineValues.gallery);
    setGalleryError(null);
    setCoverImageDraft(baselineValues.cover ?? null);
    setCoverError(null);
    form.reset(
      {
        artistSlug: baselineValues.slug,
        artistLocation: baselineValues.location,
        artistBioGe: existingBio.ge || "",
        artistBioEn: existingBio.en || "",
        artistOpenForCommissions: baselineValues.openForCommissions,
        artistHighlightsInput: baselineValues.highlights.join(", "),
        artistDisciplinesInput: baselineValues.disciplines.join(", "),
        artistSocials: baselineValues.socials,
      },
      {
        keepDirty: false,
        keepTouched: false,
      }
    );
  }, [baselineValues, existingBio, form]);

  const portfolioBaseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL || "https://soulart.ge";
  const buildPortfolioUrl = (slug: string) =>
    `${portfolioBaseUrl}/@${slug}`;

  const slugField = form.register("artistSlug");
  const locationField = form.register("artistLocation");
  const bioGeField = form.register("artistBioGe");
  const bioEnField = form.register("artistBioEn");
  const highlightsField = form.register("artistHighlightsInput");
  const disciplinesField = form.register("artistDisciplinesInput");
  const isOpenForCommissions = form.watch("artistOpenForCommissions");

  useEffect(() => {
    form.register("artistOpenForCommissions");
  }, [form]);

  const handleSlugCheck = async () => {
    const slug = form.getValues("artistSlug")?.trim().toLowerCase();

    if (!slug) {
      setSlugStatus("idle");
      setSlugMessage("");
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
          excludeId: user._id,
        },
      });

      if (data.available) {
        setSlugStatus("available");
        const previewUrl = buildPortfolioUrl(slug);
        setSlugMessage(
          language === "en" ? (
            <span>
              Great! Your personal site will be
              <strong> {previewUrl}</strong>. Press “Create portfolio” to
              publish it.
            </span>
          ) : (
            <span>
              სუპერ! შენი პირადი გვერდი იქნება
              <strong> {previewUrl}</strong>. დაეჭირე „პორტფოლიოს შექმნა“ და
              გააქტიურე.
            </span>
          )
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
          ? "Failed to check slug"
          : "სლაგის შემოწმება ვერ მოხერხდა"
      );
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
      toast({
        title: language === "en" ? "Link copied" : "ბმული წარმატებით დაკოპირდა",
      });
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      setCopyState("idle");
      toast({
        title:
          language === "en"
            ? "Couldn't copy link"
            : "ბმულის კოპირება ვერ მოხერხდა",
        variant: "destructive",
      });
    }
  };

  const triggerCoverUpload = () => {
    setCoverError(null);
    coverFileInputRef.current?.click();
  };

  const triggerGalleryUpload = () => {
    setGalleryError(null);
    galleryFileInputRef.current?.click();
  };

  const handleCoverFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCoverError(
        language === "en"
          ? "Please upload an image file."
          : "ატვირთე მხოლოდ სურათის ტიპის ფაილი."
      );
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingCover(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/artists/cover", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const coverUrl: string | undefined = response.data?.coverUrl;
      if (!coverUrl || !isCloudinaryUrl(coverUrl)) {
        throw new Error(
          language === "en"
            ? "Upload succeeded but returned file was invalid."
            : "ატვირთვა შესრულდა, თუმცა დაბრუნებული ბმული არასწორია."
        );
      }

      setCoverImageDraft(coverUrl);
      setCoverError(null);
      refreshUserData();
      toast({
        title:
          language === "en" ? "Cover image updated" : "ქავერის ფოტო განახლდა",
      });
    } catch (error) {
      console.error("Cover upload failed", error);
      const message =
        error instanceof Error
          ? error.message
          : language === "en"
          ? "Failed to upload cover image."
          : "ქავერის სურათის ატვირთვა ვერ მოხერხდა.";
      setCoverError(message);
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleCoverRemove = () => {
    setCoverImageDraft(null);
    setCoverError(null);
    toast({
      title: language === "en" ? "Cover removed" : "ქავერის ფოტო წაიშალა",
      description:
        language === "en"
          ? "Press “Save public profile” to apply this change."
          : "ცვლილების დასადასტურებლად დააჭირე „საჯარო პროფილის შენახვა“-ს.",
    });
  };

  const handleGalleryFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setGalleryError(
        language === "en"
          ? "Please upload an image file."
          : "ატვირთე მხოლოდ სურათის ტიპის ფაილი."
      );
      event.target.value = "";
      return;
    }

    if (sanitizedGalleryDraft.length >= MAX_GALLERY_ITEMS) {
      setGalleryError(
        language === "en"
          ? "You reached the maximum number of gallery images."
          : "პორტფოლიოში სურათების მაქსიმალური რაოდენობა უკვე შევსებულია."
      );
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/artists/gallery", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedGallery = sanitizeGallery(response.data?.gallery);
      if (uploadedGallery.length === 0) {
        throw new Error(
          language === "en"
            ? "Upload succeeded but no gallery returned."
            : "ატვირთვა შესრულდა, თუმცა გალერეა ცარიელია."
        );
      }

      setGalleryDraft(uploadedGallery);
      refreshUserData();
      toast({
        title:
          language === "en"
            ? "Image added to gallery"
            : "სურათი დაემატა პორტფოლიოში",
      });
    } catch (error) {
      console.error("Gallery upload failed", error);
      const message =
        error instanceof Error
          ? error.message
          : language === "en"
          ? "Failed to upload image."
          : "სურათის ატვირთვა ვერ მოხერხდა.";
      setGalleryError(message);
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleGalleryRemove = async (index: number) => {
    const imageUrl = galleryDraft[index];
    if (!imageUrl) {
      return;
    }

    setGalleryError(null);
    setRemovingIndex(index);
    try {
      const response = await apiClient.delete("/artists/gallery", {
        data: { imageUrl },
      });
      const nextGallery = sanitizeGallery(response.data?.gallery);
      setGalleryDraft(nextGallery);
      refreshUserData();
      toast({
        title:
          language === "en"
            ? "Image removed from gallery"
            : "სურათი წაიშალა პორტფოლიოდან",
      });
    } catch (error) {
      console.error("Gallery removal failed", error);
      const message =
        error instanceof Error
          ? error.message
          : language === "en"
          ? "Failed to remove image."
          : "სურათის წაშლა ვერ მოხერხდა.";
      setGalleryError(message);
    } finally {
      setRemovingIndex(null);
    }
  };

  const handleGalleryMove = (index: number, direction: -1 | 1) => {
    setGalleryDraft((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const updateProfileMutation = useMutation({
    mutationFn: async ({
      values,
      gallery,
      cover,
    }: {
      values: ArtistFormValues;
      gallery: string[];
      cover: string | null;
    }) => {
      const rawSlug = values.artistSlug?.trim().toLowerCase() || "";
      const payload: Record<string, unknown> = {};

      if (rawSlug !== baselineValues.slug) {
        payload.artistSlug = rawSlug || null;
      }

      const location = values.artistLocation?.trim() || "";
      if (location !== (baselineValues.location || "")) {
        payload.artistLocation = location || null;
      }

      const currentBio = existingBio;
      const nextBioDraft: Record<string, string> = { ...currentBio };
      const bioGe = values.artistBioGe?.trim() || "";
      const bioEn = values.artistBioEn?.trim() || "";

      if (bioGe) {
        nextBioDraft.ge = bioGe;
      } else {
        delete nextBioDraft.ge;
      }

      if (bioEn) {
        nextBioDraft.en = bioEn;
      } else {
        delete nextBioDraft.en;
      }

      const sanitizedNextBio = Object.fromEntries(
        Object.entries(nextBioDraft).filter(
          ([, value]) => value && value.length
        )
      );

      if (!areRecordsEqual(currentBio, sanitizedNextBio)) {
        payload.artistBio = sanitizedNextBio;
      }

      const existingHighlights = baselineValues.highlights;
      const nextHighlights = parseListInput(
        values.artistHighlightsInput,
        MAX_HIGHLIGHTS
      );
      if (!areStringArraysEqual(existingHighlights, nextHighlights)) {
        payload.artistHighlights = nextHighlights;
      }

      const existingDisciplines = baselineValues.disciplines;
      const nextDisciplines = parseListInput(
        values.artistDisciplinesInput,
        MAX_DISCIPLINES
      );
      if (!areStringArraysEqual(existingDisciplines, nextDisciplines)) {
        payload.artistDisciplines = nextDisciplines;
      }

      const currentOpenForCommissions = baselineValues.openForCommissions;
      if (values.artistOpenForCommissions !== currentOpenForCommissions) {
        payload.artistOpenForCommissions = values.artistOpenForCommissions;
      }

      const existingGallery = baselineValues.gallery;
      const nextGallery = sanitizeGallery(gallery).slice(0, MAX_GALLERY_ITEMS);
      if (!areStringArraysEqual(existingGallery, nextGallery)) {
        payload.artistGallery = nextGallery;
      }

      const existingCover = baselineValues.cover ?? null;
      const nextCover = cover ?? null;
      if (existingCover !== nextCover) {
        payload.artistCoverImage = nextCover;
      }

      const existingSocials = baselineValues.socials;
      const nextSocials = sanitizeSocials(values.artistSocials ?? {});
      if (!areRecordsEqual(existingSocials, nextSocials)) {
        payload.artistSocials = nextSocials;
      }

      if (Object.keys(payload).length === 0) {
        return { message: "No changes" };
      }

      const response = await apiClient.patch("/artists/profile", payload);
      return {
        ...response.data,
        submittedPayload: payload,
      };
    },
    onSuccess: (data, variables) => {
      const response: any = data;
      const pendingSlug =
        variables.values.artistSlug?.trim()?.toLowerCase() || "";
      const updatedSlug: string | null =
        response?.artist?.artistSlug ?? (pendingSlug || null);

      if (response?.message === "No changes") {
        toast({
          title:
            language === "en" ? "Nothing to update" : "ცვლილება არ დაფიქსირდა",
        });
      } else {
        toast({
          title:
            language === "en"
              ? "Artist profile saved"
              : "არტისტის პროფილი შენახულია",
        });
      }

      setLastSavedSlug(updatedSlug);
      setCopyState("idle");

      if (updatedSlug) {
        const portfolioLink = buildPortfolioUrl(updatedSlug);
        setSlugStatus("available");
        setSlugMessage(
          language === "en" ? (
            <span>
              Your personal portfolio is live! Visit
              <strong> {portfolioLink}</strong> to fine-tune every section.
            </span>
          ) : (
            <span>
              შენი პორტფოლიო უკვე ჩართულია! გადადი
              <strong> {portfolioLink}</strong> და იქიდან მართე ყველა ბლოკი.
            </span>
          )
        );
      } else if (pendingSlug === "") {
        setSlugStatus("idle");
        setSlugMessage(
          language === "en"
            ? "Personal link cleared. Enter a new username to create it again."
            : "პირადი ბმული გაუქმდა. ახალი სახელის ჩასაწერად უბრალოდ შეიყვანე."
        );
      }

      if (Array.isArray(response?.artist?.artistGallery)) {
        setGalleryDraft(sanitizeGallery(response.artist.artistGallery));
      }

      if (typeof response?.artist?.artistCoverImage === "string") {
        setCoverImageDraft(response.artist.artistCoverImage.trim());
      } else if (response?.artist?.artistCoverImage === null) {
        setCoverImageDraft(null);
      }

      refreshUserData();
      queryClient.invalidateQueries({ queryKey: ["user"] });
      if (response?.message !== "No changes") {
        onClose?.();
      }
    },
    onError: (error) => {
      const description = error instanceof Error ? error.message : undefined;
      toast({
        title:
          language === "en"
            ? "Failed to update profile"
            : "პროფილის განახლება ვერ მოხერხდა",
        description,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ArtistFormValues) => {
    updateProfileMutation.mutate({
      values,
      gallery: sanitizedGalleryDraft,
      cover: sanitizedCoverDraft,
    });
  };

  const handleSlugSave = async () => {
    const isValid = await form.trigger("artistSlug");
    if (!isValid) {
      setSlugStatus("error");
      setSlugMessage(
        language === "en"
          ? "Please fix the highlighted username before saving."
          : "გთხოვ, შეასწორე მომხმარებლის სახელი შენახვამდე."
      );
      return;
    }

    setCopyState("idle");
    form.handleSubmit(onSubmit)();
  };

  const slugStatusClass =
    slugStatus === "available"
      ? "slug-status slug-status--available"
      : slugStatus === "taken"
      ? "slug-status slug-status--taken"
      : slugStatus === "error"
      ? "slug-status slug-status--error"
      : "slug-status";

  return (
    <section className="artist-settings">
      <div className="artist-settings__header">
        <h2>{language === "en" ? "Store Link" : "მაღაზიის ბმული"}</h2>
        <p className="artist-settings__description">
          {language === "en"
            ? "Choose a simple username for your personal store page."
            : "აირჩიე მარტივი username შენი პირადი მაღაზიის გვერდისთვის."}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="artist-form">
        <div className="artist-portfolio-cta">
          <div className="artist-portfolio-cta__header">
            <h3>
              {language === "en"
                ? "Your personal store link"
                : "შენი პირადი მაღაზიის ბმული"}
            </h3>
            <p>
              {language === "en"
                ? "Username should be simple and easy to remember."
                : "username სასურველია იყოს მარტივი და დასამახსოვრებელი."}
            </p>
          </div>
          <div className="artist-portfolio-cta__field">
            <label htmlFor="artistSlug">
              {language === "en"
                ? "Choose your username"
                : "აირჩიე მომხმარებლის სახელი"}
            </label>
            <div className="artist-portfolio-cta__input">
              <span className="artist-portfolio-cta__prefix">
                {portfolioBaseUrl.replace(/^https?:\/\//, "")}/@
              </span>
              <input
                id="artistSlug"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="username"
                {...slugField}
                onBlur={async (event) => {
                  slugField.onBlur(event);
                  await handleSlugCheck();
                }}
                onChange={(event) => {
                  slugField.onChange(event);
                  setSlugStatus("idle");
                  setSlugMessage("");
                }}
              />
            </div>
          </div>
          <div className="artist-portfolio-cta__actions">
            <button
              type="button"
              className="artist-button artist-button--ghost artist-button--small"
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
              className="artist-button artist-button--small"
              onClick={handleSlugSave}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending
                ? language === "en"
                  ? "Saving..."
                  : "ვინახავ..."
                : language === "en"
                ? "Save changes"
                : "ცვლილებების შენახვა"}
            </button>
          </div>
          {slugMessage && <div className={slugStatusClass}>{slugMessage}</div>}
          {lastSavedSlug && (
            <div className="artist-portfolio-share">
              <p>
                {language === "en"
                  ? "Share your link or open it to edit your live portfolio."
                  : "გაზიარე ბმული ან გახსენი, რათა ცოცხლად შეცვალო პორტფოლიო."}
              </p>
              <div className="artist-portfolio-share__actions">
                <a
                  href={buildPortfolioUrl(lastSavedSlug)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="artist-button artist-button--ghost artist-button--small"
                >
                  {language === "en" ? "Visit portfolio" : "პორტფოლიოს ნახვა"}
                </a>
                <button
                  type="button"
                  className="artist-button artist-button--outline artist-button--small"
                  onClick={() =>
                    handleCopyLink(buildPortfolioUrl(lastSavedSlug))
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
          )}
        </div>

        <div className="artist-form__row">
          <label htmlFor="artistLocation">
            {language === "en" ? "Location" : "ლოკაცია"}
          </label>
          <input
            id="artistLocation"
            type="text"
            placeholder={
              language === "en" ? "City, Country" : "ქალაქი, ქვეყანა"
            }
            {...locationField}
          />
        </div>

        <div className="artist-form__row artist-form__row--switch">
          <div>
            <label htmlFor="artistOpenForCommissions">
              {language === "en"
                ? "Open for commissions"
                : "იღებ ინდივიდუალურ შეკვეთებს"}
            </label>
            <p className="artist-settings__hint">
              {language === "en"
                ? "Toggle on if you currently accept tailor-made projects."
                : "ჩართე, თუ ამჟამად იღებ ინდივიდუალურ შეკვეთებს."}
            </p>
          </div>
          <input
            id="artistOpenForCommissions"
            type="checkbox"
            checked={isOpenForCommissions}
            onChange={(event) =>
              form.setValue("artistOpenForCommissions", event.target.checked, {
                shouldDirty: true,
              })
            }
          />
        </div>

        <div className="artist-form__row artist-form__row--grid">
          <div className="artist-form__row">
            <label htmlFor="artistBioGe">
              {language === "en" ? "About (Georgian)" : "ჩემს შესახებ (ქართ.)"}
            </label>
            <textarea
              id="artistBioGe"
              placeholder={
                language === "en"
                  ? "Share your story in Georgian."
                  : "მოკლედ აღწერე შენი შემოქმედება."
              }
              {...bioGeField}
            />
          </div>
          <div className="artist-form__row">
            <label htmlFor="artistBioEn">
              {language === "en" ? "About (English)" : "ჩემს შესახებ (ინგლ.)"}
            </label>
            <textarea
              id="artistBioEn"
              placeholder={
                language === "en"
                  ? "Optional: English version for international visitors."
                  : "სურვილისამებრ დაამატე ინგლისურ ენაზე."
              }
              {...bioEnField}
            />
          </div>
        </div>

        <div className="artist-form__row">
          <label htmlFor="artistHighlightsInput">
            {language === "en" ? "Highlights" : "მთავარი ხაზები"}
          </label>
          <textarea
            id="artistHighlightsInput"
            placeholder={
              language === "en"
                ? "e.g. Abstract murals, Large scale installations"
                : "მაგ: აბსტრაქტული მიურალი, დიდი ზომის ინსტალაციები"
            }
            {...highlightsField}
          />
          <p className="artist-settings__hint">
            {language === "en"
              ? "Highlights are your signature strengths — list up to six, separated by commas or line breaks."
              : "მთავარი ხაზები არის შენი ყველაზე ძლიერი მიმართულებები — მიუთითე მაქსიმუმ ექვსი, გამოყავი მძიმით ან ახალ ხაზზე."}
          </p>
        </div>

        <div className="artist-form__row">
          <label htmlFor="artistDisciplinesInput">
            {language === "en"
              ? "Creative directions"
              : "შემოქმედებითი მიმართულებები"}
          </label>
          <textarea
            id="artistDisciplinesInput"
            placeholder={
              language === "en"
                ? "e.g. Illustration, Sculpture, Textile art"
                : "მაგ: ილუსტრაცია, ქანდაკება, ტექსტილის ხელოვნება"
            }
            {...disciplinesField}
          />
          <p className="artist-settings__hint">
            {language === "en"
              ? "List up to ten disciplines you actively create in."
              : "ჩაწერე მაქსიმუმ ათი მიმართულება, სადაც აქტიურად ქმნი."}
          </p>
        </div>

        <div className="artist-form__socials">
          <div>
            <h3>
              {language === "en" ? "Social profiles" : "სოციალური ბმულები"}
            </h3>
            <p className="artist-settings__hint">
              {language === "en"
                ? "Add the channels where people can follow your work. Leave blank to hide a network."
                : "დაამატე არხები, სადაც გამომწერებს შეუძლიათ შენი შემოქმედების ნახვა. ცარიელი ველი დამალულია."}
            </p>
          </div>
          <div className="artist-form__socials-grid">
            {SOCIAL_FIELD_META.map(
              ({ key, labelEn, labelGe, placeholderEn, placeholderGe }) => (
                <div className="artist-form__socials-field" key={key}>
                  <label htmlFor={`artistSocial-${key}`}>
                    {language === "en" ? labelEn : labelGe}
                  </label>
                  <input
                    id={`artistSocial-${key}`}
                    type="url"
                    autoComplete="off"
                    placeholder={
                      language === "en" ? placeholderEn : placeholderGe
                    }
                    {...form.register(`artistSocials.${key}` as const)}
                  />
                </div>
              )
            )}
          </div>
        </div>

        <div className="artist-settings__cover">
          <div>
            <h3>{language === "en" ? "Cover image" : "ქავერის ფოტო"}</h3>
            <p className="artist-settings__hint">
              {language === "en"
                ? "This hero image appears at the top of your public portfolio. Aim for a wide format (16:9)."
                : "ეს ქავერის ფოტო ჩანს შენი საჯარო პორტფოლიოს თავში. იდეალურია ფართო ფორმატი (16:9)."}
            </p>
          </div>
          <div className="artist-cover">
            {sanitizedCoverDraft ? (
              <img
                src={sanitizedCoverDraft}
                alt={
                  language === "en"
                    ? "Portfolio cover image"
                    : "პორტფოლიოს ქავერის ფოტო"
                }
                className="artist-cover__image"
              />
            ) : (
              <div className="artist-cover__placeholder">
                {language === "en"
                  ? "No cover image yet"
                  : "ქავერის ფოტო ჯერ არ დამატებულა"}
              </div>
            )}
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              className="artist-file-input"
              onChange={handleCoverFileChange}
            />
            <div className="artist-cover__actions">
              <button
                type="button"
                className="artist-button artist-button--small"
                onClick={triggerCoverUpload}
                disabled={isUploadingCover}
              >
                {isUploadingCover
                  ? language === "en"
                    ? "Uploading..."
                    : "იტვირთება..."
                  : language === "en"
                  ? sanitizedCoverDraft
                    ? "Replace image"
                    : "Upload cover"
                  : sanitizedCoverDraft
                  ? "სურათის შეცვლა"
                  : "ქავერის ატვირთვა"}
              </button>
              {sanitizedCoverDraft ? (
                <button
                  type="button"
                  className="artist-button artist-button--ghost artist-button--small"
                  onClick={handleCoverRemove}
                  disabled={updateProfileMutation.isPending}
                >
                  {language === "en" ? "Remove cover" : "ქავერის წაშლა"}
                </button>
              ) : null}
            </div>
            <p className="artist-settings__hint">
              {language === "en"
                ? "Supported formats: JPG, PNG, WEBP. Maximum size 10 MB."
                : "მხარდაჭერილი ფორმატები: JPG, PNG, WEBP. მაქსიმალური ზომა 10 მბ."}
            </p>
            {coverError && (
              <p className="artist-settings__error" role="alert">
                {coverError}
              </p>
            )}
          </div>
        </div>

        <div className="artist-gallery-settings">
          <div className="artist-gallery-settings__header">
            <div>
              <h3>
                {language === "en" ? "Portfolio gallery" : "პორტფოლიოს გალერეა"}
              </h3>
              <p className="artist-settings__hint">
                {language === "en"
                  ? "Upload high-quality photos of projects that aren’t for sale. You can reorder or remove them anytime."
                  : "ატვირთე მაღალი ხარისხის ფოტოები, რომლებიც გაყიდვაში არ გაქვს. სურვილისამებრ გადაალაგე ან წაშალე."}
              </p>
            </div>
            <span className="artist-gallery-settings__counter">
              {sanitizedGalleryDraft.length}/{MAX_GALLERY_ITEMS}
            </span>
          </div>

          <div className="artist-gallery-settings__input">
            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/*"
              className="artist-file-input"
              onChange={handleGalleryFileChange}
            />
            <button
              type="button"
              className="artist-button artist-button--small"
              onClick={triggerGalleryUpload}
              disabled={
                isUploadingImage ||
                sanitizedGalleryDraft.length >= MAX_GALLERY_ITEMS
              }
            >
              {isUploadingImage
                ? language === "en"
                  ? "Uploading..."
                  : "იტვირთება..."
                : language === "en"
                ? "Upload image"
                : "სურათის ატვირთვა"}
            </button>
            <p className="artist-settings__hint">
              {language === "en"
                ? "Supported formats: JPG, PNG, WEBP. Up to 20 images."
                : "მხარდაჭერილი ფორმატები: JPG, PNG, WEBP. მაქსიმუმ 20 ფოტო."}
            </p>
          </div>
          {galleryError && (
            <p className="artist-settings__error" role="alert">
              {galleryError}
            </p>
          )}

          {sanitizedGalleryDraft.length > 0 ? (
            <div className="artist-gallery-grid">
              {galleryDraft.map((url, index) => {
                const trimmedUrl = url.trim();
                const isValid = isCloudinaryUrl(trimmedUrl);
                return (
                  <div
                    key={`${trimmedUrl}-${index}`}
                    className="artist-gallery-item"
                  >
                    {isValid ? (
                      <img
                        src={`${trimmedUrl}`}
                        alt={
                          language === "en"
                            ? "Portfolio gallery item"
                            : "პორტფოლიოს სურათი"
                        }
                        className="artist-gallery-item__image"
                      />
                    ) : (
                      <div className="artist-gallery-item__placeholder">
                        {language === "en"
                          ? "Preview unavailable"
                          : "გადახედვა მიუწვდომელია"}
                      </div>
                    )}
                    <div className="artist-gallery-item__actions">
                      <button
                        type="button"
                        className="artist-button artist-button--ghost artist-button--small"
                        onClick={() => handleGalleryMove(index, -1)}
                        disabled={index === 0}
                      >
                        {language === "en" ? "Move up" : "აწევ"}
                      </button>
                      <button
                        type="button"
                        className="artist-button artist-button--ghost artist-button--small"
                        onClick={() => handleGalleryMove(index, 1)}
                        disabled={index === galleryDraft.length - 1}
                      >
                        {language === "en" ? "Move down" : "ჩამოწევა"}
                      </button>
                      {isValid ? (
                        <a
                          href={trimmedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="artist-button artist-button--ghost artist-button--small"
                        >
                          {language === "en" ? "Open" : "გახსნა"}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="artist-button artist-button--outline artist-button--small"
                        onClick={() => handleGalleryRemove(index)}
                        disabled={removingIndex === index}
                      >
                        {removingIndex === index
                          ? language === "en"
                            ? "Removing..."
                            : "იშლება..."
                          : language === "en"
                          ? "Remove"
                          : "წაშლა"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="artist-empty">
              {language === "en"
                ? "No gallery images yet. Upload your first photo to start the showcase."
                : "ჯერ არ გაქვს პორტფოლიოს სურათები. ატვირთე პირველი ფოტო და შექმენი ვიტრინა."}
            </p>
          )}
        </div>

        <div className="artist-portfolio-cta__actions">
          <button
            type="submit"
            className="artist-button artist-button--small"
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending
              ? language === "en"
                ? "Saving..."
                : "ვინახავ..."
              : language === "en"
              ? "Save public profile"
              : "საჯარო პროფილის შენახვა"}
          </button>
        </div>
      </form>
    </section>
  );
}
