import React from "react";
import Image, { ImageProps } from "next/image";

interface CloudinaryImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

/**
 * Image component that handles both Cloudinary and S3 URLs.
 * S3 images are already optimized (WebP via sharp) so no extra processing needed.
 * Cloudinary images use unoptimized to avoid Next.js double-processing.
 */
export function CloudinaryImage({ src, alt, ...props }: CloudinaryImageProps) {
  // S3 URL-ები უკვე ოპტიმიზებულია - unoptimized რომ ზედმეტი პროცესინგი არ მოხდეს
  return <Image src={src} alt={alt || "Image"} unoptimized={true} {...props} />;
}
