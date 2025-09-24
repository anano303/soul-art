/**
 * Image Optimization Utilities for PWA
 *
 * This file contains utilities focused on improving image loading perf  return {
    src: optimizedSrc,
    alt,
    width,
    height,
    loading: priority ? "eager" as const : "lazy" as const,
    placeholder: "blur" as const,
    blurDataURL,
    sizes: `(max-width: 768px) 100vw, ${width}px`,
  };* specifically for the PWA environment.
 */

import { isPwaMode } from "./pwa-performance";

/**
 * Image dimensions for optimal mobile loading
 */
export const optimizedImageSizes = {
  thumbnail: { width: 100, height: 100 },
  small: { width: 320, height: 240 },
  medium: { width: 640, height: 480 },
  large: { width: 1024, height: 768 },
  hero: { width: 1280, height: 720 },
};

/**
 * Generate blur placeholder data URL for images
 * @param width Width of the placeholder
 * @param height Height of the placeholder
 * @param rgbColor RGB color for placeholder
 */
export function generateBlurPlaceholder(
  width: number,
  height: number,
  rgbColor = "200,200,200"
): string {
  return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='rgb(${rgbColor})'/%3E%3C/svg%3E`;
}

/**
 * Returns optimized image URL with the right size and format
 * @param src Original image URL
 * @param size Size category (thumbnail, small, medium, large, hero)
 */
export function getOptimizedImageUrl(
  src: string,
  size: keyof typeof optimizedImageSizes = "medium"
): string {
  if (!src) return src;

  // Handle Cloudinary URLs
  if (src.includes("res.cloudinary.com")) {
    const { width, height } = optimizedImageSizes[size];

    // Optimize Cloudinary URLs for better performance
    // Format: w_width,h_height,c_limit,q_auto,f_auto
    return src.replace(
      /\/upload\//,
      `/upload/w_${width},h_${height},c_limit,q_auto,f_auto/`
    );
  }

  // Handle S3 URLs
  if (src.includes("fish-hunt.s3.eu-north-1.amazonaws.com")) {
    // For S3, we might not have direct transformations
    // So we just return the original URL
    return src;
  }

  return src;
}

/**
 * Determines if an image should be lazy loaded
 * @param priority Is this a high priority image
 * @param isVisible Is the image likely in the viewport
 */
export function shouldLazyLoadImage(
  priority: boolean,
  isVisible: boolean
): boolean {
  // Don't lazy load priority images or visible images
  if (priority || isVisible) return false;

  // In PWA mode, we can be more aggressive with lazy loading
  return isPwaMode();
}

/**
 * Preloads critical images for faster rendering
 * @param imagePaths Array of image paths to preload
 */
export function preloadCriticalImages(imagePaths: string[]): void {
  if (typeof window === "undefined") return;

  // Only preload in PWA mode to save bandwidth for web users
  if (!isPwaMode()) return;

  imagePaths.forEach((path) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = path;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  });
}

/**
 * Returns image props optimized for PWA usage
 * @param src Image source
 * @param alt Image alt text
 * @param priority Whether this is a high priority image
 * @param size Size category
 */
export function getPwaOptimizedImageProps(
  src: string,
  alt: string,
  priority = false,
  size: keyof typeof optimizedImageSizes = "medium"
) {
  const optimizedSrc = getOptimizedImageUrl(src, size);
  const { width, height } = optimizedImageSizes[size];
  const placeholder = "blur";
  const blurDataURL = generateBlurPlaceholder(width, height);

  return {
    src: optimizedSrc,
    alt,
    width,
    height,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    placeholder: "blur" as const,
    blurDataURL,
    sizes: `(max-width: 768px) 100vw, ${width}px`,
  };
}

/**
 * Custom Image loader for Cloudinary and S3 images in PWA context
 */
export function pwaImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Default quality
  const q = quality || 75;

  // Optimize for Cloudinary
  if (src.includes("res.cloudinary.com")) {
    return src.replace(/\/upload\//, `/upload/w_${width},q_${q},f_auto/`);
  }

  // For S3 and other sources, just return the original
  return src;
}

/**
 * Optimizes background image URL for CSS usage
 */
export function optimizedBackgroundImageUrl(
  src: string,
  size: keyof typeof optimizedImageSizes = "large"
): string {
  return getOptimizedImageUrl(src, size);
}
