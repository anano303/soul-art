import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getVisiblePages = (current: number, total: number) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 4) return [1, 2, 3, 4, 5, null, total];
  if (current >= total - 3)
    return [1, null, total - 4, total - 3, total - 2, total - 1, total];

  return [1, null, current - 1, current, current + 1, null, total];
};

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GEL",
  }).format(price);
}

/**
 * Optimize Cloudinary image URLs for better performance
 * Adds auto format (webp/avif), quality optimization, and optional sizing
 */
export function optimizeCloudinaryUrl(
  url: string | undefined | null,
  options: {
    width?: number;
    height?: number;
    quality?: "auto" | "auto:low" | "auto:eco" | "auto:good" | "auto:best" | number;
    format?: "auto" | "webp" | "avif";
  } = {}
): string {
  if (!url) return "";
  
  // Only optimize Cloudinary URLs
  if (!url.includes("cloudinary.com")) {
    return url;
  }
  
  const { width, height, quality = "auto", format = "auto" } = options;
  
  // Build transformation string
  const transforms: string[] = [];
  
  // Add format transformation (f_auto for automatic best format)
  transforms.push(`f_${format}`);
  
  // Add quality transformation
  transforms.push(`q_${quality}`);
  
  // Add width if specified
  if (width) {
    transforms.push(`w_${width}`);
  }
  
  // Add height if specified
  if (height) {
    transforms.push(`h_${height}`);
  }
  
  // Add crop mode if dimensions are specified
  if (width || height) {
    transforms.push("c_limit"); // Limit to max dimensions while preserving aspect ratio
  }
  
  const transformString = transforms.join(",");
  
  // Insert transformations into Cloudinary URL
  // URL format: https://res.cloudinary.com/cloud_name/image/upload/[transformations]/path
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex !== -1) {
    const beforeUpload = url.substring(0, uploadIndex + 8); // includes /upload/
    const afterUpload = url.substring(uploadIndex + 8);
    
    // Check if there are already transformations
    // If the path after /upload/ starts with v followed by a number, it's a version
    // If it contains commas or transformation patterns, add to existing
    if (/^v\d+\//.test(afterUpload)) {
      // Has version, insert transforms before version
      return `${beforeUpload}${transformString}/${afterUpload}`;
    } else if (afterUpload.includes(",") || /^[a-z]_/.test(afterUpload)) {
      // Already has transformations, prepend new ones
      return `${beforeUpload}${transformString},${afterUpload}`;
    } else {
      // No transformations, add them
      return `${beforeUpload}${transformString}/${afterUpload}`;
    }
  }
  
  return url;
}
