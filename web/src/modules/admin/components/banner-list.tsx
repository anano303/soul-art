"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBanners, deleteBanner } from "../api/banner";
import { Banner } from "@/types/banner";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";

import "./banner-list.css";
import { BannerModal } from "./banner-modal";

export function BannerList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const queryClient = useQueryClient();

  const {
    data: banners,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["banners"],
    queryFn: getBanners,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      toast({
        title: "✅ ბანერი წაიშალა!",
        description: "ბანერი წარმატებით წაიშალა.",
      });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: (error) => {
      toast({
        title: "❌ შეცდომა",
        description: "ბანერის წაშლისას მოხდა შეცდომა. სცადეთ ხელახლა.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ამ ბანერის წაშლა?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <HeartLoading size="medium" />
      </div>
    );
  }

  if (error || !banners?.success) {
    return (
      <div className="error-message">
        შეცდომა ბანერების ჩატვირთვისას: {banners?.error || "უცნობი შეცდომა"}
      </div>
    );
  }

  return (
    <div className="banner-admin-container">
      <div className="banner-admin-header">
        <h1 className="banner-admin-title">ბანერების მართვა</h1>
        <button className="create-banner-btn" onClick={handleCreateNew}>
          <Plus className="banner-icon" />
          ახალი ბანერი
        </button>
      </div>

      {banners.data && banners.data.length > 0 ? (
        <table className="banner-table">
          <thead className="banner-thead-row">
            <tr>
              <th className="banner-th">სურათი</th>
              <th className="banner-th">სათაური</th>
              <th className="banner-th">ღილაკი</th>
              <th className="banner-th">ლინკი</th>
              <th className="banner-th">სტატუსი</th>
              <th className="banner-th">მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {banners.data.map((banner) => (
              <tr key={banner._id} className="banner-tr">
                <td className="banner-td">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    width={80}
                    height={50}
                    className="banner-image"
                  />
                </td>
                <td className="banner-td">
                  <div>
                    <div>{banner.title}</div>
                    <div style={{ fontSize: "0.8em", color: "#666" }}>
                      {banner.titleEn}
                    </div>
                  </div>
                </td>
                <td className="banner-td">
                  <div>
                    <div>{banner.buttonText}</div>
                    <div style={{ fontSize: "0.8em", color: "#666" }}>
                      {banner.buttonTextEn}
                    </div>
                  </div>
                </td>
                <td className="banner-td">
                  <a
                    href={banner.buttonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#cf0a0a", textDecoration: "none" }}
                  >
                    {banner.buttonLink}
                  </a>
                </td>
                <td className="banner-td">
                  <span
                    className={`banner-status ${
                      banner.isActive ? "active" : "inactive"
                    }`}
                  >
                    {banner.isActive ? (
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
                      onClick={() => handleEdit(banner)}
                      title="რედაქტირება"
                    >
                      <Pencil className="banner-icon" />
                    </button>
                    <button
                      className="banner-btn banner-btn-danger"
                      onClick={() => handleDelete(banner._id)}
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
        <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
          ბანერები არ მოიძებნა
        </div>
      )}

      {isModalOpen && (
        <BannerModal
          banner={editingBanner}
          onClose={handleCloseModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["banners"] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}
