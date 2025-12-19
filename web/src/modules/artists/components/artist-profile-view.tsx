"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArtistProfileResponse,
  ArtistProductSummary,
  PortfolioImageSummary,
  User,
} from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { ArtistProfileSettings } from "@/modules/profile/components/ArtistProfileSettings";
import { GalleryLikeButton } from "@/components/gallery-like-button";
import { GalleryComments } from "@/components/gallery-comments";
import { GalleryViewer } from "@/components/gallery-viewer";
import { useGalleryInteractions } from "@/hooks/useGalleryInteractions";
import { AddToCartButton } from "@/modules/products/components/AddToCartButton";
import { useCart } from "@/modules/cart/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import {
  Grid3X3,
  ShoppingBag,
  Info,
  Plus,
  Upload,
  Star,
  Pencil,
  Camera,
  Trash2,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import BrushTrail from "@/components/BrushTrail/BrushTrail";
import { FollowButton } from "@/components/follow-button/follow-button";
import { FollowersModal } from "@/components/followers-modal/followers-modal";
import { ArtistReviewModal } from "./artist-review-modal";
import { ArtistReviewsList } from "./artist-reviews-list";
import { ShareButton } from "@/components/share-button/share-button";
import { trackArtistProfileView } from "@/lib/ga4-analytics";
import { fetchArtistProducts } from "@/lib/artist-api";
import { apiClient } from "@/lib/axios";
import "./artist-profile-view.css";
import "@/components/share-button/share-button.css";
import "@/components/gallery-interactions.css";
import "@/components/gallery-viewer.css";

interface ArtistProfileViewProps {
  data: ArtistProfileResponse;
}

const socialOrder: Array<{
  key: keyof ArtistProfileResponse["artist"]["artistSocials"];
  label: string;
}> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "behance", label: "Behance" },
  { key: "dribbble", label: "Dribbble" },
  { key: "website", label: "Website" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "pinterest", label: "Pinterest" },
];

function formatPrice(price: number, language: "en" | "ge") {
  if (!Number.isFinite(price)) {
    return language === "ge" ? "0,00 ₾" : "GEL 0.00";
  }

  const absolute = Math.abs(price);
  const [integerPart, fractionalPart] = absolute.toFixed(2).split(".");
  const sign = price < 0 ? "-" : "";

  const formatWithSeparator = (value: string, separator: string) =>
    value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  if (language === "ge") {
    const formattedInteger = formatWithSeparator(integerPart, " ");
    return `${sign}${formattedInteger},${fractionalPart} ₾`;
  }

  const formattedInteger = formatWithSeparator(integerPart, ",");
  return `${sign}GEL ${formattedInteger}.${fractionalPart}`;
}

function getSaleCopy(language: "en" | "ge") {
  return language === "en" ? "Available works" : "ხელმისაწვდომი ნამუშევრები";
}

function getGalleryCopy(language: "en" | "ge") {
  return language === "en" ? "Portfolio showcase" : "პორტფოლიოს ნამუშევრები";
}

function getInfoCopy(language: "en" | "ge") {
  return language === "en" ? "Artist info" : "არტისტის ინფორმაცია";
}

function getDisciplinesCopy(language: "en" | "ge") {
  return language === "en" ? "Creative focus" : "შემოქმედებითი მიმართულებები";
}

function getCommissionsCopy(language: "en" | "ge", isOpen: boolean) {
  if (language === "en") {
    return isOpen ? "Open for commissions" : "Not accepting commissions";
  }
  return isOpen
    ? "იღებს ინდივიდუალურ შეკვეთებს"
    : "ამჟამად არ იღებს ინდივიდუალურ შეკვეთებს";
}

function getActiveDiscountPercentage(product: ArtistProductSummary): number {
  const rawPercentage = product.discountPercentage ?? 0;
  if (!rawPercentage || rawPercentage <= 0) {
    return 0;
  }

  const now = Date.now();

  const parseDate = (value?: string | null): number | null => {
    if (!value) {
      return null;
    }
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  };

  const startTimestamp = parseDate(product.discountStartDate);
  const endTimestamp = parseDate(product.discountEndDate);

  const startsInFuture = startTimestamp !== null && startTimestamp > now;
  const endedInPast = endTimestamp !== null && endTimestamp < now;

  if (startsInFuture || endedInPast) {
    return 0;
  }

  return rawPercentage;
}

function resolveBiography(
  bio:
    | ArtistProfileResponse["artist"]["artistBio"]
    | Map<string, string>
    | null
    | undefined,
  language: "en" | "ge"
) {
  if (!bio) {
    return "";
  }

  const isMapLike = typeof bio?.get === "function";

  if (isMapLike) {
    const map = bio as unknown as Map<string, string>;
    const direct = map.get(language);
    if (typeof direct === "string" && direct.trim().length > 0) {
      return direct.trim();
    }

    for (const value of map.values()) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    return "";
  }

  const record = bio as Record<string, string>;
  const direct = record?.[language];
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const fallback = Object.values(record ?? {}).find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return fallback ? fallback.trim() : "";
}

