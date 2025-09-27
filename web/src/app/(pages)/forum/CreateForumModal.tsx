"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";
import "./CreateForumModal.css";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";

// Tag mapping for translation (frontend tag keys -> backend tags)
const TAG_MAPPING = {
  handmade: "ხელნაკეთი ნივთები",
  paintings: "ნახატები",
  other: "სხვა",
};

// Tag keys for translation
const TAG_KEYS = Object.keys(TAG_MAPPING) as Array<keyof typeof TAG_MAPPING>;

interface CreateForumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateForumModal = ({ isOpen, onClose }: CreateForumModalProps) => {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Helper function to validate tags and convert to backend format
  const prepareTagsForBackend = (tags: string[]) => {
    if (tags.length === 0) {
      throw new Error("Tags should not be empty");
    }

    // Convert frontend tag keys to backend tags
    const backendTags = tags.map(
      (tag) => TAG_MAPPING[tag as keyof typeof TAG_MAPPING]
    );

    const uniqueTags = new Set(backendTags);
    if (uniqueTags.size !== backendTags.length) {
      throw new Error("All tags' elements must be unique");
    }

    return Array.from(uniqueTags);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      try {
        // Prepare tags for backend
        const backendTags = prepareTagsForBackend(tags);

        if (image) {
          // Compress the image before uploading
          const compressedImage = await imageCompression(image, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append("content", content);
          backendTags.forEach((tag, index) => {
            formData.append(`tags[${index}]`, tag);
          });
          formData.append("file", compressedImage);

          // Using apiClient for FormData
          const response = await apiClient.post("/forums", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          return response.data;
        } else {
          // Using apiClient for JSON
          const response = await apiClient.post("/forums", {
            content,
            tags: backendTags,
          });

          return response.data;
        }
      } catch (error) {
        console.error("❌ Mutation Error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({ title: "Success", description: "Post created successfully" });
      onClose();
      setContent("");
      setTags([]);
      setImage(null);
      setError(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setError(error.message);
    },
  });

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTag = e.target.value;
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setSelectedTag(""); // Reset the selected tag after adding
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setImage(null);
      return;
    }

    console.log("Selected file:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    });

    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image.heic",
      "image.heif",
    ];
    if (
      !supportedTypes.includes(file.type.toLowerCase()) &&
      !file.type.toLowerCase().startsWith("image/")
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unsupported file type. Please upload an image file.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File size should not exceed 10MB",
      });
      return;
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
        alwaysKeepResolution: true,
        initialQuality: 0.8,
      });

      console.log("Compressed file:", {
        type: compressedFile.type,
        size: `${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB`,
      });

      setImage(compressedFile);
    } catch (error) {
      console.error("Image compression error:", error);
      if (file.size <= 2 * 1024 * 1024) {
        setImage(file);
        toast({
          title: "Information",
          description: "Using original image as compression failed",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to process the image. Please try another image.",
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{t("forum.newPost")}</h2>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("forum.writePostContent")}
          className="content-input"
        />

        <div className="tags-input">
          <select
            value={selectedTag}
            onChange={handleTagChange}
            disabled={tags.length >= 3}
          >
            <option value="" disabled>
              {t("forum.selectTag")}
            </option>
            {TAG_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`forum.tags.${key}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="tags-list">
          {tags.map((tagKey) => (
            <span key={tagKey} className="tag">
              {t(`forum.tags.${tagKey}`)}
              <button onClick={() => handleRemoveTag(tagKey)}>×</button>
            </span>
          ))}
        </div>

        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          className="file-input"
        />

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button
            onClick={() => createMutation.mutate()}
            disabled={!content.trim() || createMutation.isPending}
            className="create-button"
          >
            {createMutation.isPending ? t("forum.creating") : t("forum.create")}
          </button>
          <button onClick={onClose} className="cancel-button">
            {t("forum.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateForumModal;
