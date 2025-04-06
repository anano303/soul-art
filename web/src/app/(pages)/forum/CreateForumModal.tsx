"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';
import "./CreateForumModal.css";
import { apiClient } from "@/lib/api-client";

const validTags = [
  "პეიზაჟი",
  "პორტრეტი",
  "აბსტრაქცია",
  "შავ-თეთრი",
  "ანიმაციური",
  "ციფრული ილუსტრაციები",
  "სხვა",
]; // Valid tags defined by the backend

interface CreateForumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateForumModal = ({ isOpen, onClose }: CreateForumModalProps) => {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState(""); // Track selected tag from dropdown
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Helper function to validate tags
  const validateTags = (tags: string[]) => {
    if (tags.length === 0) {
      throw new Error("Tags should not be empty");
    }
    const uniqueTags = new Set(tags);
    if (uniqueTags.size !== tags.length) {
      throw new Error("All tags' elements must be unique");
    }

    // Ensure tags are valid
    tags.forEach((tag) => {
      if (!validTags.includes(tag)) {
        throw new Error(
          `Tag '${tag}' is not valid. Valid tags are: პეიზაჟი,პორტრეტი,აბსტრაქცია,შავ-თეთრი,ანიმაციური,ციფრული ილუსტრაციები,სხვა`
        );
      }
    });

    return Array.from(uniqueTags); // Return unique tags as array
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      try {
        // Validate tags before sending
        const validatedTags = validateTags(tags);

        if (image) {
          // Compress the image before uploading
          const compressedImage = await imageCompression(image, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append("content", content);
          validatedTags.forEach((tag, index) => {
            formData.append(`tags[${index}]`, tag);
          });
          formData.append("file", compressedImage);

          // Using apiClient for FormData
          const response = await apiClient.post("/forums", formData, {
            headers: {
              'Content-Type': 'multipart/form-data' // Override the default content type
            }
          });

          return response.data;
        } else {
          // Using apiClient for JSON
          const response = await apiClient.post("/forums", { 
            content, 
            tags: validatedTags 
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
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    });

    // Check file type - support more image formats
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!supportedTypes.includes(file.type.toLowerCase()) && !file.type.toLowerCase().startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unsupported file type. Please upload an image file.",
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // Increase max size to 10MB before compression
      toast({
        variant: "destructive",
        title: "Error",
        description: "File size should not exceed 10MB",
      });
      return;
    }
    
    try {
      // More permissive compression options
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1, // Target 1MB after compression
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg", // Convert all images to JPEG for better compatibility
        alwaysKeepResolution: true,
        initialQuality: 0.8, // Start with higher quality
      });
      
      console.log("Compressed file:", {
        type: compressedFile.type,
        size: `${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB`
      });
      
      setImage(compressedFile);
    } catch (error) {
      console.error("Image compression error:", error);
      // If compression fails, try using the original file if it's not too large
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
        <h2>ახალი პოსტის შექმნა</h2>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="დაწერეთ პოსტის შინაარსი..."
          className="content-input"
        />

        {/* Tag selection with dropdown */}
        <div className="tags-input">
          <select
            value={selectedTag}
            onChange={handleTagChange}
            disabled={tags.length >= 3} // Disable if 3 tags are already selected
          >
            <option value="" disabled>
              Select a tag
            </option>
            {validTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="tags-list">
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button onClick={() => handleRemoveTag(tag)}>×</button>
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
            {createMutation.isPending ? "იქმნება..." : "შექმნა"}
          </button>
          <button onClick={onClose} className="cancel-button">
            გაუქმება
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateForumModal;
