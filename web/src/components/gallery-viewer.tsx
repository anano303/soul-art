"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import type { TouchEvent } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ShoppingBag,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { GalleryLikeButton } from "@/components/gallery-like-button";
import { GalleryComments } from "@/components/gallery-comments";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { GalleryInteractionStats } from "@/lib/gallery-interaction.service";
import "./gallery-viewer.css";

export interface GalleryViewerImage {
  url: string;
  order?: number | null;
  _id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GalleryViewerPost {
  postId: string | null;
  productId: string | null;
  caption: string | null;
  hideBuyButton: boolean;
  isSold: boolean;
  images: GalleryViewerImage[];
}

interface GalleryViewerProps {
  posts: GalleryViewerPost[];
  currentPostIndex: number;
  currentImageIndex: number;
  artist: {
    id: string;
    name: string;
    storeName?: string;
    storeLogo?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onPostIndexChange: (postIndex: number, imageIndex?: number) => void;
  onImageIndexChange: (imageIndex: number) => void;
  getStatsForImage: (imageUrl: string) => GalleryInteractionStats;
  updateStats: (
    imageUrl: string,
    updates: Partial<GalleryInteractionStats>
  ) => void;
  onPostDelete?: (postId: string) => void;
  onPostEdit?: (postId: string, newCaption: string) => void;
}

export function GalleryViewer({
  posts,
  currentPostIndex,
  currentImageIndex,
  artist,
  isOpen,
  onClose,
  onPostIndexChange,
  onImageIndexChange,
  getStatsForImage,
  updateStats,
  onPostDelete,
  onPostEdit,
}: GalleryViewerProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileImageIndices, setMobileImageIndices] = useState<number[]>(() =>
    posts.map(() => 0)
  );
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState<
    { imageUrl: string } | null
  >(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<{postId: string; caption: string} | null>(null);
  const mobileViewRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageListRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchDataRef = useRef<
    { x: number; y: number; postIndex: number } | null
  >(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (posts.length === 0) {
      setMobileImageIndices([]);
      return;
    }

    setMobileImageIndices((prev) => {
      const normalized = posts.map((post, index) => {
        const maxIndex = Math.max((post.images?.length ?? 1) - 1, 0);
        const prevValue = prev[index] ?? 0;
        return Math.min(prevValue, maxIndex);
      });

      if (
        prev.length === normalized.length &&
        prev.every((value, index) => value === normalized[index])
      ) {
        return prev;
      }

      return normalized;
    });
  }, [posts]);

  useEffect(() => {
    if (posts.length === 0) {
      return;
    }

    setMobileImageIndices((prev) => {
      const normalized = posts.map((post, index) => {
        const maxIndex = Math.max((post.images?.length ?? 1) - 1, 0);
        const prevValue = prev[index] ?? 0;
        return Math.min(prevValue, maxIndex);
      });

      const boundedPostIndex = Math.min(
        Math.max(currentPostIndex, 0),
        posts.length - 1
      );
      const boundedImageIndex = Math.min(
        Math.max(currentImageIndex, 0),
        Math.max(
          (posts[boundedPostIndex]?.images?.length ?? 1) - 1,
          0
        )
      );

      if (normalized[boundedPostIndex] === boundedImageIndex) {
        if (
          prev.length === normalized.length &&
          prev.every((value, index) => value === normalized[index])
        ) {
          return prev;
        }
        return normalized;
      }

      normalized[boundedPostIndex] = boundedImageIndex;
      return normalized;
    });
  }, [currentImageIndex, currentPostIndex, posts]);

  useEffect(() => {
    postRefs.current = posts.map(
      (_, index) => postRefs.current[index] ?? null
    );
    imageListRefs.current = posts.map(
      (_, index) => imageListRefs.current[index] ?? null
    );
  }, [posts]);

  const scrollToImage = useCallback(
    (
      postIndex: number,
      imageIndex: number,
      behavior: ScrollBehavior = "smooth"
    ) => {
      const container = imageListRefs.current[postIndex];
      if (!container) {
        return;
      }

      const width = container.clientWidth;
      container.scrollTo({ left: width * imageIndex, behavior });
    },
    []
  );

