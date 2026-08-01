"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import "./reference-images.css";

interface ReferenceImagesProps {
  images?: string[];
  alt?: string;
  /** Page-specific thumb class that supplies size/radius/border. */
  thumbClassName?: string;
}

/**
 * Reference image thumbs for a commission. Clicking a thumb opens a
 * full-screen preview (Esc / backdrop / ✕ to close, arrows to navigate).
 */
export function ReferenceImages({
  images,
  alt = "",
  thumbClassName = "commission-thumb",
}: ReferenceImagesProps) {
  const { language } = useLanguage();
  const [index, setIndex] = useState<number | null>(null);

  const list = images?.filter(Boolean) || [];
  const isOpen = index !== null;

  const step = useCallback(
    (dir: number) => {
      setIndex((i) => (i === null ? i : (i + dir + list.length) % list.length));
    },
    [list.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, step]);

  if (list.length === 0) {
    return <div className={thumbClassName} />;
  }

  return (
    <>
      <div className="ref-thumbs">
        {list.map((img, i) => (
          <button
            key={img + i}
            type="button"
            className={`${thumbClassName} ref-thumb-btn`}
            title={language === "en" ? "Click to enlarge" : "დააჭირე გასადიდებლად"}
            onClick={() => setIndex(i)}
          >
            <Image
              src={img}
              alt={alt}
              fill
              sizes="90px"
              style={{ objectFit: "cover" }}
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="ref-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setIndex(null)}
        >
          <button
            type="button"
            className="ref-lightbox-close"
            aria-label={language === "en" ? "Close" : "დახურვა"}
            onClick={() => setIndex(null)}
          >
            ✕
          </button>

          {list.length > 1 && (
            <>
              <button
                type="button"
                className="ref-lightbox-nav prev"
                aria-label={language === "en" ? "Previous" : "წინა"}
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="ref-lightbox-nav next"
                aria-label={language === "en" ? "Next" : "შემდეგი"}
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
              >
                ›
              </button>
              <div className="ref-lightbox-counter">
                {index + 1} / {list.length}
              </div>
            </>
          )}

          <div className="ref-lightbox-img" onClick={(e) => e.stopPropagation()}>
            <Image
              src={list[index]}
              alt={alt}
              fill
              sizes="90vw"
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
