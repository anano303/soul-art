"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import "./mainPhoto.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/types/role";
import SearchBox from "../SearchBox/search-box";
import BrushTrail from "../BrushTrail/BrushTrail";
import {
  getActiveHeroSlides,
  getAllHeroSlides,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/modules/admin/api/banner";
import { Banner, CreateBannerData } from "@/types/banner";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  {
    id: "68768f6f0b55154655a8e882",
    name: "ნახატები",
    nameEn: "Paintings",
    icon: "/loading.png",
  },
  {
    id: "68768f850b55154655a8e88f",
    name: "ხელნაკეთი",
    nameEn: "Handmade",
    icon: "/handmade.png",
  },
];

interface Slide {
  id: string;
  imageUrl: string;
  title?: string;
  titleEn?: string;
  buttonText?: string;
  buttonTextEn?: string;
  buttonLink?: string;
  isActive?: boolean;
}

const MainPhoto = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([
    { id: "default", imageUrl: "/van-gogh.webp" },
  ]);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Admin inline editor state
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

  const isAdmin = user?.role?.toLowerCase() === Role.Admin;

  const fetchActiveSlides = useCallback(async () => {
    try {
      const response = await getActiveHeroSlides();
      if (response.success && response.data && response.data.length > 0) {
        const heroSlides: Slide[] = response.data.map((b: Banner) => ({
          id: b._id,
          imageUrl: b.imageUrl,
          title: b.title,
          titleEn: b.titleEn,
          buttonText: b.buttonText,
          buttonTextEn: b.buttonTextEn,
          buttonLink: b.buttonLink,
        }));
        setSlides([
          { id: "default", imageUrl: "/van-gogh.webp" },
          ...heroSlides,
        ]);
      } else {
        setSlides([{ id: "default", imageUrl: "/van-gogh.webp" }]);
      }
    } catch {
      // Keep default
    }
  }, []);

  // Fetch hero slides from API
  useEffect(() => {
    fetchActiveSlides();
  }, [fetchActiveSlides]);

  // Fetch ALL slides (including inactive) for admin editor
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

  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide((index + totalSlides) % totalSlides);
    },
    [totalSlides],
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Auto-advance every 6s
  useEffect(() => {
    if (totalSlides <= 1 || editorOpen) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalSlides, editorOpen]);

  // Reset auto-play on manual navigation
  const handleNav = useCallback(
    (direction: "prev" | "next") => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (direction === "prev") prevSlide();
      else nextSlide();
      if (totalSlides > 1 && !editorOpen) {
        autoPlayRef.current = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % totalSlides);
        }, 6000);
      }
    },
    [prevSlide, nextSlide, totalSlides, editorOpen],
  );

  // --- Admin editor handlers ---
  const openEditor = () => {
    setEditorOpen(true);
    setEditingSlide(null);
    setIsCreating(false);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
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
      fetchActiveSlides();
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
      fetchActiveSlides();
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

  const currentSlideData = slides[currentSlide];
  const isDefaultSlide = currentSlideData.id === "default";

  return (
    <div className="home-container">
      <BrushTrail containerRef={heroRef} />
      <div className="main-hero-section" ref={heroRef}>
        {/* Slide images */}
        {slides.map((slide, index) => (
          <Image
            key={slide.id}
            src={slide.imageUrl}
            alt={slide.title || "SoulArt Hero"}
            fill
            priority={index === 0}
            quality={75}
            sizes="100vw"
            className={`hero-slide-img ${index === currentSlide ? "hero-slide-active" : ""}`}
          />
        ))}

        <div className="hero-bg-overlay" />

        {/* Content: default slide shows main text, hero slides show their own */}
        <div className="hero-text">
          {isDefaultSlide ? (
            <>
              <h1>{t("home.heroTitle")}</h1>
              <p>{t("home.heroSubtitle")}</p>
            </>
          ) : (
            <>
              <h1>
                {language === "en"
                  ? currentSlideData.titleEn
                  : currentSlideData.title}
              </h1>
              {currentSlideData.buttonText && currentSlideData.buttonLink && (
                <Link
                  href={currentSlideData.buttonLink}
                  className="hero-slide-cta"
                >
                  {language === "en"
                    ? currentSlideData.buttonTextEn
                    : currentSlideData.buttonText}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Category buttons - only on default slide */}
        {isDefaultSlide && (
          <div className="hero-category-buttons">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?page=1&mainCategory=${cat.id}`}
                className="hero-cat-btn"
              >
                <Image
                  src={cat.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="hero-cat-icon"
                />
                {language === "en" ? cat.nameEn : cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Search box - always visible */}
        <div className="search-box">
          <SearchBox />
        </div>

        {/* Arrows - only if multiple slides */}
        {totalSlides > 1 && (
          <>
            <button
              className="hero-arrow hero-arrow-left"
              onClick={() => handleNav("prev")}
              aria-label="Previous slide"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              className="hero-arrow hero-arrow-right"
              onClick={() => handleNav("next")}
              aria-label="Next slide"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Dots - only if multiple slides */}
        {totalSlides > 1 && (
          <div className="hero-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`hero-dot ${index === currentSlide ? "hero-dot-active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Admin edit button - left side */}
        {isAdmin && !editorOpen && (
          <button
            className="hero-admin-edit-btn"
            onClick={openEditor}
            aria-label="Edit hero slides"
          >
            <Pencil size={16} />
          </button>
        )}

        {/* Inline admin editor panel */}
        {isAdmin && editorOpen && (
          <div className="hero-editor-panel">
            <div className="hero-editor-header">
              <h3>Hero სლაიდები</h3>
              <button className="hero-editor-close" onClick={closeEditor}>
                <X size={18} />
              </button>
            </div>

            {!isCreating ? (
              <>
                {/* Slide list */}
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
              /* Create / Edit form */
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
        )}
      </div>
    </div>
  );
};

export default MainPhoto;
