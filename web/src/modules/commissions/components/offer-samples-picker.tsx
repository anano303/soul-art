"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { ReferenceImages } from "./reference-images";

const MAX_SAMPLES = 5;
const MAX_SIZE_MB = 15;

interface OfferSamplesPickerProps {
  /** Already uploaded samples of the artist's current offer. */
  existing?: string[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  clearExisting: boolean;
  onClearExistingChange: (clear: boolean) => void;
}

/**
 * Lets the artist attach photos of similar work they have painted before.
 * Uploading a new set replaces the old one on save.
 */
export function OfferSamplesPicker({
  existing = [],
  files,
  onFilesChange,
  clearExisting,
  onClearExistingChange,
}: OfferSamplesPickerProps) {
  const { language } = useLanguage();
  const en = language === "en";
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const showExisting = existing.length > 0 && !clearExisting;

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const tooBig = picked.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooBig.length > 0) {
      toast({
        title: en
          ? `Each image must be under ${MAX_SIZE_MB}MB`
          : `თითო სურათი ${MAX_SIZE_MB}MB-ზე ნაკლები უნდა იყოს`,
        variant: "destructive",
      });
    }
    const valid = picked.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);
    const next = [...files, ...valid].slice(0, MAX_SAMPLES);
    if (files.length + valid.length > MAX_SAMPLES) {
      toast({
        title: en
          ? `Up to ${MAX_SAMPLES} images`
          : `მაქსიმუმ ${MAX_SAMPLES} სურათი`,
      });
    }
    onFilesChange(next);
    // Allow re-picking the same file after a removal.
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (index: number) =>
    onFilesChange(files.filter((_, i) => i !== index));

  return (
    <div style={{ marginTop: "1rem" }}>
      <label className="commission-label" style={{ marginTop: 0 }}>
        {en
          ? "Samples of similar work (optional)"
          : "მსგავსი ნამუშევრების ნიმუშები (სურვილისამებრ)"}
      </label>
      <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 0.5rem" }}>
        {en
          ? `Attach up to ${MAX_SAMPLES} photos of similar pieces you have painted — buyers pick these offers far more often.`
          : `ატვირთე მაქსიმუმ ${MAX_SAMPLES} ფოტო შენი მსგავსი ნამუშევრებისა — ასეთ შეთავაზებებს მყიდველები გაცილებით ხშირად ირჩევენ.`}
      </p>

      {showExisting && (
        <div style={{ marginBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: "0.35rem" }}>
            {en ? "Currently attached:" : "ამჟამად მიმაგრებული:"}
          </div>
          <ReferenceImages
            images={existing}
            alt={en ? "Sample" : "ნიმუში"}
            thumbClassName="commission-preview"
          />
          <button
            type="button"
            onClick={() => onClearExistingChange(true)}
            style={{
              marginTop: "0.4rem",
              background: "none",
              border: "none",
              color: "#b91c1c",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {en ? "Remove all samples" : "ყველა ნიმუშის წაშლა"}
          </button>
        </div>
      )}

      {clearExisting && existing.length > 0 && (
        <p style={{ fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.5rem" }}>
          {en
            ? "Samples will be removed when you save."
            : "ნიმუშები წაიშლება შენახვისას."}{" "}
          <button
            type="button"
            onClick={() => onClearExistingChange(false)}
            style={{
              background: "none",
              border: "none",
              color: "#02457a",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
              fontSize: "0.8rem",
            }}
          >
            {en ? "Undo" : "დაბრუნება"}
          </button>
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className="commission-upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={files.length >= MAX_SAMPLES}
      >
        📷{" "}
        {en
          ? `Attach photos (${files.length}/${MAX_SAMPLES})`
          : `ფოტოების ატვირთვა (${files.length}/${MAX_SAMPLES})`}
      </button>

      {previews.length > 0 && (
        <>
          <div className="commission-previews">
            {previews.map((src, i) => (
              <div key={src} className="commission-preview">
                <Image
                  src={src}
                  alt={files[i]?.name || ""}
                  fill
                  sizes="80px"
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
                <button
                  type="button"
                  aria-label={en ? "Remove" : "წაშლა"}
                  onClick={() => removeAt(i)}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: 12,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {existing.length > 0 && !clearExisting && (
            <p style={{ fontSize: "0.78rem", color: "#856404", marginTop: "0.4rem" }}>
              {en
                ? "The new photos will replace the currently attached ones."
                : "ახალი ფოტოები ჩაანაცვლებს ამჟამად მიმაგრებულებს."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
