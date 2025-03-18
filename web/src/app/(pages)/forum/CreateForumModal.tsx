"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import "./CreateForumModal.css";

const validTags = ["Fishing", "Camping", "Hunting"]; // Valid tags defined by the backend

interface CreateForumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateForumModal = ({ isOpen, onClose }: CreateForumModalProps) => {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState(""); // Track selected tag from dropdown
  const [image, setImage] = useState<File | null>(null);
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

    // Ensure tags are valid (Fishing, Camping, or Hunting)
    tags.forEach((tag) => {
      if (!validTags.includes(tag)) {
        throw new Error(
          `Tag '${tag}' is not valid. Valid tags are: Fishing, Camping, Hunting`
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

        let body;
        const headers: HeadersInit = {
          "Content-Type": "multipart/form-data",
        };

        if (image) {
          const formData = new FormData();
          formData.append("content", content);
          validatedTags.forEach((tag, index) => {
            formData.append(`tags[${index}]`, tag); // Append each tag as a separate entry
          }); // ✅ აქ JSON.stringify სწორია
          formData.append("file", image);

          // ✅ დამატებითი ლოგირება
          console.log("✅ FormData before sending:");
          formData.forEach((value, key) => {
            console.log(`📦 ${key}:`, value);
          });

          for (const pair of formData.entries()) {
            console.log("📦 FormData Entry:", pair[0], pair[1]);
          }

          body = formData;
          delete headers["Content-Type"]; // Let browser set multipart headers
        } else {
          // Send as JSON when there's no file
          body = JSON.stringify({ content, tags: validatedTags });
        }
        console.log("🚀 Sending request with body:", body);
        console.log("🔍 Headers:", headers);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/forums`,
          {
            method: "POST",
            headers,
            body,
            credentials: "include",
          }
        );
        console.log("🌍 Response status:", response.status);
        if (!response.ok) {
          const error = await response.json();
          console.log("❌ API Error Response:", error);
          throw new Error(error.message || "Failed to create post");
        }

        return response.json();
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
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleAddTag = () => {
    if (selectedTag && !tags.includes(selectedTag)) {
      setTags([...tags, selectedTag]);
      setSelectedTag(""); // Reset the selected tag after adding
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
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
            onChange={(e) => setSelectedTag(e.target.value)}
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
          <button onClick={handleAddTag} disabled={!selectedTag}>
            დამატება
          </button>
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
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          accept="image/*"
          className="file-input"
        />

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
