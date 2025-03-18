"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import "./brandAssets.css";

interface BrandAssetsProps {
  brandLogo?: {
    url: string;
  };
}

export function BrandAssets({ brandLogo }: BrandAssetsProps) {
  if (!brandLogo) {
    return (
      <div className="container">
        <div className="pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="container"
    >
      <div className="brandContainer">
        <div className="imageWrapper">
          <Image
            src={brandLogo.url}
            alt="Brand logo"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
}
