"use client";

import React, { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { createBanner, updateBanner } from "../api/banner";
import { Banner, CreateBannerData } from "@/types/banner";
import { X, Upload } from "lucide-react";
import Image from "next/image";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import "./banner-modal.css";

interface BannerModalProps {
  banner: Banner | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function BannerModal({ banner, onClose, onSuccess }: BannerModalProps) {
  const isEditing = !!banner;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const [formData, setFormData] = useState<CreateBannerData>({
    title: banner?.title || "",
    titleEn: banner?.titleEn || "",
    buttonText: banner?.buttonText || "",
    buttonTextEn: banner?.buttonTextEn || "",
    buttonLink: banner?.buttonLink || "",
    isActive: banner?.isActive ?? true,
    sortOrder: banner?.sortOrder || 0,
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: ({ data, image }: { data: CreateBannerData; image?: File }) =>
      createBanner(data, image),
    onSuccess: () => {
      toast({
        title: t("adminBanners.createSuccess"),
        description: t("adminBanners.createSuccessDescription"),
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t("adminBanners.createError"),
        description: t("adminBanners.createErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      data,
      image,
    }: {
      data: Partial<CreateBannerData>;
      image?: File;
    }) => updateBanner(banner!._id, data, image),
    onSuccess: () => {
      toast({
        title: t("adminBanners.updateSuccess"),
        description: t("adminBanners.updateSuccessDescription"),
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t("adminBanners.createError"),
        description: t("adminBanners.updateErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      updateMutation.mutate({
        data: formData,
        image: selectedImage || undefined,
      });
    } else {
      createMutation.mutate({
        data: formData,
        image: selectedImage || undefined,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "ბანერის რედაქტირება" : "ახალი ბანერის შექმნა"}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        {error && (
          <div className="error-message">
            შეცდომა: {error.message || "უცნობი შეცდომა"}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">სათაური (ქართული) *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">სათაური (ინგლისური) *</label>
            <input
              type="text"
              name="titleEn"
              value={formData.titleEn}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">ღილაკის ტექსტი (ქართული) *</label>
            <input
              type="text"
              name="buttonText"
              value={formData.buttonText}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">ღილაკის ტექსტი (ინგლისური) *</label>
            <input
              type="text"
              name="buttonTextEn"
              value={formData.buttonTextEn}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">ღილაკის ლინკი *</label>
            <input
              type="url"
              name="buttonLink"
              value={formData.buttonLink}
              onChange={handleInputChange}
              className="form-input"
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">სურათი</label>
            <div className="file-input-container">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="file-input"
              />
              <label className="file-input-label">
                <Upload />
                {selectedImage ? selectedImage.name : "სურათის ატვირთვა"}
              </label>
            </div>

            {imagePreview && (
              <Image
                src={imagePreview}
                alt="Preview"
                width={200}
                height={120}
                className="image-preview"
              />
            )}

            {isEditing && banner?.imageUrl && !imagePreview && (
              <Image
                src={banner.imageUrl}
                alt="Current banner"
                width={200}
                height={120}
                className="current-image"
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">რიგითობა</label>
            <input
              type="number"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleInputChange}
              className="form-input"
              min="0"
            />
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label className="form-label">აქტიური</label>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              გაუქმება
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <HeartLoading size="small" inline={true} />
              ) : isEditing ? (
                "განახლება"
              ) : (
                "შექმნა"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