export function ArtistProfileView({ data }: ArtistProfileViewProps) {
  const { language } = useLanguage();
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { artist, products, portfolio } = data;
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<"sale" | "gallery" | "info">(
    "sale"
  );
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(
    artist.followersCount || 0
  );
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [artistRating, setArtistRating] = useState(
    artist.artistDirectRating || 0
  );
  const [artistReviewsCount, setArtistReviewsCount] = useState(
    artist.artistDirectReviewsCount || 0
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [currentCoverImage, setCurrentCoverImage] = useState(
    artist.artistCoverImage || null
  );
  const heroRef = useRef<HTMLElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Track if we pushed a post URL to history (to know whether to pop on close)
  const pushedPostUrlRef = useRef(false);
  // Track last URL-synced post ID to avoid redundant replaceState calls
  const lastSyncedPostIdRef = useRef<string | null>(null);
  // Track if we've handled the initial URL (to prevent re-opening on close)
  const initialUrlHandledRef = useRef(false);

  // Products pagination state
  const [productItems, setProductItems] = useState<ArtistProductSummary[]>(
    products?.items ?? []
  );
  const [currentPage, setCurrentPage] = useState(products?.page ?? 1);
  const [hasMoreProducts, setHasMoreProducts] = useState(
    products?.hasMore ?? false
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [ownerProductsLoaded, setOwnerProductsLoaded] = useState(false);

  // Track artist profile view
  useEffect(() => {
    if (artist.artistSlug) {
      trackArtistProfileView(artist.artistSlug, "link");
    }
  }, [artist.artistSlug]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreProducts) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await fetchArtistProducts(
        artist.artistSlug || artist.id,
        nextPage,
        12,
        isOwner // Pass isOwner to include pending/rejected products
      );

      setProductItems((prev) => [...prev, ...result.items]);
      setCurrentPage(nextPage);
      setHasMoreProducts(result.hasMore);
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle product deletion - remove from local state
  const handleProductDelete = useCallback((productId: string) => {
    setProductItems((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  // Handle hash navigation for tabs
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash === "#portfolio") {
        setActiveTab("gallery");
      } else if (hash === "#info") {
        setActiveTab("info");
      }
      // No hash or any other hash defaults to "sale" tab (already the default)
    }
  }, []);

  const handleSettingsClose = useCallback(() => {
    setShowEditor(false);
  }, []);

  // Cover image upload handler
  const handleCoverUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: language === "en" ? "Error" : "შეცდომა",
          description:
            language === "en"
              ? "Please upload an image file."
              : "ატვირთე მხოლოდ სურათის ტიპის ფაილი.",
          variant: "destructive",
        });
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

        const coverUrl = response.data?.coverUrl;
        if (coverUrl) {
          setCurrentCoverImage(coverUrl);
          // Refresh user data and queries - no page refresh needed
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["artist-profile"] });
          toast({
            title: language === "en" ? "Cover updated" : "ქავერი განახლდა",
            description:
              language === "en"
                ? "Your cover photo has been updated successfully."
                : "ქავერის ფოტო წარმატებით განახლდა.",
          });
        }
      } catch (error) {
        console.error("Cover upload failed", error);
        toast({
          title: language === "en" ? "Upload failed" : "ატვირთვა ვერ მოხერხდა",
          description:
            language === "en"
              ? "Failed to upload cover image. Please try again."
              : "ქავერის სურათის ატვირთვა ვერ მოხერხდა.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingCover(false);
        event.target.value = "";
      }
    },
    [language, queryClient, router, toast]
  );

  const triggerCoverUpload = useCallback(() => {
    coverFileInputRef.current?.click();
  }, []);

  // Avatar/Logo upload state and handler
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(artist.storeLogo || null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: language === "en" ? "Error" : "შეცდომა",
          description:
            language === "en"
              ? "Please upload an image file."
              : "ატვირთე მხოლოდ სურათის ტიპის ფაილი.",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }

      try {
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient.post("/users/seller-logo", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const logoUrl = response.data?.logoUrl || response.data?.storeLogo;
        if (logoUrl) {
          setCurrentAvatar(logoUrl);
          // Refresh user data and page
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["artist-profile"] });
          toast({
            title: language === "en" ? "Photo updated" : "ფოტო განახლდა",
            description:
              language === "en"
                ? "Your profile photo has been updated successfully."
                : "პროფილის ფოტო წარმატებით განახლდა.",
          });
        }
      } catch (error) {
        console.error("Avatar upload failed", error);
        toast({
          title: language === "en" ? "Upload failed" : "ატვირთვა ვერ მოხერხდა",
          description:
            language === "en"
              ? "Failed to upload profile photo. Please try again."
              : "პროფილის ფოტოს ატვირთვა ვერ მოხერხდა.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingAvatar(false);
        event.target.value = "";
      }
    },
    [language, queryClient, router, toast]
  );

  const triggerAvatarUpload = useCallback(() => {
    avatarFileInputRef.current?.click();
  }, []);

  const biography = useMemo(() => {
    return resolveBiography(artist.artistBio, language);
  }, [artist.artistBio, language]);

  const heroBackground =
    currentCoverImage || artist.artistCoverImage || undefined;
  const avatar = currentAvatar || artist.storeLogo || undefined;

  const portfolioPosts = useMemo(() => portfolio?.posts ?? [], [portfolio]);

  const { galleryPosts, galleryItems } = useMemo(() => {
    type GalleryPost = {
      postId: string | null;
      productId: string | null;
      caption: string | null;
      hideBuyButton: boolean;
      isSold: boolean;
      isFeatured: boolean;
      images: PortfolioImageSummary[];
    };

    const sanitizeImages = (images?: PortfolioImageSummary[] | null) =>
      (images ?? [])
        .filter(
          (image) =>
            image &&
            typeof image.url === "string" &&
            image.url.trim().length > 0
        )
        .map((image, index) => ({
          ...image,
          url: image.url.trim(),
          order: typeof image.order === "number" ? image.order : index,
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const posts: GalleryPost[] = [];

    if (Array.isArray(portfolioPosts) && portfolioPosts.length > 0) {
      portfolioPosts.forEach((post) => {
        const images = sanitizeImages(post.images);
        if (!images.length) {
          return;
        }

        // Derive state from populated product if available
        let hideBuyButton = post.hideBuyButton ?? false;
        let isSold = post.isSold ?? false;
        let actualProductId: string | null =
          typeof post.productId === "string" ? post.productId : null;

        if (post.productId && typeof post.productId === "object") {
          const product = post.productId;
          actualProductId = product._id;

          // Check if product has stock
          const hasStock = (() => {
            if (
              Array.isArray(product.variants) &&
              product.variants.length > 0
            ) {
              return product.variants.some((v) => (v.stock ?? 0) > 0);
            }
            return (product.countInStock ?? 0) > 0;
          })();

          isSold = !hasStock;
          hideBuyButton = product.status !== "APPROVED" || !hasStock;
        }

        posts.push({
          postId: post.id ?? null,
          productId: actualProductId,
          caption:
            typeof post.caption === "string" && post.caption.trim().length > 0
              ? post.caption.trim()
              : null,
          hideBuyButton,
          isSold,
          isFeatured: post.isFeatured ?? false,
          images,
        });
      });
    }

    if (posts.length === 0) {
      (artist.artistGallery ?? [])
        .filter((url) => typeof url === "string" && url.trim().length > 0)
        .forEach((url, index) => {
          posts.push({
            postId: null,
            productId: null,
            caption: null,
            hideBuyButton: true,
            isSold: false,
            isFeatured: false,
            images: [
              {
                url: url.trim(),
                order: index,
                metadata: { source: "legacy-gallery" },
              } as PortfolioImageSummary,
            ],
          });
        });
    }

    const imageUrls: string[] = [];
    posts.forEach((post) => {
      post.images.forEach((image) => {
        imageUrls.push(image.url);
      });
    });

    return {
      galleryPosts: posts,
      galleryItems: imageUrls,
    };
  }, [portfolioPosts, artist.artistGallery]);

  // Build the artist base URL for post links
  const artistBaseUrl = useMemo(() => {
    return artist.artistSlug ? `/@${artist.artistSlug}` : `/artists/${artist.id}`;
  }, [artist.artistSlug, artist.id]);

  // Generate post URL for a given post
  const getPostUrl = useCallback((postId: string | null) => {
    if (!postId) return artistBaseUrl;
    return `${artistBaseUrl}?post=${postId}`;
  }, [artistBaseUrl]);

  // Handle opening viewer from URL on initial load (runs only once)
  useEffect(() => {
    // Only handle initial URL once
    if (initialUrlHandledRef.current) return;
    
    const postId = searchParams?.get("post");
    if (postId && galleryPosts.length > 0) {
      const postIndex = galleryPosts.findIndex(p => p.postId === postId);
      if (postIndex !== -1) {
        initialUrlHandledRef.current = true;
        setViewerIndex(postIndex);
        setViewerImageIndex(0);
        setViewerOpen(true);
        setActiveTab("gallery");
        // Don't set pushedPostUrlRef - we opened from URL, didn't push
        // This way closeViewer will use replaceState instead of history.back()
        lastSyncedPostIdRef.current = postId;
      }
    } else if (galleryPosts.length > 0) {
      // No post param but gallery loaded - mark as handled
      initialUrlHandledRef.current = true;
    }
  }, [searchParams, galleryPosts]);

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get("post");
      
      if (postId) {
        // Navigate to the post
        const postIndex = galleryPosts.findIndex(p => p.postId === postId);
        if (postIndex !== -1) {
          setViewerIndex(postIndex);
          setViewerImageIndex(0);
          setViewerOpen(true);
          lastSyncedPostIdRef.current = postId;
        }
      } else {
        // Close the viewer
        setViewerOpen(false);
        pushedPostUrlRef.current = false;
        lastSyncedPostIdRef.current = null;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [galleryPosts]);

  // Handle opening the viewer - push URL to history
  const openViewer = useCallback((postIndex: number, imageIndex: number = 0) => {
    const post = galleryPosts[postIndex];
    const postId = post?.postId;
    
    setViewerIndex(postIndex);
    setViewerImageIndex(imageIndex);
    setViewerOpen(true);
    
    if (postId) {
      const newUrl = getPostUrl(postId);
      window.history.pushState({ postId }, "", newUrl);
      pushedPostUrlRef.current = true;
      lastSyncedPostIdRef.current = postId;
    }
  }, [galleryPosts, getPostUrl]);

  // Handle post change in viewer (scrolling) - replace URL in history
  const handleCurrentPostChange = useCallback((postId: string | null) => {
    if (!postId || postId === lastSyncedPostIdRef.current) return;
    
    const newUrl = getPostUrl(postId);
    window.history.replaceState({ postId }, "", newUrl);
    lastSyncedPostIdRef.current = postId;
  }, [getPostUrl]);

  // Handle closing the viewer - go back in history or remove query param
  const closeViewer = useCallback(() => {
    if (pushedPostUrlRef.current) {
      // Go back in history to remove the post URL
      window.history.back();
    } else {
      // Just close the viewer (opened from direct URL)
      setViewerOpen(false);
      // Update URL to remove post param
      window.history.replaceState({}, "", artistBaseUrl);
    }
    pushedPostUrlRef.current = false;
    lastSyncedPostIdRef.current = null;
  }, [artistBaseUrl]);

  const anySocial = socialOrder.some(({ key }) => artist.artistSocials?.[key]);

  // Get user ID - could be _id or id depending on source (API vs localStorage)
  const userId = user?._id || (user as { id?: string })?.id;
  const isOwner = !userLoading && !!userId && userId === artist.id;

  // When owner is detected, fetch all products (including pending/rejected)
  useEffect(() => {
    if (isOwner && !ownerProductsLoaded) {
      const loadOwnerProducts = async () => {
        try {
          const result = await fetchArtistProducts(
            artist.artistSlug || artist.id,
            1,
            12,
            true // includeOwner
          );
          setProductItems(result.items);
          setCurrentPage(1);
          setHasMoreProducts(result.hasMore);
          setOwnerProductsLoaded(true);
        } catch (error) {
          console.error("Failed to load owner products:", error);
        }
      };
      loadOwnerProducts();
    }
  }, [isOwner, ownerProductsLoaded, artist.artistSlug, artist.id]);

  // Gallery interactions
  const { getStatsForImage, updateStats } = useGalleryInteractions(
    artist.id,
    galleryItems
  );

  const refreshUserData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user"] });
    router.refresh();
  }, [queryClient, router]);

  const handleFollowChange = useCallback(
    (isFollowing: boolean) => {
      setFollowersCount((prev) => (isFollowing ? prev + 1 : prev - 1));

      // Invalidate relevant queries to ensure fresh data on next load
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["artist-profile"] });

      // Also refresh the router cache
      router.refresh();
    },
    [queryClient, router]
  );

  // Sync local follower count with artist data
  useEffect(() => {
    setFollowersCount(artist.followersCount || 0);
  }, [artist.followersCount]);

  const toggleEditor = () => setShowEditor((prev) => !prev);

  const noProductsCopy =
    language === "en"
      ? "No active listings yet."
      : "ჯერ არ აქვს აქტიური გასაყიდი ნამუშევრები.";
  const galleryEmptyCopy =
    language === "en"
      ? "Gallery will appear here once the artist adds portfolio images."
      : "პორტფოლიოს სურათები გამოჩნდება, როცა არტისტი დაამატებს.";

  return (
    <div className="artist-profile">
      <BrushTrail containerRef={heroRef} />
      <section
        className="artist-hero"
        ref={heroRef}
        style={
          heroBackground
            ? { backgroundImage: `url(${heroBackground})` }
            : undefined
        }
      >
        <div className="artist-hero__overlay" />

        {/* Cover Edit Button - Facebook style - positioned top left */}
        {isOwner && (
          <>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="artist-hero__cover-edit-btn"
              onClick={triggerCoverUpload}
              disabled={isUploadingCover}
              title={
                language === "en"
                  ? "Change cover photo"
                  : "ქავერის ფოტოს შეცვლა"
              }
            >
              {isUploadingCover ? (
                <>
                  <span className="artist-hero__cover-spinner" />
                  <span>
                    {language === "en" ? "Uploading..." : "იტვირთება..."}
                  </span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>
                    {language === "en" ? "Edit Cover" : "ქავერის შეცვლა"}
                  </span>
                </>
              )}
            </button>
          </>
        )}

        <div className="artist-hero__content">
          {/* Top row: Avatar and main info */}
          <div className="artist-hero__main-row">
            <div className="artist-hero__avatar">
              {avatar ? (
                <CloudinaryImage
                  src={avatar}
                  alt={artist.storeName || artist.name}
                  width={150}
                  height={150}
                  className="artist-hero__avatar-img"
                />
              ) : (
                <div className="artist-hero__avatar-placeholder">
                  {(artist.storeName || artist.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              {/* Avatar Edit Button - Facebook style with direct upload */}
              {isOwner && (
                <>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className={`artist-hero__avatar-edit-btn ${
                      isUploadingAvatar
                        ? "artist-hero__avatar-edit-btn--loading"
                        : ""
                    }`}
                    onClick={triggerAvatarUpload}
                    disabled={isUploadingAvatar}
                    title={
                      language === "en"
                        ? "Change profile photo"
                        : "პროფილის ფოტოს შეცვლა"
                    }
                  >
                    {isUploadingAvatar ? (
                      <span className="artist-hero__avatar-spinner" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="artist-hero__info">
              <div className="artist-hero__title-row">
                <h1>{artist.storeName || artist.name}</h1>
                <div className="artist-hero__header-actions">
                  {isOwner && (
                    <div className="artist-hero__actions">
                      <Link
                        href="/admin/products/create"
                        className="artist-add-product-button"
                        title={
                          language === "en"
                            ? "Add New Product"
                            : "ნამუშევრის დამატება"
                        }
                      >
                        <Plus size={18} />
                        {language === "en"
                          ? "Add Product"
                          : "დაამატე ნამუშევარი"}
                      </Link>
                      <button
                        type="button"
                        className="artist-edit-button"
                        onClick={toggleEditor}
                      >
                        {language === "en"
                          ? showEditor
                            ? "Hide editing"
                            : "Edit artist page"
                          : showEditor
                          ? "დამალე რედაქტირება"
                          : "რედაქტირება"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Artist Rating */}
              <div className="artist-hero__rating-container">
                {artistRating && artistRating > 0 ? (
                  <div className="artist-hero__rating">
                    <div className="artist-hero__stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`artist-hero__star ${
                            star <= Math.round(artistRating || 0)
                              ? "artist-hero__star--filled"
                              : ""
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="artist-hero__rating-text">
                      {artistRating?.toFixed(1)} ({artistReviewsCount || 0}{" "}
                      {language === "en" ? "reviews" : "შეფასება"})
                    </span>
                  </div>
                ) : null}

                {/* Rate Artist Button - show if not own profile */}
                {(!user || userId !== artist.id) && (
                  <button
                    onClick={() => {
                      if (!user) {
                        // App uses a top-level /login route (Next "(auth)" is a route group),
                        // redirect to /login and preserve current path so user returns after signing in.
                        const redirect =
                          typeof window !== "undefined"
                            ? window.location.pathname + window.location.search
                            : "/";
                        router.push(
                          `/login?redirect=${encodeURIComponent(redirect)}`
                        );
                        return;
                      }
                      setReviewModalOpen(true);
                    }}
                    className="artist-hero__rate-button"
                  >
                    <Star size={16} />
                    {language === "en" ? "Rate Artist" : "შეაფასე მხატვარი"}
                  </button>
                )}
              </div>

              {/* Followers stats and Follow button */}
              <div className="artist-hero__stats">
                {isOwner ? (
                  <button
                    type="button"
                    className="artist-hero__stat-button"
                    onClick={() => setFollowersModalOpen(true)}
                  >
                    <span className="artist-hero__stat-number">
                      {followersCount}
                    </span>
                    <span className="artist-hero__stat-label">
                      {language === "en" ? "followers" : "გამომწერები"}
                    </span>
                  </button>
                ) : (
                  <div className="artist-hero__stat">
                    <span className="artist-hero__stat-number">
                      {followersCount}
                    </span>
                    <span className="artist-hero__stat-label">
                      {language === "en" ? "followers" : "გამომწერები"}
                    </span>
                  </div>
                )}
                {!isOwner && (
                  <FollowButton
                    targetUserId={artist.id}
                    targetUserName={artist.storeName || artist.name}
                    onFollowChange={handleFollowChange}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Biography spanning full width */}
          {biography && (
            <div className="artist-hero__bio-row">
              <p className="artist-hero__bio">{biography}</p>
            </div>
          )}
        </div>

        {/* Share button in bottom right corner */}
        <ShareButton
          url={
            artist.artistSlug
              ? `/@${artist.artistSlug}`
              : `/artists/${artist.id}`
          }
          title={artist.storeName || artist.name}
          description={biography || undefined}
          className="share-button--artist artist-hero__share"
        />
      </section>

      <div className="artist-profile__content">
        {isOwner && showEditor && user && (
          <section className="artist-settings-panel">
            <h2 className="artist-settings-panel__title">
              {language === "en" ? "Manage public profile" : "პროფილის მართვა"}
            </h2>
            <ArtistProfileSettings
              user={user as User}
              artistDefaults={artist}
              refreshUserData={refreshUserData}
              onClose={handleSettingsClose}
            />
          </section>
        )}
        {/* Instagram-style tabs */}
        <div className="artist-tabs">
          <div className="artist-tabs__nav">
            <button
              type="button"
              className={`artist-tabs__tab ${
                activeTab === "sale" ? "artist-tabs__tab--active" : ""
              }`}
              onClick={() => {
                setActiveTab("sale");
                window.history.replaceState(null, "", artistBaseUrl);
              }}
              title={getSaleCopy(language)}
            >
              <ShoppingBag className="artist-tabs__tab-icon" size={24} />
            </button>
            <button
              type="button"
              className={`artist-tabs__tab ${
                activeTab === "gallery" ? "artist-tabs__tab--active" : ""
              }`}
              onClick={() => {
                setActiveTab("gallery");
                window.history.replaceState(null, "", "#portfolio");
              }}
              title={getGalleryCopy(language)}
            >
              <Grid3X3 className="artist-tabs__tab-icon" size={24} />
            </button>
            <button
              type="button"
              className={`artist-tabs__tab ${
                activeTab === "info" ? "artist-tabs__tab--active" : ""
              }`}
              onClick={() => {
                setActiveTab("info");
                window.history.replaceState(null, "", "#info");
              }}
              title={`${getInfoCopy(language)} ${
                artistReviewsCount > 0
                  ? `(${artistReviewsCount} ${
                      language === "en" ? "reviews" : "შეფასება"
                    })`
                  : ""
              }`}
            >
              <Info className="artist-tabs__tab-icon" size={24} />
              {artistReviewsCount > 0 && (
                <span className="artist-tabs__badge">{artistReviewsCount}</span>
              )}
            </button>
          </div>

          <div className="artist-tabs__content">
            {activeTab === "sale" && (
              <section
                className={`artist-tab-panel ${
                  productItems.length > 0
                    ? "artist-tab-panel--products"
                    : "artist-tab-panel--empty"
                }`}
              >
                {productItems.length > 0 ? (
                  <>
                    <div className="artist-grid artist-grid--products">
                      {productItems.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          language={language}
                          isOwner={isOwner}
                          onDelete={handleProductDelete}
                        />
                      ))}
                    </div>
                    {hasMoreProducts && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: "2rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <button
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="artist-load-more-button"
                        >
                          {isLoadingMore
                            ? language === "en"
                              ? "Loading..."
                              : "იტვირთება..."
                            : language === "en"
                            ? "Load More"
                            : "მეტის ჩატვირთვა"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="artist-empty-state">
                    <div className="artist-empty-state__icon">🛒</div>
                    <p className="artist-empty-state__text">{noProductsCopy}</p>
                  </div>
                )}
              </section>
            )}

            {activeTab === "gallery" && (
              <section
                className={`artist-tab-panel ${
                  galleryPosts.length > 0
                    ? "artist-tab-panel--gallery"
                    : "artist-tab-panel--empty"
                }`}
                id="portfolio"
              >
                {isOwner && galleryPosts.length > 0 && (
                  <div
                    style={{
                      margin: "10px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(true)}
                      className="artist-add-product-button"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Upload size={18} />
                      {language === "en"
                        ? "Add Portfolio Image"
                        : "დაამატე პორტფოლიოში"}
                    </button>
                  </div>
                )}
                {galleryPosts.length > 0 ? (
                  <div className="artist-grid artist-grid--gallery">
                    {galleryPosts.map((post, index) => {
                      const coverImage = post.images[0];
                      if (!coverImage?.url) {
                        return null;
                      }

                      const stats = getStatsForImage(coverImage.url);
                      const isSellable =
                        Boolean(post.productId) &&
                        !post.hideBuyButton &&
                        !post.isSold;
                      const badgeText = post.isSold
                        ? language === "en"
                          ? "Sold out"
                          : "გაყიდულია"
                        : language === "en"
                        ? "Not for sale"
                        : "არ იყიდება";
                      const showBadge = !isSellable || !post.productId;
                      return (
                        <div
                          key={`${post.postId ?? coverImage.url}-${
                            coverImage.order ?? index
                          }`}
                          className="artist-gallery-card"
                          onClick={() => openViewer(index, 0)}
                          style={{ cursor: "pointer" }}
                        >
                          <CloudinaryImage
                            src={coverImage.url}
                            alt={`Gallery item by ${
                              artist.storeName || artist.name
                            }`}
                            width={600}
                            height={600}
                            className="artist-gallery-card__image"
                          />
                          <div className="artist-gallery-card__overlay">
                            {post.isFeatured && (
                              <span className="artist-gallery-card__featured-badge">
                                <Star size={16} fill="currentColor" />
                              </span>
                            )}
                            {showBadge && (
                              <span className="artist-gallery-card__badge">
                                {badgeText}
                              </span>
                            )}
                            <div
                              className="artist-gallery-card__interactions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isOwner && post.postId && (
                                <button
                                  type="button"
                                  className={`artist-gallery-card__action ${
                                    post.isFeatured
                                      ? "artist-gallery-card__action--featured"
                                      : ""
                                  }`}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const API_BASE =
                                        process.env.NEXT_PUBLIC_API_URL ||
                                        "http://localhost:4000/v1";
                                      const response = await fetch(
                                        `${API_BASE}/portfolio/${post.postId}/toggle-featured`,
                                        {
                                          method: "PUT",
                                          credentials: "include",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                        }
                                      );

                                      if (response.ok) {
                                        // Optimistically update UI by refreshing
                                        router.refresh();

                                        // Also show a quick toast feedback
                                        toast({
                                          title: post.isFeatured
                                            ? language === "en"
                                              ? "Removed from featured"
                                              : "წაიშალა რჩეულებიდან"
                                            : language === "en"
                                            ? "Marked as featured"
                                            : "მონიშნულია როგორც რჩეული",
                                        });
                                      } else {
                                        throw new Error(
                                          "Failed to toggle featured"
                                        );
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Failed to toggle featured:",
                                        error
                                      );
                                      toast({
                                        title:
                                          language === "en"
                                            ? "Error"
                                            : "შეცდომა",
                                        description:
                                          language === "en"
                                            ? "Failed to update featured status"
                                            : "რჩეული სტატუსის განახლება ვერ მოხერხდა",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  aria-label={
                                    post.isFeatured
                                      ? language === "en"
                                        ? "Remove from featured"
                                        : "წაშალე რჩეულებიდან"
                                      : language === "en"
                                      ? "Mark as featured"
                                      : "მონიშნე როგორც რჩეული"
                                  }
                                  title={
                                    post.isFeatured
                                      ? language === "en"
                                        ? "Remove from featured"
                                        : "წაშალე რჩეულებიდან"
                                      : language === "en"
                                      ? "Mark as featured"
                                      : "მონიშნე როგორც რჩეული"
                                  }
                                >
                                  <Star
                                    size={16}
                                    fill={
                                      post.isFeatured ? "currentColor" : "none"
                                    }
                                  />
                                </button>
                              )}
                              {isSellable && post.productId && (
                                <Link
                                  href={`/products/${post.productId}`}
                                  className="artist-gallery-card__action"
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={
                                    language === "en"
                                      ? "View listing"
                                      : "ნახე ლისტინგი"
                                  }
                                >
                                  <ShoppingBag size={16} />
                                </Link>
                              )}
                              <GalleryLikeButton
                                artistId={artist.id}
                                imageUrl={coverImage.url}
                                initialLikesCount={stats.likesCount}
                                initialIsLiked={stats.isLikedByUser}
                                onLikeToggle={(isLiked, likesCount) => {
                                  updateStats(coverImage.url, {
                                    isLikedByUser: isLiked,
                                    likesCount,
                                  });
                                }}
                              />
                              <GalleryComments
                                artistId={artist.id}
                                imageUrl={coverImage.url}
                                initialCommentsCount={stats.commentsCount}
                                onCommentsCountChange={(commentsCount) => {
                                  updateStats(coverImage.url, {
                                    commentsCount,
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="artist-empty-state">
                    <div className="artist-empty-state__icon">🖼️</div>
                    <p className="artist-empty-state__text">
                      {galleryEmptyCopy}
                    </p>
                  </div>
                )}
              </section>
            )}

            {activeTab === "info" && (
              <section className="artist-tab-panel artist-tab-panel--info">
                <div className="artist-info-grid">
                  {/* Creative Focus */}
                  {(artist.artistDisciplines?.length ?? 0) > 0 && (
                    <div className="artist-info-section">
                      <h3 className="artist-info-section__title">
                        {getDisciplinesCopy(language)}
                      </h3>
                      <div className="artist-info-tags">
                        {artist.artistDisciplines!.map((discipline) => (
                          <span key={discipline} className="artist-info-tag">
                            {discipline}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {artist.artistLocation && (
                    <div className="artist-info-section">
                      <h3 className="artist-info-section__title">
                        {language === "en" ? "Location" : "მდებარეობა"}
                      </h3>
                      <p className="artist-info-text">
                        {artist.artistLocation}
                      </p>
                    </div>
                  )}

                  {/* Commissions */}
                  <div className="artist-info-section">
                    <h3 className="artist-info-section__title">
                      {language === "en"
                        ? "Custom Orders"
                        : "ინდივიდუალური შეკვეთები"}
                    </h3>
                    <p className="artist-info-text">
                      {getCommissionsCopy(
                        language,
                        Boolean(artist.artistOpenForCommissions)
                      )}
                    </p>
                  </div>

                  {/* Social Links */}
                  {anySocial && (
                    <div className="artist-info-section">
                      <h3 className="artist-info-section__title">
                        {language === "en" ? "Connect" : "დაკავშირება"}
                      </h3>
                      <div className="artist-info-socials">
                        {socialOrder.map(({ key, label }) => {
                          const value = artist.artistSocials?.[key];
                          if (!value) return null;
                          const href = value.startsWith("http")
                            ? value
                            : `https://${value}`;
                          return (
                            <a
                              key={key}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="artist-info-social-link"
                            >
                              {label}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Artist Reviews Section */}
                <div className="artist-info-reviews">
                  <ArtistReviewsList
                    artistId={artist.id}
                    key={`reviews-${artistReviewsCount}`}
                  />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Viewer Modal */}
      <GalleryViewer
        posts={galleryPosts}
        currentPostIndex={viewerIndex}
        currentImageIndex={viewerImageIndex}
        artist={{
          id: artist.id,
          name: artist.name,
          storeName: artist.storeName || undefined,
          storeLogo: artist.storeLogo || undefined,
        }}
        isOpen={viewerOpen}
        onClose={closeViewer}
        onPostIndexChange={(postIndex, imageIndex = 0) => {
          setViewerIndex(postIndex);
          setViewerImageIndex(imageIndex);
          // Sync URL when post changes
          const newPostId = galleryPosts[postIndex]?.postId;
          if (newPostId) {
            handleCurrentPostChange(newPostId);
          }
        }}
        onImageIndexChange={setViewerImageIndex}
        getStatsForImage={getStatsForImage}
        updateStats={updateStats}
        artistBaseUrl={artistBaseUrl}
        onPostDelete={async (postId) => {
          const API_BASE =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
          const response = await fetch(`${API_BASE}/portfolio/${postId}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache",
            },
          });
          if (!response.ok) {
            const error = await response.text();
            throw new Error(error || "Failed to delete post");
          }

          // Close the viewer and clear URL
          setViewerOpen(false);
          pushedPostUrlRef.current = false;
          lastSyncedPostIdRef.current = null;
          window.history.replaceState({}, "", artistBaseUrl);

          // Use Next.js router refresh to invalidate server cache and refetch
          router.refresh();
        }}
        onPostEdit={async (postId, newCaption) => {
          const API_BASE =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
          const response = await fetch(`${API_BASE}/portfolio/${postId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            credentials: "include",
            body: JSON.stringify({ caption: newCaption }),
          });
          if (!response.ok) {
            const error = await response.text();
            throw new Error(error || "Failed to update post");
          }

          // Use Next.js router refresh to invalidate server cache and refetch
          router.refresh();
        }}
      />

      {/* Followers Modal */}
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        artistId={artist.id}
        artistName={artist.name}
      />

      {/* Artist Review Modal */}
      <ArtistReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        artistId={artist.id}
        artistName={artist.storeName || artist.name}
        onSuccess={async () => {
          // Fetch updated rating without full page refresh
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/artists/${artist.id}/reviews`
            );
            if (response.ok) {
              const data = await response.json();
              setArtistRating(data.artistDirectRating || 0);
              setArtistReviewsCount(data.artistDirectReviewsCount || 0);
            }
          } catch (error) {
            console.error("Failed to fetch updated rating:", error);
          }
        }}
      />

      {/* Portfolio Upload Modal */}
      {uploadModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setUploadModalOpen(false);
            setSelectedImage(null);
            setImagePreview(null);
            setCaption("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {language === "en"
                  ? "Add Portfolio Image"
                  : "დაამატე პორტფოლიოში"}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setUploadModalOpen(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                  setCaption("");
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="upload-form">
                {/* Image Upload Area */}
                <div className="upload-area">
                  <input
                    type="file"
                    id="portfolio-image"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedImage(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        className="image-preview"
                        width={600}
                        height={600}
                        unoptimized
                      />
                      <button
                        type="button"
                        className="change-image-button"
                        onClick={() =>
                          document.getElementById("portfolio-image")?.click()
                        }
                      >
                        {language === "en" ? "Change Image" : "შეცვალე სურათი"}
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="portfolio-image" className="upload-label">
                      <Upload size={48} />
                      <span className="upload-text">
                        {language === "en"
                          ? "Click to upload image"
                          : "დააჭირე სურათის ასატვირთად"}
                      </span>
                      <span className="upload-hint">
                        {language === "en"
                          ? "PNG, JPG, WEBP up to 10MB"
                          : "PNG, JPG, WEBP მაქს. 10MB"}
                      </span>
                    </label>
                  )}
                </div>

                {/* Description Field */}
                <div className="form-group">
                  <label htmlFor="portfolio-caption" className="form-label">
                    {language === "en"
                      ? "Description (Optional)"
                      : "აღწერა (არასავალდებულო)"}
                  </label>
                  <textarea
                    id="portfolio-caption"
                    className="form-textarea"
                    rows={4}
                    maxLength={4000}
                    placeholder={
                      language === "en"
                        ? "Add a description for your image..."
                        : "დაამატე აღწერა შენს სურათს..."
                    }
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                  <div className="character-count">{caption.length} / 4000</div>
                </div>

                {/* Action Buttons */}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="artist-edit-button"
                    onClick={() => {
                      setUploadModalOpen(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                      setCaption("");
                    }}
                  >
                    {language === "en" ? "Cancel" : "გაუქმება"}
                  </button>
                  <button
                    type="button"
                    className="artist-add-product-button"
                    disabled={!selectedImage || uploadingImage}
                    onClick={async () => {
                      if (!selectedImage) return;

                      setUploadingImage(true);
                      try {
                        const API_BASE =
                          process.env.NEXT_PUBLIC_API_URL ||
                          "http://localhost:4000/v1";

                        // Upload image to Cloudinary via artists gallery endpoint
                        const formData = new FormData();
                        formData.append("file", selectedImage);

                        const uploadResponse = await fetch(
                          `${API_BASE}/artists/gallery`,
                          {
                            method: "POST",
                            credentials: "include",
                            body: formData,
                          }
                        );

                        if (!uploadResponse.ok) {
                          throw new Error("Failed to upload image");
                        }

                        const uploadData = await uploadResponse.json();
                        const gallery = uploadData?.gallery || [];

                        if (gallery.length === 0) {
                          throw new Error("No image URL returned");
                        }

                        // Get the last uploaded image URL
                        const imageUrl = gallery[gallery.length - 1];

                        // Create portfolio post
                        const createResponse = await fetch(
                          `${API_BASE}/portfolio`,
                          {
                            method: "POST",
                            credentials: "include",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              images: [imageUrl],
                              caption: caption.trim() || null,
                              tags: [],
                            }),
                          }
                        );

                        if (!createResponse.ok) {
                          throw new Error("Failed to create portfolio post");
                        }

                        toast({
                          title:
                            language === "en" ? "Success!" : "წარმატებული!",
                          description:
                            language === "en"
                              ? "Portfolio image added successfully"
                              : "პორტფოლიოს სურათი დაემატა",
                        });

                        // Reset form and close modal
                        setUploadModalOpen(false);
                        setSelectedImage(null);
                        setImagePreview(null);
                        setCaption("");

                        // Refresh the page to show new image
                        router.refresh();
                      } catch (error) {
                        console.error("Upload error:", error);
                        toast({
                          title: language === "en" ? "Error" : "შეცდომა",
                          description:
                            language === "en"
                              ? "Failed to upload image"
                              : "სურათის ატვირთვა ვერ მოხერხდა",
                          variant: "destructive",
                        });
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  >
                    {uploadingImage ? (
                      <>
                        <svg
                          className="spinner-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ animation: "spin 1s linear infinite" }}
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        {language === "en" ? "Uploading..." : "იტვირთება..."}
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        {language === "en" ? "Upload" : "ატვირთვა"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: ArtistProductSummary;
  language: "en" | "ge";
  isOwner?: boolean;
  onDelete?: (productId: string) => void;
}

function ProductCard({
  product,
  language,
  isOwner,
  onDelete,
}: ProductCardProps) {
  const { addToCart, isItemInCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [isBuying, setIsBuying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const image = product.images?.[0];
  const href = `/products/${product.id}`;

  const discountPercentage = getActiveDiscountPercentage(product);
  const countInStock = product.countInStock || 1;

  const deliveryText = () => {
    console.log("Delivery data:", {
      min: product.minDeliveryDays,
      max: product.maxDeliveryDays,
    });
    if (!product.minDeliveryDays && !product.maxDeliveryDays) {
      return language === "en"
        ? "Delivery time: 3-5 days"
        : "მიტანის ვადა: 3-5 დღე";
    }
    const min = product.minDeliveryDays;
    const max = product.maxDeliveryDays;
    if (min === max) {
      return language === "en" ? `${min} days delivery` : `${min} დღე მიტანა`;
    }
    return language === "en"
      ? `${min}-${max} days delivery`
      : `${min}-${max} დღე მიტანა`;
  };

  console.log("Delivery text:", deliveryText());

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await apiClient.delete(`/products/${product.id}`);
      toast({
        title: language === "en" ? "Product deleted" : "პროდუქტი წაიშალა",
        description:
          language === "en"
            ? "The product has been successfully deleted"
            : "პროდუქტი წარმატებით წაიშალა",
      });
      onDelete?.(product.id);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: language === "en" ? "Delete failed" : "წაშლა ვერ მოხერხდა",
        description:
          language === "en"
            ? "Failed to delete the product"
            : "პროდუქტის წაშლა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (countInStock <= 0) {
      toast({
        title: language === "en" ? "Out of Stock" : "არ არის მარაგში",
        description:
          language === "en"
            ? "This product is currently out of stock"
            : "პროდუქტი ამჟამად არ არის მარაგში",
        variant: "destructive",
      });
      return;
    }

    setIsBuying(true);

    try {
      // Check if item is already in cart
      const isInCart = isItemInCart(product.id);

      if (!isInCart) {
        // Calculate discounted price if applicable
        const isDiscounted = discountPercentage > 0;
        const discountedPrice = isDiscounted
          ? product.price * (1 - discountPercentage / 100)
          : product.price;

        // Add item to cart with discounted price if applicable
        await addToCart(
          product.id,
          1,
          undefined,
          undefined,
          undefined,
          isDiscounted ? discountedPrice : product.price
        );
      }

      // Redirect to checkout (whether item was already in cart or just added)
      setTimeout(() => {
        router.push("/checkout/streamlined");
      }, 300);
    } catch (error) {
      console.error("Buy now error:", error);
      setIsBuying(false);
      // Error toast is already shown by addToCart if there's an issue
      // Only show additional error if user is not being redirected to login
      if (
        error instanceof Error &&
        error.message !== "User not authenticated"
      ) {
        toast({
          title: language === "en" ? "Error" : "შეცდომა",
          description:
            language === "en"
              ? "Failed to proceed to checkout"
              : "გადახდის გვერდზე გადასვლა ვერ მოხერხდა",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <article
      className={`artist-product-card ${
        product.status === "PENDING" ? "artist-product-card--pending" : ""
      } ${
        product.status === "REJECTED" ? "artist-product-card--rejected" : ""
      }`}
    >
      {/* Status badges for owner */}
      {isOwner && product.status && product.status !== "APPROVED" && (
        <div
          className={`artist-product-card__status-badge artist-product-card__status-badge--${product.status.toLowerCase()}`}
        >
          {product.status === "PENDING" && (
            <>
              <Clock size={14} />
              <span>{language === "en" ? "Pending" : "მოლოდინში"}</span>
            </>
          )}
          {product.status === "REJECTED" && (
            <>
              <XCircle size={14} />
              <span>{language === "en" ? "Rejected" : "უარყოფილი"}</span>
            </>
          )}
        </div>
      )}

      {/* Rejection reason tooltip */}
      {isOwner && product.status === "REJECTED" && product.rejectionReason && (
        <div className="artist-product-card__rejection-reason">
          <AlertTriangle size={14} />
          <span>
            {language === "en" ? "Reason:" : "მიზეზი:"}{" "}
            {product.rejectionReason}
          </span>
        </div>
      )}

      {/* Owner action buttons */}
      {isOwner && (
        <div className="artist-product-card__owner-actions">
          <Link
            href={{
              pathname: `/admin/products/edit`,
              query: { id: product.id, refresh: Date.now() },
            }}
            className="artist-product-card__edit-btn"
            onClick={(e) => e.stopPropagation()}
            title={language === "en" ? "Edit product" : "რედაქტირება"}
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            className="artist-product-card__delete-btn"
            onClick={handleDeleteClick}
            title={language === "en" ? "Delete product" : "პროდუქტის წაშლა"}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div
          className="artist-product-card__delete-confirm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="artist-product-card__delete-confirm-content">
            <AlertTriangle
              size={24}
              className="artist-product-card__delete-confirm-icon"
            />
            <p className="artist-product-card__delete-confirm-text">
              {language === "en"
                ? "Are you sure you want to delete this product?"
                : "დარწმუნებული ხარ, რომ გსურს ამ პროდუქტის წაშლა?"}
            </p>
            <div className="artist-product-card__delete-confirm-actions">
              <button
                type="button"
                className="artist-product-card__delete-confirm-cancel"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                {language === "en" ? "Cancel" : "გაუქმება"}
              </button>
              <button
                type="button"
                className="artist-product-card__delete-confirm-yes"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? language === "en"
                    ? "Deleting..."
                    : "იშლება..."
                  : language === "en"
                  ? "Yes, Delete"
                  : "დიახ, წაშალე"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href={href} className="artist-product-card__link">
        <div className="artist-product-card__image-wrapper">
          {image ? (
            <CloudinaryImage
              src={image}
              alt={product.name}
              width={400}
              height={400}
              className="artist-product-card__image"
            />
          ) : (
            <div className="artist-product-card__image-placeholder">
              {product.name.charAt(0)}
            </div>
          )}
          {/* Discount badge */}
          {discountPercentage > 0 && (
            <div className="artist-product-card__discount-badge">
              -{discountPercentage}%
            </div>
          )}
          {/* Price - always visible */}
          <div className="artist-product-card__price-overlay">
            {discountPercentage > 0 ? (
              <>
                <span className="artist-product-card__original-price">
                  {formatPrice(product.price, language)}
                </span>
                <span className="artist-product-card__discounted-price">
                  {formatPrice(
                    product.price * (1 - discountPercentage / 100),
                    language
                  )}
                </span>
              </>
            ) : (
              <span className="artist-product-card__price">
                {formatPrice(product.price, language)}
              </span>
            )}
          </div>
          {/* Hover overlay with description and actions */}
          <div className="artist-product-card__overlay">
            {product.description && (
              <div className="artist-product-card__description">
                {product.description}
              </div>
            )}
            {deliveryText() && (
              <div className="artist-product-card__delivery">
                {deliveryText()}
              </div>
            )}
            <div className="artist-product-card__overlay-actions">
              <button
                type="button"
                className="artist-product-card__buy-now-overlay"
                onClick={handleBuyNow}
                disabled={isBuying || countInStock <= 0}
                title={
                  language === "en"
                    ? "Buy now - Direct to checkout"
                    : "იყიდე ახლავე - პირდაპირ გადახდაზე"
                }
              >
                {isBuying ? (
                  <>
                    <svg
                      className="spinner-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>
                      {language === "en" ? "Processing..." : "დამუშავება..."}
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                    <span>
                      {language === "en" ? "Buy Now" : "იყიდე ახლავე"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="artist-product-card__info">
          <div className="artist-product-card__title-row">
            <h3 className="artist-product-card__title">{product.name}</h3>
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              countInStock={countInStock}
              className="btn-add-to-cart-icon"
              price={
                discountPercentage > 0
                  ? product.price * (1 - discountPercentage / 100)
                  : product.price
              }
              hideQuantity={true}
              openCartOnAdd={false}
              iconOnly={true}
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