  const currentPost = posts[currentPostIndex];
  const images = currentPost?.images ?? [];
  const hasImages = images.length > 0;

  useEffect(() => {
    if (!currentPost) {
      return;
    }

    const maxIndex = Math.max(images.length - 1, 0);
    if (currentImageIndex > maxIndex) {
      onImageIndexChange(maxIndex);
    }
  }, [currentPost, currentImageIndex, images.length, onImageIndexChange]);

  const fallbackImageIndex = hasImages
    ? Math.min(Math.max(currentImageIndex, 0), images.length - 1)
    : 0;

  const effectiveImageIndex = hasImages
    ? Math.min(
        mobileImageIndices[currentPostIndex] ?? fallbackImageIndex,
        images.length - 1
      )
    : 0;

  const currentImage = hasImages ? images[effectiveImageIndex] : null;

  const hasPrevImageInPost = hasImages && effectiveImageIndex > 0;
  const hasNextImageInPost =
    hasImages && effectiveImageIndex < images.length - 1;

  const syncPostAndImage = useCallback(
    (
      postIndex: number,
      imageIndex: number,
      options?: { scrollBehavior?: ScrollBehavior }
    ) => {
      if (posts.length === 0) {
        return;
      }

      const boundedPostIndex = Math.min(
        Math.max(postIndex, 0),
        posts.length - 1
      );
      const postImages = posts[boundedPostIndex]?.images ?? [];
      const boundedImageIndex = Math.min(
        Math.max(imageIndex, 0),
        Math.max(postImages.length - 1, 0)
      );

      setMobileImageIndices((prev) => {
        const normalized = posts.map((post, index) => {
          const maxIndex = Math.max((post.images?.length ?? 1) - 1, 0);
          const prevValue = prev[index] ?? 0;
          return Math.min(prevValue, maxIndex);
        });

        if (normalized[boundedPostIndex] === boundedImageIndex) {
          if (
            prev.length === normalized.length &&
            prev.every((value, index) => value === normalized[index])
          ) {
            return prev;
          }
          return normalized;
        }

        normalized[boundedPostIndex] = boundedImageIndex;
        return normalized;
      });

      onPostIndexChange(boundedPostIndex, boundedImageIndex);

      requestAnimationFrame(() => {
        scrollToImage(
          boundedPostIndex,
          boundedImageIndex,
          options?.scrollBehavior ?? "smooth"
        );
      });
    },
    [onPostIndexChange, posts, scrollToImage]
  );

  const goToPrevImage = useCallback(
    (postIndex: number) => {
      if (postIndex < 0 || postIndex >= posts.length) {
        return;
      }

      const postImages = posts[postIndex]?.images ?? [];
      const currentIndex = mobileImageIndices[postIndex] ?? 0;

      if (postImages.length > 0 && currentIndex > 0) {
        syncPostAndImage(postIndex, currentIndex - 1);
        return;
      }

      if (postIndex > 0) {
        const previousImages = posts[postIndex - 1]?.images ?? [];
        const storedIndex = mobileImageIndices[postIndex - 1] ?? 0;
        const targetIndex =
          previousImages.length > 0
            ? Math.min(storedIndex, previousImages.length - 1)
            : 0;
        syncPostAndImage(postIndex - 1, targetIndex);
      }
    },
    [mobileImageIndices, posts, syncPostAndImage]
  );

  const goToNextImage = useCallback(
    (postIndex: number) => {
      if (postIndex < 0 || postIndex >= posts.length) {
        return;
      }

      const postImages = posts[postIndex]?.images ?? [];
      const currentIndex = mobileImageIndices[postIndex] ?? 0;

      if (postImages.length > 0 && currentIndex < postImages.length - 1) {
        syncPostAndImage(postIndex, currentIndex + 1);
        return;
      }

      if (postIndex < posts.length - 1) {
        const nextImages = posts[postIndex + 1]?.images ?? [];
        const storedIndex = mobileImageIndices[postIndex + 1] ?? 0;
        const targetIndex =
          nextImages.length > 0
            ? Math.min(storedIndex, nextImages.length - 1)
            : 0;
        syncPostAndImage(postIndex + 1, targetIndex);
      }
    },
    [mobileImageIndices, posts, syncPostAndImage]
  );

