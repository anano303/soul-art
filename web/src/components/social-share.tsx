"use client";

import { Facebook, Linkedin, Instagram, Share2 } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import "./social-share.css";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
}

export function SocialShare({ url, title, description }: SocialShareProps) {
  const { language } = useLanguage();
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || "");

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    // Instagram doesn't have direct web sharing, but we can open Instagram with a prompt
    instagram: `https://www.instagram.com/`,
  };

  const handleShare = (platform: string) => {
    const link = shareLinks[platform as keyof typeof shareLinks];
    if (platform === "instagram") {
      // For Instagram, we'll copy the link and show a message
      navigator.clipboard.writeText(url);
      alert(
        language === "en"
          ? "Link copied! Open Instagram and paste in your post."
          : "ლინკი დაკოპირდა! გახსენით Instagram და ჩასვით პოსტში."
      );
      window.open(link, "_blank");
    } else {
      window.open(link, "_blank", "width=600,height=400");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: url,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    }
  };

  const hasNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="social-share">
      <div className="social-share-buttons">
        <h3 className="social-share-title">
          {language === "en" ? "Share" : "გააზიარე"}
        </h3>
        <button
          onClick={() => handleShare("facebook")}
          className="social-btn facebook"
          aria-label="Share on Facebook"
        >
          <Facebook size={20} />
          <span>Facebook</span>
        </button>
        <button
          onClick={() => handleShare("linkedin")}
          className="social-btn linkedin"
          aria-label="Share on LinkedIn"
        >
          <Linkedin size={20} />
          <span>LinkedIn</span>
        </button>
        <button
          onClick={() => handleShare("instagram")}
          className="social-btn instagram"
          aria-label="Share on Instagram"
        >
          <Instagram size={20} />
          <span>Instagram</span>
        </button>
        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className="social-btn share"
            aria-label="Share"
          >
            <Share2 size={20} />
            <span>{language === "en" ? "More" : "სხვა"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
