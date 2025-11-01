"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArtistProfileResponse, ArtistProductSummary, User } from "@/types";
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
import { Grid3X3, ShoppingBag, Info } from "lucide-react";
import BrushTrail from "@/components/BrushTrail/BrushTrail";
import { FollowButton } from "@/components/follow-button/follow-button";
import { FollowersModal } from "@/components/followers-modal/followers-modal";
import "./artist-profile-view.css";
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
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { artist, products } = data;
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<"sale" | "gallery" | "info">(
    "sale"
  );
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(
    artist.followersCount || 0
  );
  const heroRef = useRef<HTMLElement>(null);

  const handleSettingsClose = useCallback(() => {
    setShowEditor(false);
  }, []);

  const biography = useMemo(() => {
    return resolveBiography(artist.artistBio, language);
  }, [artist.artistBio, language]);

  const heroBackground = artist.artistCoverImage || undefined;
  const avatar = artist.storeLogo || undefined;

  const productItems = products?.items ?? [];
  const galleryItems = artist.artistGallery ?? [];

  // Debug logging
  console.log("Gallery viewer state:", {
    viewerOpen,
    viewerIndex,
    galleryItemsCount: galleryItems.length,
  });

  const anySocial = socialOrder.some(({ key }) => artist.artistSocials?.[key]);
  const isOwner = user?._id === artist.id;

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
            </div>
            <div className="artist-hero__info">
              <div className="artist-hero__title-row">
                <h1>{artist.storeName || artist.name}</h1>
                {isOwner && (
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
              onClick={() => setActiveTab("sale")}
              title={getSaleCopy(language)}
            >
              <ShoppingBag className="artist-tabs__tab-icon" size={24} />
            </button>
            <button
              type="button"
              className={`artist-tabs__tab ${
                activeTab === "gallery" ? "artist-tabs__tab--active" : ""
              }`}
              onClick={() => setActiveTab("gallery")}
              title={getGalleryCopy(language)}
            >
              <Grid3X3 className="artist-tabs__tab-icon" size={24} />
            </button>
            <button
              type="button"
              className={`artist-tabs__tab ${
                activeTab === "info" ? "artist-tabs__tab--active" : ""
              }`}
              onClick={() => setActiveTab("info")}
              title={getInfoCopy(language)}
            >
              <Info className="artist-tabs__tab-icon" size={24} />
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
                  <div className="artist-grid artist-grid--products">
                    {productItems.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        language={language}
                      />
                    ))}
                  </div>
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
                  galleryItems.length > 0
                    ? "artist-tab-panel--gallery"
                    : "artist-tab-panel--empty"
                }`}
              >
                {galleryItems.length > 0 ? (
                  <div className="artist-grid artist-grid--gallery">
                    {galleryItems.map((url, index) => {
                      const stats = getStatsForImage(url);
                      return (
                        <div
                          key={url}
                          className="artist-gallery-card"
                          onClick={() => {
                            console.log("Gallery image clicked, index:", index);
                            setViewerIndex(index);
                            setViewerOpen(true);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <CloudinaryImage
                            src={url}
                            alt={`Gallery item by ${
                              artist.storeName || artist.name
                            }`}
                            width={600}
                            height={600}
                            className="artist-gallery-card__image"
                          />
                          <div className="artist-gallery-card__overlay">
                            <span className="artist-gallery-card__badge">
                              {language === "en"
                                ? "Not for sale"
                                : "არ იყიდება"}
                            </span>
                            <div
                              className="artist-gallery-card__interactions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GalleryLikeButton
                                artistId={artist.id}
                                imageUrl={url}
                                initialLikesCount={stats.likesCount}
                                initialIsLiked={stats.isLikedByUser}
                                onLikeToggle={(isLiked, likesCount) => {
                                  updateStats(url, {
                                    isLikedByUser: isLiked,
                                    likesCount,
                                  });
                                }}
                              />
                              <GalleryComments
                                artistId={artist.id}
                                imageUrl={url}
                                initialCommentsCount={stats.commentsCount}
                                onCommentsCountChange={(commentsCount) => {
                                  updateStats(url, { commentsCount });
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
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Viewer Modal */}
      <GalleryViewer
        images={galleryItems}
        currentIndex={viewerIndex}
        artist={{
          id: artist.id,
          name: artist.name,
          storeName: artist.storeName || undefined,
          storeLogo: artist.storeLogo || undefined,
        }}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
        getStatsForImage={getStatsForImage}
        updateStats={updateStats}
      />

      {/* Followers Modal */}
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        artistId={artist.id}
        artistName={artist.storeName || artist.name}
      />
    </div>
  );
}

interface ProductCardProps {
  product: ArtistProductSummary;
  language: "en" | "ge";
}

function ProductCard({ product, language }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [isBuying, setIsBuying] = useState(false);
  const image = product.images?.[0];
  const href = `/products/${product.id}`;

  // Assume no discount for now, since ArtistProductSummary doesn't have it
  const discountPercentage = product.discountPercentage || 0;
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

      // Small delay to ensure cart updates, then redirect
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
    <article className="artist-product-card">
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
          {/* Discount badge - always visible if discounted */}
          {discountPercentage > 0 && (
            <div className="artist-product-card__discount-badge">
              -{discountPercentage}%
            </div>
          )}
          <div className="artist-product-card__overlay">
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