  const handlePrevPost = useCallback(() => {
    if (currentPostIndex <= 0) {
      return;
    }

    const targetIndex = mobileImageIndices[currentPostIndex - 1] ?? 0;
    syncPostAndImage(currentPostIndex - 1, targetIndex);
  }, [currentPostIndex, mobileImageIndices, syncPostAndImage]);

  const handleNextPost = useCallback(() => {
    if (currentPostIndex >= posts.length - 1) {
      return;
    }

    const targetIndex = mobileImageIndices[currentPostIndex + 1] ?? 0;
    syncPostAndImage(currentPostIndex + 1, targetIndex);
  }, [currentPostIndex, mobileImageIndices, posts.length, syncPostAndImage]);

  const handlePrevImage = useCallback(() => {
    goToPrevImage(currentPostIndex);
  }, [currentPostIndex, goToPrevImage]);

  const handleNextImage = useCallback(() => {
    goToNextImage(currentPostIndex);
  }, [currentPostIndex, goToNextImage]);

  useEffect(() => {
    if (!isOpen) {
      setMobileCommentsOpen(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlePrevImage();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNextImage();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [handleNextImage, handlePrevImage, isOpen, onClose]);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>, postIndex: number) => {
      const touch = event.touches[0];
      touchDataRef.current = { x: touch.clientX, y: touch.clientY, postIndex };

      if (currentPostIndex !== postIndex) {
        const storedIndex = mobileImageIndices[postIndex] ?? 0;
        syncPostAndImage(postIndex, storedIndex, { scrollBehavior: "auto" });
      }
    },
    [currentPostIndex, mobileImageIndices, syncPostAndImage]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const touchData = touchDataRef.current;
      if (!touchData) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchData.x;
      const deltaY = touch.clientY - touchData.y;

      touchDataRef.current = null;

      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        goToNextImage(touchData.postIndex);
      } else {
        goToPrevImage(touchData.postIndex);
      }
    },
    [goToNextImage, goToPrevImage]
  );

