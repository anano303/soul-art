"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Product } from "@/types";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./tiktokPostModal.css";

interface TikTokCreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

interface TikTokPostModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only Me",
};

export function TikTokPostModal({
  product,
  isOpen,
  onClose,
}: TikTokPostModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // UX State - NO defaults (TikTok requires manual selection)
  const [privacyLevel, setPrivacyLevel] = useState<string>("");
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);

  // Commercial content disclosure
  const [commercialContentEnabled, setCommercialContentEnabled] =
    useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);

  // Content preview
  const [editableTitle, setEditableTitle] = useState("");

  // Music usage consent
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch creator info when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchCreatorInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth("/products/tiktok/creator-info");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to get TikTok account info");
        }
        const data: TikTokCreatorInfo = await res.json();
        setCreatorInfo(data);

        // Set initial title from product name
        setEditableTitle(product.name || product.nameEn || "");

        // Reset selections on open
        setPrivacyLevel("");
        setAllowComment(false);
        setAllowDuet(false);
        setAllowStitch(false);
        setCommercialContentEnabled(false);
        setYourBrand(false);
        setBrandedContent(false);
        setConsentGiven(false);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load creator info"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorInfo();
  }, [isOpen, product.name, product.nameEn]);

  // Validation
  const isPhotoPost = !!(product.images && product.images.length > 0);

  // Branded content can't be private
  const brandedContentBlocksPrivate = brandedContent && privacyLevel === "SELF_ONLY";

  // If commercial toggle is on, at least one option must be selected
  const commercialValid =
    !commercialContentEnabled || yourBrand || brandedContent;

  const canPost =
    privacyLevel !== "" &&
    consentGiven &&
    commercialValid &&
    !brandedContentBlocksPrivate;

  // Creator can't post check
  const creatorCanPost = creatorInfo?.privacy_level_options && creatorInfo.privacy_level_options.length > 0;

  const handlePost = async () => {
    if (!canPost || !creatorCanPost) return;

    setPosting(true);
    try {
      const options = {
        privacy_level: privacyLevel,
        disable_comment: !allowComment,
        disable_duet: !allowDuet,
        disable_stitch: !allowStitch,
        brand_content_toggle: commercialContentEnabled && (yourBrand || brandedContent),
        brand_organic_toggle: yourBrand,
        is_branded_content: brandedContent,
        title: editableTitle,
      };

      const res = await fetchWithAuth(
        `/products/${product._id}/post-to-tiktok`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ options }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || "Failed to post to TikTok"
        );
      }

      toast({
        title: "Posted to TikTok! 🎵",
        description:
          "Your content has been submitted. It may take a few minutes to process and appear on your profile.",
      });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to post to TikTok";
      toast({
        variant: "destructive",
        title: "TikTok post failed",
        description: message,
      });
    } finally {
      setPosting(false);
    }
  };

  // Get consent text based on commercial content selections
  const getConsentText = () => {
    if (commercialContentEnabled && brandedContent) {
      return (
        <>
          By posting, you agree to TikTok&apos;s{" "}
          <a
            href="https://www.tiktok.com/legal/page/global/bc-policy/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            Branded Content Policy
          </a>{" "}
          and{" "}
          <a
            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            Music Usage Confirmation
          </a>
        </>
      );
    }
    return (
      <>
        By posting, you agree to TikTok&apos;s{" "}
        <a
          href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
          target="_blank"
          rel="noopener noreferrer"
        >
          Music Usage Confirmation
        </a>
      </>
    );
  };

  // Commercial content label text
  const getCommercialLabel = () => {
    if (yourBrand && brandedContent) {
      return 'Your photo/video will be labeled as "Paid partnership"';
    }
    if (brandedContent) {
      return 'Your photo/video will be labeled as "Paid partnership"';
    }
    if (yourBrand) {
      return 'Your photo/video will be labeled as "Promotional content"';
    }
    return null;
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="tiktok-modal-overlay" onClick={onClose}>
      <div className="tiktok-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tiktok-modal__header">
          <div className="tiktok-modal__header-left">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
            </svg>
            <h3>Post to TikTok</h3>
          </div>
          <button className="tiktok-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="tiktok-modal__body">
          {loading ? (
            <div className="tiktok-modal__loading">
              <Loader2 className="spin" size={32} />
              <p>Loading TikTok account info...</p>
            </div>
          ) : error ? (
            <div className="tiktok-modal__error">
              <AlertCircle size={32} />
              <p>{error}</p>
              <button onClick={onClose}>Close</button>
            </div>
          ) : !creatorCanPost ? (
            <div className="tiktok-modal__error">
              <AlertCircle size={32} />
              <p>This account cannot make more posts at this moment. Please try again later.</p>
              <button onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              {/* Creator Info Display */}
              <div className="tiktok-modal__creator">
                {creatorInfo?.creator_avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creatorInfo.creator_avatar_url}
                    alt={creatorInfo.creator_nickname}
                    className="tiktok-modal__avatar"
                  />
                )}
                <div>
                  <p className="tiktok-modal__nickname">
                    {creatorInfo?.creator_nickname}
                  </p>
                  <p className="tiktok-modal__username">
                    @{creatorInfo?.creator_username}
                  </p>
                </div>
              </div>

              {/* Content Preview */}
              <div className="tiktok-modal__section">
                <label className="tiktok-modal__label">Content Preview</label>
                <div className="tiktok-modal__preview">
                  <div className="tiktok-modal__preview-images">
                    {product.images?.slice(0, 5).map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img}
                        alt={`Preview ${i + 1}`}
                        className="tiktok-modal__preview-img"
                      />
                    ))}
                    {(product.images?.length || 0) > 5 && (
                      <div className="tiktok-modal__preview-more">
                        +{(product.images?.length || 0) - 5}
                      </div>
                    )}
                  </div>
                  <p className="tiktok-modal__preview-type">
                    {isPhotoPost
                      ? `📸 ${product.images?.length || 0} photo(s)`
                      : "🎥 Video"}
                  </p>
                </div>
              </div>

              {/* Editable Title */}
              <div className="tiktok-modal__section">
                <label className="tiktok-modal__label" htmlFor="tiktok-title">
                  Title
                </label>
                <input
                  id="tiktok-title"
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  maxLength={90}
                  className="tiktok-modal__input"
                  placeholder="Enter title for your post..."
                />
                <span className="tiktok-modal__char-count">
                  {editableTitle.length}/90
                </span>
              </div>

              {/* Privacy Level - REQUIRED, no default */}
              <div className="tiktok-modal__section">
                <label className="tiktok-modal__label">
                  Who can view this post{" "}
                  <span className="tiktok-modal__required">*</span>
                </label>
                <select
                  value={privacyLevel}
                  onChange={(e) => setPrivacyLevel(e.target.value)}
                  className={`tiktok-modal__select ${
                    privacyLevel === "" ? "tiktok-modal__select--placeholder" : ""
                  }`}
                >
                  <option value="" disabled>
                    Select privacy level...
                  </option>
                  {creatorInfo?.privacy_level_options?.map((opt) => (
                    <option
                      key={opt}
                      value={opt}
                      disabled={
                        opt === "SELF_ONLY" && brandedContent
                      }
                    >
                      {PRIVACY_LABELS[opt] || opt}
                      {opt === "SELF_ONLY" && brandedContent
                        ? " (unavailable for branded content)"
                        : ""}
                    </option>
                  ))}
                </select>
                {brandedContentBlocksPrivate && (
                  <p className="tiktok-modal__hint tiktok-modal__hint--error">
                    Branded content visibility cannot be set to private.
                  </p>
                )}
              </div>

              {/* Interaction Settings - no defaults checked */}
              <div className="tiktok-modal__section">
                <label className="tiktok-modal__label">
                  Interaction Settings
                </label>
                <div className="tiktok-modal__checkboxes">
                  <label
                    className={`tiktok-modal__checkbox ${
                      creatorInfo?.comment_disabled
                        ? "tiktok-modal__checkbox--disabled"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={allowComment}
                      onChange={(e) => setAllowComment(e.target.checked)}
                      disabled={creatorInfo?.comment_disabled}
                    />
                    <span>Allow Comment</span>
                    {creatorInfo?.comment_disabled && (
                      <span className="tiktok-modal__disabled-note">
                        (disabled in account settings)
                      </span>
                    )}
                  </label>

                  {/* Duet and Stitch only for video posts */}
                  {!isPhotoPost && (
                    <>
                      <label
                        className={`tiktok-modal__checkbox ${
                          creatorInfo?.duet_disabled
                            ? "tiktok-modal__checkbox--disabled"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowDuet}
                          onChange={(e) => setAllowDuet(e.target.checked)}
                          disabled={creatorInfo?.duet_disabled}
                        />
                        <span>Allow Duet</span>
                        {creatorInfo?.duet_disabled && (
                          <span className="tiktok-modal__disabled-note">
                            (disabled in account settings)
                          </span>
                        )}
                      </label>
                      <label
                        className={`tiktok-modal__checkbox ${
                          creatorInfo?.stitch_disabled
                            ? "tiktok-modal__checkbox--disabled"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowStitch}
                          onChange={(e) => setAllowStitch(e.target.checked)}
                          disabled={creatorInfo?.stitch_disabled}
                        />
                        <span>Allow Stitch</span>
                        {creatorInfo?.stitch_disabled && (
                          <span className="tiktok-modal__disabled-note">
                            (disabled in account settings)
                          </span>
                        )}
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Commercial Content Disclosure */}
              <div className="tiktok-modal__section">
                <label className="tiktok-modal__label">
                  Content Disclosure
                </label>
                <p className="tiktok-modal__hint">
                  Indicate whether this content promotes yourself, a brand,
                  product or service.
                </p>
                <label className="tiktok-modal__toggle">
                  <input
                    type="checkbox"
                    checked={commercialContentEnabled}
                    onChange={(e) => {
                      setCommercialContentEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setYourBrand(false);
                        setBrandedContent(false);
                      }
                    }}
                  />
                  <span className="tiktok-modal__toggle-slider" />
                  <span>This content promotes a brand, product, or service</span>
                </label>

                {commercialContentEnabled && (
                  <div className="tiktok-modal__commercial-options">
                    <label className="tiktok-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={yourBrand}
                        onChange={(e) => setYourBrand(e.target.checked)}
                      />
                      <span>
                        Your brand — You are promoting yourself or your own
                        business
                      </span>
                    </label>
                    <label
                      className={`tiktok-modal__checkbox ${
                        privacyLevel === "SELF_ONLY"
                          ? "tiktok-modal__checkbox--disabled"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={brandedContent}
                        onChange={(e) => {
                          setBrandedContent(e.target.checked);
                          // If branded content and privacy is SELF_ONLY, reset privacy
                          if (
                            e.target.checked &&
                            privacyLevel === "SELF_ONLY"
                          ) {
                            setPrivacyLevel("");
                          }
                        }}
                        disabled={privacyLevel === "SELF_ONLY"}
                      />
                      <span>
                        Branded content — You are promoting another brand or a
                        third party
                      </span>
                      {privacyLevel === "SELF_ONLY" && (
                        <span className="tiktok-modal__disabled-note">
                          (visibility for branded content can&apos;t be private)
                        </span>
                      )}
                    </label>

                    {!commercialValid && (
                      <p className="tiktok-modal__hint tiktok-modal__hint--error">
                        You need to indicate if your content promotes yourself, a
                        third party, or both.
                      </p>
                    )}

                    {getCommercialLabel() && (
                      <p className="tiktok-modal__commercial-label">
                        ℹ️ {getCommercialLabel()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Processing Notice */}
              <div className="tiktok-modal__notice">
                <AlertCircle size={16} />
                <span>
                  After publishing, it may take a few minutes for the content to
                  process and be visible on your profile.
                </span>
              </div>

              {/* Consent Checkbox */}
              <div className="tiktok-modal__consent">
                <label className="tiktok-modal__checkbox">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                  />
                  <span>{getConsentText()}</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && creatorCanPost && (
          <div className="tiktok-modal__footer">
            <button className="tiktok-modal__cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="tiktok-modal__post"
              onClick={handlePost}
              disabled={!canPost || posting}
              title={
                !canPost
                  ? "Please complete all required fields"
                  : "Post to TikTok"
              }
            >
              {posting ? (
                <>
                  <Loader2 className="spin" size={16} />
                  Posting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
                  </svg>
                  Post to TikTok
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
