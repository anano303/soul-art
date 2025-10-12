"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArtistProfileResponse, ArtistProductSummary, User } from "@/types";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { ArtistProfileSettings } from "@/modules/profile/components/ArtistProfileSettings";
import "./artist-profile-view.css";

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

function getHighlightsCopy(language: "en" | "ge") {
  return language === "en" ? "Highlights" : "მთავარი ხაზები";
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

  const isMapLike = typeof (bio as any)?.get === "function";

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

  const anySocial = socialOrder.some(({ key }) => artist.artistSocials?.[key]);
  const isOwner = user?._id === artist.id;

  const refreshUserData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user"] });
    router.refresh();
  }, [queryClient, router]);

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
      <section
        className="artist-hero"
        style={
          heroBackground
            ? { backgroundImage: `url(${heroBackground})` }
            : undefined
        }
      >
        <div className="artist-hero__overlay" />
        <div className="artist-hero__content">
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
            <h1>{artist.storeName || artist.name}</h1>
            {artist.artistLocation && (
              <p className="artist-hero__location">{artist.artistLocation}</p>
            )}
            {isOwner && (
              <div className="artist-hero__actions">
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
            <p className="artist-hero__commissions">
              {getCommissionsCopy(
                language,
                Boolean(artist.artistOpenForCommissions)
              )}
            </p>
            {biography && <p className="artist-hero__bio">{biography}</p>}
            {anySocial && (
              <div className="artist-socials">
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
                      className="artist-socials__link"
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
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
        {(artist.artistHighlights?.length ?? 0) > 0 && (
          <section className="artist-section">
            <h2>{getHighlightsCopy(language)}</h2>
            <div className="artist-chips">
              {artist.artistHighlights!.map((highlight) => (
                <span key={highlight} className="artist-chip">
                  {highlight}
                </span>
              ))}
            </div>
          </section>
        )}

        {(artist.artistDisciplines?.length ?? 0) > 0 && (
          <section className="artist-section">
            <h2>{getDisciplinesCopy(language)}</h2>
            <div className="artist-chips">
              {artist.artistDisciplines!.map((discipline) => (
                <span
                  key={discipline}
                  className="artist-chip artist-chip--outline"
                >
                  {discipline}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="artist-section">
          <div className="artist-section__header">
            <h2>{getSaleCopy(language)}</h2>
            {products?.total ? (
              <span className="artist-section__counter">{products.total}</span>
            ) : null}
          </div>
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
            <p className="artist-empty">{noProductsCopy}</p>
          )}
        </section>

        <section className="artist-section">
          <h2>{getGalleryCopy(language)}</h2>
          {galleryItems.length > 0 ? (
            <div className="artist-grid artist-grid--gallery">
              {galleryItems.map((url) => (
                <div key={url} className="artist-gallery-card">
                  <CloudinaryImage
                    src={url}
                    alt={`Gallery item by ${artist.storeName || artist.name}`}
                    width={600}
                    height={600}
                    className="artist-gallery-card__image"
                  />
                  <span className="artist-gallery-card__badge">
                    {language === "en" ? "Not for sale" : "არ იყიდება"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="artist-empty">{galleryEmptyCopy}</p>
          )}
        </section>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: ArtistProductSummary;
  language: "en" | "ge";
}

function ProductCard({ product, language }: ProductCardProps) {
  const image = product.images?.[0];
  const href = `/products/${product.id}`;

  return (
    <article className="artist-product-card">
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
      </div>
      <div className="artist-product-card__body">
        <h3>{product.name}</h3>
        <p className="artist-product-card__price">
          {formatPrice(product.price, language)}
        </p>
        <Link href={href} className="artist-product-card__link">
          {language === "en" ? "View piece" : "ნახვა"}
        </Link>
      </div>
    </article>
  );
}
