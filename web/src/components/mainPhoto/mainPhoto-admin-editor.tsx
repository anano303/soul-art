"use client";

import React, { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Pencil, Plus, Trash2, Upload, X, Eye, EyeOff } from "lucide-react";
import {
  getAllHeroSlides,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/modules/admin/api/banner";
import { Banner, CreateBannerData } from "@/types/banner";
import { toast } from "@/hooks/use-toast";

interface Props {
  onSlidesChanged: () => void;
}

export default function MainPhotoAdminEditor({ onSlidesChanged }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [allSlides, setAllSlides] = useState<Banner[]>([]);
  const [editingSlide, setEditingSlide] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateBannerData>({
    title: "",
    titleEn: "",
    buttonText: "",
    buttonTextEn: "",
    buttonLink: "",
    imageUrl: "",
    isActive: true,
    sortOrder: 0,
    type: "hero",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAllSlides = useCallback(async () => {
    try {
      const response = await getAllHeroSlides();
      if (response.success && response.data) {
        setAllSlides(response.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const openEditor = () => {
    setEditorOpen(true);
    setEditingSlide(null);
    setIsCreating(false);
    fetchAllSlides();
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingSlide(null);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      titleEn: "",
      buttonText: "",
      buttonTextEn: "",
      buttonLink: "",
      imageUrl: "",
      isActive: true,
      sortOrder: 0,
      type: "hero",
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const startCreate = () => {
    setEditingSlide(null);
    setIsCreating(true);
    resetForm();
  };

  const startEdit = (slide: Banner) => {
    setEditingSlide(slide);
    setIsCreating(true);
    setFormData({
      title: slide.title,
      titleEn: slide.titleEn,
      buttonText: slide.buttonText || "",
      buttonTextEn: slide.buttonTextEn || "",
      buttonLink: slide.buttonLink || "",
      imageUrl: slide.imageUrl,
      isActive: slide.isActive,
      sortOrder: slide.sortOrder || 0,
      type: "hero",
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ნამდვილად გსურთ წაშლა?")) return;
    try {
      await deleteBanner(id);
      toast({ title: "სლაიდი წაიშალა" });
      fetchAllSlides();
      onSlidesChanged();
    } catch {
      toast({
        title: "შეცდომა",
        description: "წაშლა ვერ მოხერხდა",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide && !selectedImage) {
      toast({
        title: "შეცდომა",
        description: "აირჩიეთ სურათი",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      if (editingSlide) {
        await updateBanner(
          editingSlide._id,
          formData,
          selectedImage || undefined,
        );
        toast({ title: "სლაიდი განახლდა" });
      } else {
        await createBanner(formData, selectedImage!);
        toast({ title: "სლაიდი შეიქმნა" });
      }
      setIsCreating(false);
      setEditingSlide(null);
      resetForm();
      fetchAllSlides();
      onSlidesChanged();
    } catch {
      toast({
        title: "შეცდომა",
        description: "შენახვა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!editorOpen) {
    return (
      <button
        className="hero-admin-edit-btn"
        onClick={openEditor}
        aria-label="Edit hero slides"
      >
        <Pencil size={16} />
      </button>
    );
  }

  return (
    <div className="hero-editor-panel">
      <div className="hero-editor-header">
        <h3>Hero სლაიდები</h3>
        <button className="hero-editor-close" onClick={closeEditor}>
          <X size={18} />
        </button>
      </div>

      {!isCreating ? (
        <>
          <div className="hero-editor-list">
            {allSlides.length === 0 && (
              <p className="hero-editor-empty">სლაიდები არ არის</p>
            )}
            {allSlides.map((slide) => (
              <div key={slide._id} className="hero-editor-item">
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  width={80}
                  height={48}
                  className="hero-editor-thumb"
                />
                <div className="hero-editor-item-info">
                  <span className="hero-editor-item-title">
                    {slide.title}
                  </span>
                  <span
                    className={`hero-editor-item-status ${slide.isActive ? "active" : ""}`}
                  >
                    {slide.isActive ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                  </span>
                </div>
                <div className="hero-editor-item-actions">
                  <button
                    onClick={() => startEdit(slide)}
                    title="რედაქტირება"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(slide._id)}
                    title="წაშლა"
                    className="hero-editor-delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="hero-editor-add-btn" onClick={startCreate}>
            <Plus size={16} /> ახალი სლაიდი
          </button>
        </>
      ) : (
        <form className="hero-editor-form" onSubmit={handleSubmit}>
          <button
            type="button"
            className="hero-editor-back"
            onClick={() => {
              setIsCreating(false);
              setEditingSlide(null);
              resetForm();
            }}
          >
            ← უკან
          </button>

          <label>
            სათაური (ქა)
            <input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            სათაური (En)
            <input
              name="titleEn"
              value={formData.titleEn}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            ღილაკი (ქა)
            <input
              name="buttonText"
              value={formData.buttonText}
              onChange={handleInputChange}
              placeholder="არასავალდებულო"
            />
          </label>
          <label>
            ღილაკი (En)
            <input
              name="buttonTextEn"
              value={formData.buttonTextEn}
              onChange={handleInputChange}
              placeholder="არასავალდებულო"
            />
          </label>
          <label>
            ლინკი
            <input
              name="buttonLink"
              value={formData.buttonLink}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </label>
          <label>
            რიგი
            <input
              name="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={handleInputChange}
              min="0"
            />
          </label>
          <label className="hero-editor-checkbox">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleInputChange}
            />
            აქტიური
          </label>

          <div className="hero-editor-upload">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              hidden
            />
            <button
              type="button"
              className="hero-editor-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              {selectedImage ? selectedImage.name : "სურათი"}
            </button>
            {(imagePreview ||
              (editingSlide && editingSlide.imageUrl)) && (
              <Image
                src={imagePreview || editingSlide!.imageUrl}
                alt="Preview"
                width={100}
                height={60}
                className="hero-editor-preview"
              />
            )}
          </div>

          <button
            type="submit"
            className="hero-editor-save-btn"
            disabled={isSaving}
          >
            {isSaving
              ? "ინახება..."
              : editingSlide
                ? "განახლება"
                : "შექმნა"}
          </button>
        </form>
      )}
    </div>
  );
}
