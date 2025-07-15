"use client";

import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  aspectRatio?: "square" | "video" | "product" | "auto";
  sizes?: string;
  fill?: boolean;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  quality = 85,
  aspectRatio = "auto",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  fill = false,
  placeholder = "empty",
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate blur placeholder
  const defaultBlurDataURL = `data:image/svg+xml;base64,${btoa(
    `<svg width="${width || 400}" height="${
      height || 300
    }" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f0f0f0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#a)" />
    </svg>`
  )}`;

  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    product: "aspect-product",
    auto: "",
  };

  const containerClass = `
    image-container 
    ${aspectRatioClasses[aspectRatio]}
    ${className}
    ${isLoading ? "skeleton" : ""}
  `.trim();

  const imageClass = `
    lazy-image
    ${isLoading ? "" : "loaded"}
    ${hasError ? "error" : ""}
  `.trim();

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (fill) {
    return (
      <div className={containerClass}>
        <Image
          src={src}
          alt={alt}
          fill
          className={imageClass}
          quality={quality}
          sizes={sizes}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL || defaultBlurDataURL}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={imageClass}
        quality={quality}
        sizes={sizes}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
