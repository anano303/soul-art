"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllHeroSlides, deleteBanner } from "../api/banner";
import { Banner } from "@/types/banner";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { toast } from "@/hooks/use-toast";
import { HeroSlideModal } from "./hero-slide-modal";
import "./banner-list.css";

export function HeroSlideList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Banner | null>(null);

  const {
    data: slides,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["heroSlides"],
    queryFn: getAllHeroSlides,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heroSlides"] });
      toast({ title: "სლაიდი წაიშალა" });
    },
    onError: () => {
      toast({
        title: "შეცდომა",
        description: "სლაიდის წაშლა ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (slide: Banner) => {
    setEditingSlide(slide);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ამ სლაიდის წაშლა?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    setEditingSlide(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSlide(null);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <HeartLoading size="medium" />
      </div>
    );
  }

  if (error || !slides?.success) {
    return (
      <div className="error-message">
        შეცდომა სლაიდების ჩატვირთვისას: {slides?.error || "უცნობი შეცდომა"}
      </div>
    );
  }

  return (
    <div className="banner-admin-container">
      <div className="banner-admin-header">
        <h1 className="banner-admin-title">Hero სლაიდების მართვა</h1>
        <button className="create-banner-btn" onClick={handleCreateNew}>
          <Plus className="banner-icon" />
          ახალი სლაიდი
        </button>
      </div>

      <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
        პირველი სლაიდი ყოველთვის არის van-gogh სურათი. აქ დამატებული სლაიდები
        გამოჩნდება მის შემდეგ.
      </p>

      {slides.data && slides.data.length > 0 ? (
        <table className="banner-table">
          <thead className="banner-thead-row">
            <tr>
              <th className="banner-th">სურათი</th>
              <th className="banner-th">სათაური</th>
              <th className="banner-th">ლინკი</th>
              <th className="banner-th">რიგი</th>
              <th className="banner-th">სტატუსი</th>
              <th className="banner-th">მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {slides.data.map((slide) => (
              <tr key={slide._id} className="banner-tr">
                <td className="banner-td">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    width={120}
                    height={70}
                    className="banner-image"
                    style={{ objectFit: "cover", borderRadius: 6 }}
                  />
                </td>
                <td className="banner-td">
                  <div>
                    <div>{slide.title}</div>
                    <div style={{ fontSize: "0.8em", color: "#666" }}>
                      {slide.titleEn}
                    </div>
                  </div>
                </td>
                <td className="banner-td">
                  {slide.buttonLink ? (
                    <a
                      href={slide.buttonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#cf0a0a", textDecoration: "none" }}
                    >
                      {slide.buttonLink}
                    </a>
                  ) : (
                    <span style={{ color: "#999" }}>—</span>
                  )}
                </td>
                <td className="banner-td">{slide.sortOrder}</td>
                <td className="banner-td">
                  <span
                    className={`banner-status ${slide.isActive ? "active" : "inactive"}`}
                  >
                    {slide.isActive ? (
                      <>
                        <Eye className="banner-icon" />
                        აქტიური
                      </>
                    ) : (
                      <>
                        <EyeOff className="banner-icon" />
                        არააქტიური
                      </>
                    )}
                  </span>
                </td>
                <td className="banner-td">
                  <div className="banner-actions">
                    <button
                      className="banner-btn"
                      onClick={() => handleEdit(slide)}
                      title="რედაქტირება"
                    >
                      <Pencil className="banner-icon" />
                    </button>
                    <button
                      className="banner-btn banner-btn-danger"
                      onClick={() => handleDelete(slide._id)}
                      title="წაშლა"
                    >
                      <Trash2 className="banner-icon" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#666",
          }}
        >
          <p>ჯერ არ არის დამატებული Hero სლაიდი.</p>
          <p style={{ fontSize: 14 }}>
            დააჭირეთ &quot;ახალი სლაიდი&quot; ღილაკს დასამატებლად.
          </p>
        </div>
      )}

      {isModalOpen && (
        <HeroSlideModal
          banner={editingSlide}
          onClose={handleCloseModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["heroSlides"] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}