  useEffect(() => {
    if (!isMobile || !isOpen) {
      return;
    }

    const postElement = postRefs.current[currentPostIndex];
    if (postElement) {
      postElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const container = imageListRefs.current[currentPostIndex];
    if (container) {
      const targetIndex = mobileImageIndices[currentPostIndex] ?? 0;
      const width = container.clientWidth;
      requestAnimationFrame(() => {
        container.scrollTo({ left: width * targetIndex, behavior: "auto" });
      });
    }
  }, [currentPostIndex, isMobile, isOpen, mobileImageIndices]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handleResize = () => {
      const container = imageListRefs.current[currentPostIndex];
      if (!container) {
        return;
      }

      const targetIndex = mobileImageIndices[currentPostIndex] ?? 0;
      const width = container.clientWidth;
      container.scrollTo({ left: width * targetIndex, behavior: "auto" });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPostIndex, isMobile, mobileImageIndices]);

  if (!isOpen || !currentPost || !currentImage) {
    return null;
  }

  const currentImageUrl = currentImage.url;
  const stats = getStatsForImage(currentImageUrl);
  const creationDate = new Date().toLocaleDateString(
    language === "en" ? "en-US" : "ka-GE"
  );
  const canDisplayCta =
    Boolean(currentPost.productId) &&
    !currentPost.hideBuyButton &&
    !currentPost.isSold;
  const soldCopy = language === "en" ? "Sold out" : "გაყიდულია";
  const notForSaleCopy = language === "en" ? "Not for sale" : "არ იყიდება";
  const ctaCopy = language === "en" ? "View listing" : "ნახე ლისტინგი";
  const showListingAction = canDisplayCta && Boolean(currentPost.productId);
  const showSoldStatus = currentPost.isSold;
  const showNotForSaleStatus = !showListingAction && !showSoldStatus;
  const imageCountLabel = hasImages
    ? `${effectiveImageIndex + 1} / ${images.length}`
    : null;

  const hasStatusBadge = showSoldStatus || showNotForSaleStatus;

  const renderStatusBadge = () => {
    if (!hasStatusBadge) {
      return null;
    }

    return (
      <span
        className={`gallery-viewer__status${
          showSoldStatus ? " gallery-viewer__status--sold" : ""
        }`}
      >
        {showSoldStatus ? soldCopy : notForSaleCopy}
      </span>
    );
  };

  if (isMobile) {
    return (
      <div className="gallery-viewer gallery-viewer--mobile">
        <div className="gallery-viewer__mobile-header-bar">
          <button
            className="gallery-viewer__back-btn"
            onClick={onClose}
            type="button"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="gallery-viewer__header-info">
            <h2 className="gallery-viewer__header-title">
              {language === "en" ? "Portfolio" : "პორტფოლიო"}
            </h2>
            <p className="gallery-viewer__header-subtitle">
              {artist.storeName || artist.name}
            </p>
          </div>
          <div className="gallery-viewer__header-spacer" />
        </div>

        <div className="gallery-viewer__mobile-feed" ref={mobileViewRef}>
          {posts.map((post, index) => {
            const postImages = post.images ?? [];
            if (postImages.length === 0) {
              return null;
            }

            const activeImageIndex = Math.min(
              mobileImageIndices[index] ?? 0,
              postImages.length - 1
            );
            const activeImage = postImages[activeImageIndex];
            const imageUrl = activeImage?.url ?? "";
            if (!imageUrl) {
              return null;
            }

            const imageStats = getStatsForImage(imageUrl);
            const entrySellable =
              Boolean(post.productId) &&
              !post.hideBuyButton &&
              !post.isSold;
            const statusBadge = post.isSold
              ? soldCopy
              : !entrySellable
              ? notForSaleCopy
              : null;

            return (
              <div
                key={post.postId ?? `post-${index}`}
                className="gallery-viewer__mobile-item"
                ref={(element) => {
                  postRefs.current[index] = element;
                }}
              >
                <div className="gallery-viewer__mobile-header">
                  {artist.storeLogo && (
                    <CloudinaryImage
                      src={artist.storeLogo}
                      alt={artist.storeName || artist.name}
                      width={32}
                      height={32}
                      className="gallery-viewer__mobile-avatar"
                    />
                  )}
                  <div className="gallery-viewer__mobile-user-info">
                    <h3 className="gallery-viewer__mobile-username">
                      {artist.storeName || artist.name}
                    </h3>
                    <p className="gallery-viewer__mobile-date">{creationDate}</p>
                  </div>
                  {user && user._id === artist.id && post.postId && (
                    <div className="gallery-viewer__menu-wrapper">
                      <button
                        className="gallery-viewer__menu-button"
                        onClick={() => setMenuOpen(menuOpen === post.postId ? null : post.postId)}
                        aria-label="Post options"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {menuOpen === post.postId && (
                        <div className="gallery-viewer__menu">
                          <button
                            className="gallery-viewer__menu-item"
                            onClick={() => {
                              setEditingPost({ postId: post.postId!, caption: post.caption || '' });
                              setMenuOpen(null);
                            }}
                          >
                            <Edit size={16} />
                            <span>{language === 'en' ? 'Edit Description' : 'აღწერის რედაქტირება'}</span>
                          </button>
                          <button
                            className="gallery-viewer__menu-item gallery-viewer__menu-item--danger"
                            onClick={async () => {
                              if (!confirm(language === 'en' ? 'Delete this post?' : 'წაშალოთ ეს პოსტი?')) return;
                              setMenuOpen(null);
                              try {
                                await onPostDelete?.(post.postId!);
                                toast({
                                  title: language === 'en' ? 'Post deleted' : 'პოსტი წაიშალა',
                                  variant: 'default',
                                });
                              } catch {
                                toast({
                                  title: language === 'en' ? 'Failed to delete post' : 'პოსტის წაშლა ვერ მოხერხდა',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Trash2 size={16} />
                            <span>{language === 'en' ? 'Delete' : 'წაშლა'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="gallery-viewer__mobile-carousel-wrapper">
                  <div
                    className="gallery-viewer__mobile-carousel"
                    ref={(element) => {
                      imageListRefs.current[index] = element;
                    }}
                    onTouchStart={(event) => handleTouchStart(event, index)}
                    onTouchEnd={handleTouchEnd}
                  >
                    {postImages.map((image, imageIndex) => (
                      <div
                        key={`${image.url}-${imageIndex}`}
                        className="gallery-viewer__mobile-slide"
                      >
                        <CloudinaryImage
                          src={image.url}
                          alt={`${artist.storeName || artist.name} - Image ${
                            imageIndex + 1
                          }`}
                          width={800}
                          height={800}
                          className="gallery-viewer__mobile-image"
                        />
                      </div>
                    ))}
                  </div>

                  {postImages.length > 1 && (
                    <>
                      <div className="gallery-viewer__counter gallery-viewer__counter--mobile">
                        {activeImageIndex + 1} / {postImages.length}
                      </div>
                      <div className="gallery-viewer__mobile-indicators">
                        {postImages.map((image, imageIndex) => (
                          <button
                            key={`${image.url}-${imageIndex}`}
                            type="button"
                            className={`gallery-viewer__mobile-indicator${
                              imageIndex === activeImageIndex
                                ? " gallery-viewer__mobile-indicator--active"
                                : ""
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              syncPostAndImage(index, imageIndex);
                            }}
                            aria-label={
                              language === "en"
                                ? `Show image ${imageIndex + 1}`
                                : `სურათი ${imageIndex + 1}`
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {post.caption && (
                  <p className="gallery-viewer__caption gallery-viewer__caption--mobile">
                    {post.caption}
                  </p>
                )}

                <div className="gallery-viewer__mobile-interactions">
                  <div className="gallery-viewer__mobile-actions">
                    {entrySellable && post.productId && (
                      <Link
                        href={`/products/${post.productId}`}
                        className="gallery-viewer__action gallery-viewer__action--mobile"
                        aria-label={ctaCopy}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ShoppingBag size={20} />
                      </Link>
                    )}
                    <GalleryLikeButton
                      artistId={artist.id}
                      imageUrl={imageUrl}
                      initialLikesCount={imageStats.likesCount}
                      initialIsLiked={imageStats.isLikedByUser}
                      iconSize={24}
                      onLikeToggle={(isLiked, likesCount) => {
                        updateStats(imageUrl, {
                          isLikedByUser: isLiked,
                          likesCount,
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="gallery-viewer__mobile-comment-btn"
                      onClick={() => setMobileCommentsOpen({ imageUrl })}
                    >
                      <MessageCircle size={24} />
                      <span>{imageStats.commentsCount}</span>
                    </button>
                  </div>

                  <div
                    className="gallery-viewer__mobile-comments-preview"
                    onClick={() => setMobileCommentsOpen({ imageUrl })}
                  >
                    <GalleryComments
                      artistId={artist.id}
                      imageUrl={imageUrl}
                      initialCommentsCount={imageStats.commentsCount}
                      onCommentsCountChange={(commentsCount) => {
                        updateStats(imageUrl, { commentsCount });
                      }}
                      autoExpanded={false}
                      previewMode
                      maxComments={3}
                      showButton={false}
                    />
                  </div>
                </div>

                {statusBadge && (
                  <div className="gallery-viewer__mobile-status">
                    <span
                      className={`gallery-viewer__status${
                        post.isSold ? " gallery-viewer__status--sold" : ""
                      }`}
                    >
                      {statusBadge}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {mobileCommentsOpen && (
          <>
            <div
              className="gallery-viewer__mobile-comments-backdrop"
              onClick={() => setMobileCommentsOpen(null)}
            />

            <div className="gallery-viewer__mobile-comments-drawer">
              <div className="gallery-viewer__mobile-comments-header">
                <h3>{language === "en" ? "Comments" : "კომენტარები"}</h3>
                <button
                  type="button"
                  className="gallery-viewer__mobile-comments-close"
                  onClick={() => setMobileCommentsOpen(null)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="gallery-viewer__mobile-comments-content">
                <GalleryComments
                  artistId={artist.id}
                  imageUrl={mobileCommentsOpen.imageUrl}
                  initialCommentsCount={
                    getStatsForImage(mobileCommentsOpen.imageUrl).commentsCount
                  }
                  onCommentsCountChange={(commentsCount) => {
                    updateStats(mobileCommentsOpen.imageUrl, { commentsCount });
                  }}
                  autoExpanded
                  previewMode={false}
                  showButton={false}
                  iconSize={24}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {editingPost && (
        <div className="gallery-viewer__edit-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="gallery-viewer__edit-content">
            <h3>{language === 'en' ? 'Edit Description' : 'აღწერის რედაქტირება'}</h3>
            <textarea
              value={editingPost.caption}
              onChange={(e) => setEditingPost({ ...editingPost, caption: e.target.value })}
              placeholder={language === 'en' ? 'Add a description...' : 'დაამატე აღწერა...'}
              maxLength={4000}
              rows={6}
            />
            <div className="gallery-viewer__edit-actions">
              <button
                onClick={() => setEditingPost(null)}
                className="gallery-viewer__edit-button gallery-viewer__edit-button--cancel"
              >
                {language === 'en' ? 'Cancel' : 'გაუქმება'}
              </button>
              <button
                onClick={async () => {
                  try {
                    await onPostEdit?.(editingPost.postId, editingPost.caption);
                    toast({
                      title: language === 'en' ? 'Post updated' : 'პოსტი განახლდა',
                      variant: 'default',
                    });
                    setEditingPost(null);
                  } catch {
                    toast({
                      title: language === 'en' ? 'Failed to update post' : 'პოსტის განახლება ვერ მოხერხდა',
                      variant: 'destructive',
                    });
                  }
                }}
                className="gallery-viewer__edit-button gallery-viewer__edit-button--save"
              >
                {language === 'en' ? 'Save' : 'შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="gallery-viewer" onClick={onClose}>
      <button className="gallery-viewer__close" onClick={onClose} type="button">
        <X size={24} />
      </button>

      {currentPostIndex > 0 && (
        <button
          className="gallery-viewer__nav gallery-viewer__nav--prev"
          onClick={(event) => {
            event.stopPropagation();
            handlePrevPost();
          }}
          type="button"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {currentPostIndex < posts.length - 1 && (
        <button
          className="gallery-viewer__nav gallery-viewer__nav--next"
          onClick={(event) => {
            event.stopPropagation();
            handleNextPost();
          }}
          type="button"
        >
          <ChevronRight size={32} />
        </button>
      )}

      <div
        className="gallery-viewer__content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="gallery-viewer__image-section">
          {images.length > 1 && hasPrevImageInPost && (
            <button
              className="gallery-viewer__image-nav gallery-viewer__image-nav--prev"
              onClick={(event) => {
                event.stopPropagation();
                handlePrevImage();
              }}
              type="button"
              aria-label={
                language === "en" ? "Previous image" : "წინა სურათი"
              }
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div
            className="gallery-viewer__image-container"
            onTouchStart={(event) => handleTouchStart(event, currentPostIndex)}
            onTouchEnd={handleTouchEnd}
          >
            <CloudinaryImage
              src={currentImageUrl}
              alt={`Gallery item by ${artist.storeName || artist.name}`}
              width={800}
              height={800}
              className="gallery-viewer__image"
            />
          </div>

          {images.length > 1 && hasNextImageInPost && (
            <button
              className="gallery-viewer__image-nav gallery-viewer__image-nav--next"
              onClick={(event) => {
                event.stopPropagation();
                handleNextImage();
              }}
              type="button"
              aria-label={
                language === "en" ? "Next image" : "შემდეგი სურათი"
              }
            >
              <ChevronRight size={24} />
            </button>
          )}

          {imageCountLabel && images.length > 1 && (
            <div className="gallery-viewer__counter">{imageCountLabel}</div>
          )}
        </div>

        <div className="gallery-viewer__sidebar">
          <div className="gallery-viewer__header">
            <div className="gallery-viewer__artist-info">
              {artist.storeLogo && (
                <CloudinaryImage
                  src={artist.storeLogo}
                  alt={artist.storeName || artist.name}
                  width={40}
                  height={40}
                  className="gallery-viewer__artist-avatar"
                />
              )}
              <div>
                <h3 className="gallery-viewer__artist-name">
                  {artist.storeName || artist.name}
                </h3>
                <p className="gallery-viewer__post-date">{creationDate}</p>
              </div>
            </div>
            {user && user._id === artist.id && currentPost.postId && (
              <div className="gallery-viewer__menu-wrapper">
                <button
                  className="gallery-viewer__menu-button"
                  onClick={() =>
                    setMenuOpen(
                      menuOpen === currentPost.postId ? null : currentPost.postId
                    )
                  }
                  aria-label="Post options"
                >
                  <MoreVertical size={20} />
                </button>
                {menuOpen === currentPost.postId && (
                  <div className="gallery-viewer__menu">
                    <button
                      className="gallery-viewer__menu-item"
                      onClick={() => {
                        setEditingPost({
                          postId: currentPost.postId!,
                          caption: currentPost.caption || "",
                        });
                        setMenuOpen(null);
                      }}
                    >
                      <Edit size={16} />
                      <span>
                        {language === "en"
                          ? "Edit Description"
                          : "აღწერის რედაქტირება"}
                      </span>
                    </button>
                    <button
                      className="gallery-viewer__menu-item gallery-viewer__menu-item--danger"
                      onClick={async () => {
                        if (
                          !confirm(
                            language === "en"
                              ? "Delete this post?"
                              : "წაშალოთ ეს პოსტი?"
                          )
                        )
                          return;
                        setMenuOpen(null);
                        try {
                          await onPostDelete?.(currentPost.postId!);
                          toast({
                            title:
                              language === "en"
                                ? "Post deleted"
                                : "პოსტი წაიშალა",
                            variant: "default",
                          });
                          onClose();
                        } catch {
                          toast({
                            title:
                              language === "en"
                                ? "Failed to delete post"
                                : "პოსტის წაშლა ვერ მოხერხდა",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Trash2 size={16} />
                      <span>{language === "en" ? "Delete" : "წაშლა"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasStatusBadge && (
            <div className="gallery-viewer__status-wrapper">
              {renderStatusBadge()}
            </div>
          )}

          {currentPost.caption && (
            <p className="gallery-viewer__caption">{currentPost.caption}</p>
          )}

          <div className="gallery-viewer__stats">
            {showListingAction && currentPost.productId && (
              <div className="gallery-viewer__stat gallery-viewer__stat--interactive">
                <Link
                  href={`/products/${currentPost.productId}`}
                  className="gallery-viewer__action"
                  aria-label={ctaCopy}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ShoppingBag size={20} />
                </Link>
              </div>
            )}
            <div className="gallery-viewer__stat gallery-viewer__stat--interactive">
              <GalleryLikeButton
                artistId={artist.id}
                imageUrl={currentImageUrl}
                initialLikesCount={stats.likesCount}
                initialIsLiked={stats.isLikedByUser}
                iconSize={24}
                onLikeToggle={(isLiked, likesCount) => {
                  updateStats(currentImageUrl, {
                    isLikedByUser: isLiked,
                    likesCount,
                  });
                }}
              />
            </div>
            <div className="gallery-viewer__stat gallery-viewer__stat gallery-viewer__stat--comments">
              <MessageCircle size={24} />
              <span>
                {stats.commentsCount} {language === "en" ? "comments" : "კომენტარი"}
              </span>
            </div>
          </div>

          <div className="gallery-viewer__comments-section">
            <GalleryComments
              artistId={artist.id}
              imageUrl={currentImageUrl}
              initialCommentsCount={stats.commentsCount}
              onCommentsCountChange={(commentsCount) => {
                updateStats(currentImageUrl, { commentsCount });
              }}
              autoExpanded
              iconSize={24}
            />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
