import React from "react";
import Image, { ImageProps } from "next/image";

interface CloudinaryImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

export function CloudinaryImage({ src, alt, ...props }: CloudinaryImageProps) {
  // Use direct source from Cloudinary without Next.js image optimization
  return <Image src={src} alt={alt || "Image"} unoptimized={true} {...props} />;
}
