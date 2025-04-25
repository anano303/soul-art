import React, { useState, useEffect, useRef } from "react";
import Image, { ImageProps } from "next/image";

interface OptimizedStaticImageProps extends Omit<ImageProps, "onLoad"> {
  priority?: boolean;
}

export function OptimizedStaticImage({
  src,
  alt,
  priority = false,
  ...props
}: OptimizedStaticImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle image load event
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Modified useEffect to better handle static images
  useEffect(() => {
    // Check if the image is already in the DOM and loaded
    if (imageRef.current?.complete) {
      setIsLoaded(true);
      return;
    }

    // Check if the image is already cached
    if (typeof window !== "undefined") {
      const img = new window.Image();

      const onLoad = () => {
        setIsLoaded(true);
      };

      img.onload = onLoad;

      if (typeof src === "string") {
        img.src = src;
      } else if (typeof src === "object" && 'src' in src) {
        img.src = src.src as string;
      }

      // If already complete, trigger load
      if (img.complete) {
        setIsLoaded(true);
      }

      // Clean up
      return () => {
        img.onload = null;
      };
    }
  }, [src]);

  return (
    <Image
      ref={imageRef as React.RefObject<HTMLImageElement>}
      src={src}
      alt={alt || "Image"}
      priority={priority}
      onLoad={handleLoad}
      style={{
        ...props.style,
        opacity: isLoaded ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
      }}
      loading={priority ? "eager" : "lazy"}
      {...props}
    />
  );
}
