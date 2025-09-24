"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { isPwaMode } from "@/lib/pwa-performance";
import {
  getPwaOptimizedImageProps,
  generateBlurPlaceholder,
  optimizedImageSizes,
} from "@/lib/pwa-image-optimization";

interface PwaOptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: keyof typeof optimizedImageSizes;
  priority?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * PwaOptimizedImage component
 *
 * A wrapper around Next.js Image component that applies PWA-specific optimizations:
 * - Uses aggressive caching for PWA mode
 * - Provides proper blur placeholders
 * - Optimizes image dimensions based on device
 * - Uses different loading strategies for PWA vs web
 */
export default function PwaOptimizedImage({
  src,
  alt,
  className = "",
  size = "medium",
  priority = false,
  objectFit = "cover",
}: PwaOptimizedImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const imageId = `pwa-img-${alt.replace(/\s+/g, "-")}`;

  useEffect(() => {
    // Check if we're in PWA mode
    setIsPwa(isPwaMode());
  }, []);

  useEffect(() => {
    // Set up intersection observer for determining if image is in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading images when they're 200px from viewport
        threshold: 0.01,
      }
    );

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById(imageId);
      if (element) {
        observer.observe(element);
      }
    }, 0);

    return () => observer.disconnect();
  }, [alt, imageId]);

  // Get dimensions from size
  const { width, height } = optimizedImageSizes[size];

  // Add blur placeholder
  const blurDataURL = generateBlurPlaceholder(width, height);

  // Common styles
  const style = {
    objectFit,
  } as React.CSSProperties;

  // Additional PWA optimizations
  if (isPwa) {
    // Get optimized props for PWA mode
    const optimizedProps = getPwaOptimizedImageProps(src, alt, priority, size);

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <Image
          id={imageId}
          {...optimizedProps}
          className="rounded-md"
          style={style}
        />
      </div>
    );
  }

  // Standard web version - still optimized but less aggressive
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        id={imageId}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority || isInView ? "eager" : "lazy"}
        className="rounded-md"
        placeholder="blur"
        blurDataURL={blurDataURL}
        style={style}
        sizes={`(max-width: 768px) 100vw, ${width}px`}
      />
    </div>
  );
}
