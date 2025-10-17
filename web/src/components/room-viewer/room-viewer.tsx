"use client";

import React, { useState, useRef, useEffect } from "react";
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

export function RoomViewer({ productImage, isOpen, onClose }: RoomViewerProps) {
  const [currentRoom, setCurrentRoom] = useState<RoomType>("living");
  const [wallColor, setWallColor] = useState("#FFFFFF");
  const [productPosition, setProductPosition] = useState({ x: 0, y: 0 });
  const [productSize, setProductSize] = useState(45);
  const [roomImagesLoaded, setRoomImagesLoaded] = useState(false);
  const [productLoaded, setProductLoaded] = useState(false);
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
    setProductSize(45);
  }, [productImage]);

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

  const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProductSize(Number(event.target.value));
  };

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
                    height: `${productSize}%`,
                    width: "auto",
                    position: "absolute",
                    top: "40%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    x: productPosition.x,
                    y: productPosition.y,
                  }}
                  onDragEnd={(event, info) => {
                    setProductPosition({
                      x: productPosition.x + info.offset.x,
                      y: productPosition.y + info.offset.y,
                    });
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
                          width: "auto",
                          height: "100%",
                          border: "none",
                          clipPath: "none",
                          WebkitClipPath: "none",
                        }}
                        unoptimized
                        loading="eager"
                        onLoad={() => setProductLoaded(true)}
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

            <div className="product-size-control control-card">
              <label htmlFor="artwork-size-slider">
                {t("roomViewer.artworkSize")}: {productSize}%
              </label>
              <input
                id="artwork-size-slider"
                type="range"
                min="15"
                max="70"
                value={productSize}
                onChange={handleSizeChange}
              />
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
