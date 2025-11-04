"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import "./room-viewer.css";
import { useLanguage } from "@/hooks/LanguageContext";

import livingRoomImg from "@/assets/roomview/Living_Room-removebg-preview.png";
import bedroomImg from "@/assets/roomview/bedroom-removebg-preview.png";
import kitchenImg from "@/assets/roomview/dinning.png";
import hallImg from "@/assets/roomview/hall-removebg-preview.png";

type RoomType = "living" | "bedroom" | "kitchen" | "hall";

interface RoomViewerProps {
  productImage: string;
  isOpen: boolean;
  onClose: () => void;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

const rooms = {
  living: livingRoomImg,
  bedroom: bedroomImg,
  kitchen: kitchenImg,
  hall: hallImg,
};

const colorOptions = [
  { name: "White", value: "#FFFFFF" },
  { name: "Cream", value: "#FFF8E1" },
  { name: "Light Gray", value: "#F5F5F5" },
  { name: "Beige", value: "#F5F5DC" },
  { name: "Light Blue", value: "#E3F2FD" },
  { name: "Soft Green", value: "#E8F5E9" },
  { name: "Lavender", value: "#F3E5F5" },
  { name: "Peach", value: "#FFDAB9" },
  { name: "Light Yellow", value: "#FFFDE7" },
  { name: "Mint", value: "#E0F2F1" },
  { name: "Sky Blue", value: "#BBDEFB" },
  { name: "Blush Pink", value: "#FFEBEE" },
];

const ROOM_DIMENSIONS_CM: Record<RoomType, { width: number; height: number }> =
  {
    living: { width: 480, height: 280 },
    bedroom: { width: 420, height: 260 },
    kitchen: { width: 360, height: 250 },
    hall: { width: 320, height: 260 },
  };

const ROOM_SCALE_MULTIPLIER: Record<RoomType, number> = {
  living: 1.8,
  bedroom: 1.7,
  kitchen: 1.6,
  hall: 1.6,
};

const DEFAULT_ARTWORK_HEIGHT_CM = 90;
const MAX_ARTWORK_RATIO = 0.85;
const FALLBACK_HEIGHT_RATIO = 0.45;
const MIN_ARTWORK_HEIGHT_RATIO = 0.2;

export function RoomViewer({
  productImage,
  isOpen,
  onClose,
  dimensions,
}: RoomViewerProps) {
  const [currentRoom, setCurrentRoom] = useState<RoomType>("living");
  const [wallColor, setWallColor] = useState("#FFFFFF");
  const [productPosition, setProductPosition] = useState({ x: 0, y: 0 });
  const [roomImagesLoaded, setRoomImagesLoaded] = useState(false);
  const [productLoaded, setProductLoaded] = useState(false);
  const [artworkSizePx, setArtworkSizePx] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 1,
    height: 1,
  });
  const [resolvedDimensionsCm, setResolvedDimensionsCm] = useState<{
    width?: number;
    height?: number;
  }>({});
  const { t } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkImagesLoaded = async () => {
      try {
        if (livingRoomImg && bedroomImg && kitchenImg && hallImg) {
          setRoomImagesLoaded(true);
        }
      } catch (error) {
        console.error("Error loading room images:", error);
      }
    };

    checkImagesLoaded();
  }, []);

  useEffect(() => {
    setProductPosition({ x: 0, y: 0 });
  }, [currentRoom, isOpen]);

  useEffect(() => {
    setProductLoaded(false);
  }, [productImage]);

  useEffect(() => {
    if (!productImage) {
      return;
    }

    setProductPosition({ x: 0, y: 0 });
    setArtworkSizePx({ width: 0, height: 0 });
    setResolvedDimensionsCm({});
  }, [productImage]);

  const parseDimensionValue = (value?: number | string | null) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    const numeric =
      typeof value === "number" ? value : parseFloat(String(value));

    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    return undefined;
  };

  const updateArtworkSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const { width: containerWidth, height: containerHeight } =
      container.getBoundingClientRect();

    if (!containerWidth || !containerHeight) {
      return;
    }

    const roomScale = ROOM_DIMENSIONS_CM[currentRoom];
    const widthCmRaw = parseDimensionValue(dimensions?.width ?? undefined);
    const heightCmRaw = parseDimensionValue(dimensions?.height ?? undefined);

    const aspectRatio =
      imageNaturalSize.width > 0 && imageNaturalSize.height > 0
        ? imageNaturalSize.width / imageNaturalSize.height
        : 1;

    let resolvedWidthCm: number;
    let resolvedHeightCm: number;

    if (widthCmRaw && heightCmRaw) {
      resolvedWidthCm = widthCmRaw;
      resolvedHeightCm = heightCmRaw;
    } else if (widthCmRaw && aspectRatio > 0) {
      resolvedWidthCm = widthCmRaw;
      resolvedHeightCm = widthCmRaw / aspectRatio;
    } else if (heightCmRaw && aspectRatio > 0) {
      resolvedHeightCm = heightCmRaw;
      resolvedWidthCm = heightCmRaw * aspectRatio;
    } else {
      const fallbackHeightCm = DEFAULT_ARTWORK_HEIGHT_CM;
      const fallbackWidthCm =
        aspectRatio > 0 ? fallbackHeightCm * aspectRatio : fallbackHeightCm;
      resolvedWidthCm = fallbackWidthCm;
      resolvedHeightCm = fallbackHeightCm;
    }

    if (!Number.isFinite(resolvedWidthCm) || resolvedWidthCm <= 0) {
      resolvedWidthCm = DEFAULT_ARTWORK_HEIGHT_CM;
    }

    if (!Number.isFinite(resolvedHeightCm) || resolvedHeightCm <= 0) {
      resolvedHeightCm = DEFAULT_ARTWORK_HEIGHT_CM;
    }

    const scaleMultiplier = ROOM_SCALE_MULTIPLIER[currentRoom] ?? 1;
    const pxPerCmX = (containerWidth * scaleMultiplier) / roomScale.width;
    const pxPerCmY = (containerHeight * scaleMultiplier) / roomScale.height;

    let widthPx = resolvedWidthCm * pxPerCmX;
    let heightPx = resolvedHeightCm * pxPerCmY;

    const maxWidthPx = containerWidth * MAX_ARTWORK_RATIO;
    const maxHeightPx = containerHeight * MAX_ARTWORK_RATIO;

    const initialScale = Math.min(
      widthPx > 0 ? maxWidthPx / widthPx : 1,
      heightPx > 0 ? maxHeightPx / heightPx : 1,
      1,
    );

    if (initialScale < 1) {
      widthPx *= initialScale;
      heightPx *= initialScale;
    }

    const minHeightPx = containerHeight * MIN_ARTWORK_HEIGHT_RATIO;
    if (heightPx > 0 && heightPx < minHeightPx) {
      const minScale = minHeightPx / heightPx;
      widthPx *= minScale;
      heightPx = minHeightPx;
    }

    const postMinScale = Math.min(
      widthPx > 0 ? maxWidthPx / widthPx : 1,
      heightPx > 0 ? maxHeightPx / heightPx : 1,
      1,
    );

    if (postMinScale < 1) {
      widthPx *= postMinScale;
      heightPx *= postMinScale;
    }

    // As a last fallback ensure we have a visible size
    if (!widthPx || !heightPx) {
      const fallbackHeightPx = containerHeight * FALLBACK_HEIGHT_RATIO;
      const fallbackWidthPx =
        aspectRatio > 0 ? fallbackHeightPx * aspectRatio : fallbackHeightPx;
      widthPx = fallbackWidthPx;
      heightPx = fallbackHeightPx;
    }

    setArtworkSizePx({
      width: widthPx,
      height: heightPx,
    });
    setResolvedDimensionsCm({
      width: resolvedWidthCm,
      height: resolvedHeightCm,
    });
    setProductPosition({ x: 0, y: 0 });
  }, [
    currentRoom,
    dimensions?.height,
    dimensions?.width,
    imageNaturalSize.height,
    imageNaturalSize.width,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateArtworkSize();
  }, [isOpen, updateArtworkSize]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleWindowResize = () => {
      updateArtworkSize();
    };

    window.addEventListener("resize", handleWindowResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateArtworkSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
        resizeObserver.disconnect();
      }
    };
  }, [isOpen, updateArtworkSize]);

  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleRoomChange = (room: RoomType) => {
    setCurrentRoom(room);
    setProductPosition({ x: 0, y: 0 });
  };

  const handleColorChange = (color: string) => {
    setWallColor(color);
  };

  const hasComputedArtworkSize =
    artworkSizePx.width > 0 && artworkSizePx.height > 0;
  const fallbackHeightPercent = FALLBACK_HEIGHT_RATIO * 100;
  const formatDimensionValue = (value: number) =>
    Number.isFinite(value)
      ? Number.isInteger(value)
        ? Math.round(value).toString()
        : (Math.round(value * 10) / 10).toString()
      : "-";

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="room-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("roomViewer.title")}
    >
      <div className="room-viewer-modal">
        <div className="room-viewer-header">
          <h2 className="room-viewer-title">{t("roomViewer.title")}</h2>
          <button
            type="button"
            className="room-viewer-close"
            onClick={onClose}
            aria-label={t("roomViewer.close") || "Close"}
          >
            ×
          </button>
        </div>

        <div className="room-viewer-body">
          <div className="room-preview" aria-live="polite">
            <div
              className="room-view-container"
              ref={containerRef}
              style={{ backgroundColor: wallColor }}
            >
              <div className="room-image-wrapper">
                {roomImagesLoaded ? (
                  <Image
                    src={rooms[currentRoom]}
                    alt={`${currentRoom} view`}
                    fill
                    className="room-image"
                    priority
                  />
                ) : (
                  <div className="loading-message">
                    {t("roomViewer.loading")}
                  </div>
                )}

                <motion.div
                  className="product-on-wall"
                  drag
                  dragConstraints={containerRef}
                  dragMomentum={false}
                  style={{
                    width: hasComputedArtworkSize
                      ? `${artworkSizePx.width}px`
                      : "auto",
                    height: hasComputedArtworkSize
                      ? `${artworkSizePx.height}px`
                      : `${fallbackHeightPercent}%`,
                    position: "absolute",
                    top: "30%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    x: productPosition.x,
                    y: productPosition.y,
                  }}
                  onDragEnd={(event, info) => {
                    setProductPosition((prev) => ({
                      x: prev.x + info.offset.x,
                      y: prev.y + info.offset.y,
                    }));
                  }}
                >
                  {productImage && (
                    <div className="product-image-container">
                      <Image
                        src={productImage}
                        alt="Artwork"
                        width={320}
                        height={320}
                        className="room-product-image"
                        style={{
                          objectFit: "contain",
                          width: "100%",
                          height: "100%",
                          border: "none",
                          clipPath: "none",
                          WebkitClipPath: "none",
                        }}
                        unoptimized
                        loading="eager"
                        onLoad={(event) => {
                          const target = event.currentTarget;
                          setImageNaturalSize({
                            width: target.naturalWidth || 1,
                            height: target.naturalHeight || 1,
                          });
                          setProductLoaded(true);
                          if (
                            typeof window !== "undefined" &&
                            typeof window.requestAnimationFrame === "function"
                          ) {
                            window.requestAnimationFrame(() => {
                              updateArtworkSize();
                            });
                          } else {
                            updateArtworkSize();
                          }
                        }}
                        onError={(e) => {
                          console.error("Error loading product image:", e);
                        }}
                      />
                      {!productLoaded && (
                        <div className="product-loading">
                          {t("roomViewer.artworkLoading")}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
            <div className="instructions">
              <p>{t("roomViewer.instructions")}</p>
            </div>
          </div>

          <div className="room-controls-panel">
            <div className="room-selector control-card">
              <label>{t("roomViewer.chooseRoom")}</label>
              <div className="room-buttons">
                <button
                  type="button"
                  className={currentRoom === "living" ? "active" : ""}
                  onClick={() => handleRoomChange("living")}
                >
                  {t("roomViewer.livingRoom")}
                </button>
                <button
                  type="button"
                  className={currentRoom === "bedroom" ? "active" : ""}
                  onClick={() => handleRoomChange("bedroom")}
                >
                  {t("roomViewer.bedroom")}
                </button>
                <button
                  type="button"
                  className={currentRoom === "kitchen" ? "active" : ""}
                  onClick={() => handleRoomChange("kitchen")}
                >
                  {t("roomViewer.kitchen")}
                </button>
                <button
                  type="button"
                  className={currentRoom === "hall" ? "active" : ""}
                  onClick={() => handleRoomChange("hall")}
                >
                  {t("roomViewer.hall")}
                </button>
              </div>
            </div>

            <div className="artwork-size-summary control-card">
              <label>{t("roomViewer.artworkSize")}</label>
              <p className="artwork-size-readonly">
                {resolvedDimensionsCm.width && resolvedDimensionsCm.height
                  ? `${formatDimensionValue(
                      resolvedDimensionsCm.width
                    )} × ${formatDimensionValue(
                      resolvedDimensionsCm.height
                    )} ${t("product.cm")}`
                  : t("roomViewer.autoSizing")}
              </p>
            </div>

            <div className="color-selector control-card">
              <label>{t("roomViewer.wallColor")}</label>
              <div className="color-options">
                {colorOptions.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    className={`color-option ${
                      wallColor === color.value ? "active" : ""
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorChange(color.value)}
                    title={color.name}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className="room-viewer-close-mobile"
              onClick={onClose}
            >
              {t("roomViewer.close") || "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
