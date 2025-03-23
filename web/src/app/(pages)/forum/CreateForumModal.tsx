"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';
import "./CreateForumModal.css";

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

        let body;
        const headers: HeadersInit = {};

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
            formData.append(`tags[${index}]`, tag); // Append each tag as a separate entry
          });
          formData.append("file", compressedImage);

          body = formData;
        } else {
          // Send as JSON when there's no file
          body = JSON.stringify({ content, tags: validatedTags });
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/forums`,
          {
            method: "POST",
            headers,
            body,
            credentials: "include",
          }
        );
        if (!response.ok) {
          const error = await response.json();
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
    if (file && file.size > 5 * 1024 * 1024) { // Check if file size is greater than 5MB
      toast({
        variant: "destructive",
        title: "Error",
        description: "File size should not exceed 5MB",
      });
      return;
    }
    if (file) {
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5, // Reduce max size to 0.5MB
          maxWidthOrHeight: 1280, // Reduce max dimensions to 1280px
          useWebWorker: true,
        });
        if (compressedFile.size > 5 * 1024 * 1024) { // Check if compressed file size is greater than 5MB
          toast({
            variant: "destructive",
            title: "Error",
            description: "Compressed file size should not exceed 5MB",
          });
          return;
        }
        setImage(compressedFile);
      } catch (error) {
        console.log(error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to compress image",
        });
      }
    } else {
      setImage(null);
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
