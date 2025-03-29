"use client";

import { useState } from "react";
import "./ForumPost.css";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import imageCompression from "browser-image-compression";

interface Comment {
  id: string;
  text: string;
  author: {
    name: string;
    _id: string;
    avatar: string;
  };
  parentId?: string;
  replies?: string[];
}

interface PostProps {
  id: string;
  image: string;
  text: string;
  category: string[];
  author: {
    name: string;
    _id: string;
    avatar: string;
    role: string;
  };
  currentUser?: {
    _id: string;
    role: string;
    name?: string;
  };
  comments: Comment[];
  time: string;
  likes: number;
  isLiked: boolean;
  isAuthorized: boolean;
  canModify: boolean;
}

const ForumPost = ({
  id,
  image,
  text,
  category,
  author,
  currentUser,
  comments,
  time,
  likes,
  isLiked,
  isAuthorized,
}: PostProps) => {
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedPostText, setEditedPostText] = useState(text);
  const [editedPostImage, setEditedPostImage] = useState<File | null>(null);
  const [editedPostTags, setEditedPostTags] = useState<string[]>(category);
  const queryClient = useQueryClient();

  const [likesCount, setLikes] = useState(likes);
  const [userLiked, setIsLiked] = useState(isLiked);
  const [showComments, setShowComments] = useState(false);
  const [replyInputVisible, setReplyInputVisible] = useState<{
    [key: string]: boolean;
  }>({});
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const [error, setError] = useState<string | null>(null);

  console.log("Current User:", currentUser);
  console.log("Author:", author);
  console.log("Is Authorized:", isAuthorized);

  const isPostAuthor = currentUser?._id === author._id;
  const isAdmin = currentUser?.role === "admin";
  const canModifyPost = isPostAuthor || isAdmin;

  console.log("Is Post Author:", isPostAuthor);
  console.log("Is Admin:", isAdmin);
  console.log("Can Modify Post:", canModifyPost);

  const replyMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const response = await fetchWithAuth(`/forums/add-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "forum-id": id,
        },
        credentials: "include",
        body: JSON.stringify({
          commentId,
          content,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add reply");
      }
      return response.json();
    },
    onSuccess: () => {
      setReplyText({});
      setReplyInputVisible({});
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({
        title: "Success",
        description: "Reply added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetchWithAuth(
        `/forums/delete-comment/${commentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "forum-id": id,
          },
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({
        title: "წარმატება",
        description: "კომენტარი წარმატებით წაიშალა",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message,
      });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      console.log("Editing comment with data:", {
        commentId,
        content,
        currentUser,
        forumId: id,
      });

      const response = await fetchWithAuth(
        `/forums/edit-comment/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "forum-id": id,
          },
          credentials: "include",
          body: JSON.stringify({
            content,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to edit comment");
      }
      return response.json();
    },
    onSuccess: () => {
      setEditingComment(null);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({
        title: "წარმატება",
        description: "კომენტარი წარმატებით განახლდა",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message,
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithAuth(`/forums/add-comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "forum-id": id,
        },
        credentials: "include",
        body: JSON.stringify({
          content: newComment,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const endpoint = userLiked ? "remove-like" : "add-like";
      const response = await fetchWithAuth(`/forums/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "forum-id": id,
        },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to update like");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forums"] });

      if (data?.likes !== undefined) {
        setLikes(data.likes);
        setIsLiked(!userLiked);
      } else {
        setLikes((prev) => (userLiked ? prev - 1 : prev + 1));
        setIsLiked(!userLiked);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const validTags = [
    "პეიზაჟი",
    "პორტრეტი",
    "აბსტრაქცია",
    "შავ-თეთრი",
    "ანიმაციური",
    "ციფრული ილუსტრაციები",
    "სხვა",
  ];

  const editPostMutation = useMutation({
    mutationFn: async ({ text, tags, image }: { text: string; tags: string[]; image: File | null }) => {
      const formData = new FormData();
      formData.append("content", text);
      tags.forEach((tag, index) => {
        formData.append(`tags[${index}]`, tag);
      });
      if (image) {
        formData.append("file", image);
      }

      console.log("FormData before sending:", Array.from(formData.entries())); // Log FormData entries

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forums/${id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        console.error("Edit post error:", error); // Log error response
        throw new Error(error.message || "Failed to edit post");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsEditingPost(false);
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({
        title: "წარმატება",
        description: "პოსტი წარმატებით განახლდა",
      });
      setError(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message,
      });
      setError(error.message);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithAuth(`/forums/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forums"] });
      toast({
        title: "წარმატება",
        description: "პოსტი წარმატებით წაიშალა",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message,
      });
    },
  });

  const handleLike = () => {
    if (!isAuthorized) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please login to like posts",
      });
      return;
    }
    likeMutation.mutate();
  };

  const toggleReplyInput = (commentId: string) => {
    setReplyInputVisible((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleReplyChange = (commentId: string, text: string) => {
    setReplyText((prev) => ({ ...prev, [commentId]: text }));
  };

  const handleReplySubmit = (commentId: string) => {
    const content = replyText[commentId];
    if (!content?.trim()) return;

    replyMutation.mutate({ commentId, content });
  };

  const handleEditSubmit = (commentId: string) => {
    if (!editText.trim()) return;
    editCommentMutation.mutate({ commentId, content: editText });
  };

  const handlePostEdit = () => {
    if (!editedPostText.trim()) return;
    console.log("Editing post with data:", {
      postId: id,
      currentUser,
      author,
      isPostAuthor,
      canModifyPost,
      editedPostText,
      editedPostTags,
      editedPostImage,
    });
    editPostMutation.mutate({ text: editedPostText, tags: editedPostTags, image: editedPostImage });
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTag = e.target.value;
    if (newTag && !editedPostTags.includes(newTag)) {
      setEditedPostTags([...editedPostTags, newTag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedPostTags(editedPostTags.filter((tag) => tag !== tagToRemove));
  };

  const handleEditedFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setEditedPostImage(compressedFile);
      } catch (error) {
      console.log(error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to compress image",
        });
      }
    } else {
      setEditedPostImage(null);
    }
  };

  const renderComment = (comment: Comment, level = 0) => {
    const isCommentAuthor = currentUser?._id === comment.author._id;
    const canModifyComment = isCommentAuthor || isAdmin;

    console.log("Comment:", comment);
    console.log("Is Comment Author:", isCommentAuthor);
    console.log("Can Modify Comment:", canModifyComment);

    return (
      <div
        key={comment.id}
        className="comment-item"
        style={{ marginLeft: `${level * 20}px` }}
      >
        <div className="comment-header">
          <Image
            src={comment.author.avatar}
            alt={comment.author.name}
            width={25}
            height={25}
            className="comment-avatar"
          />
          <span className="comment-author">{comment.author.name}</span>
        </div>

        {editingComment === comment.id ? (
          <div className="edit-comment-section">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="edit-comment-input"
            />
            <button onClick={() => handleEditSubmit(comment.id)}>
              შენახვა
            </button>
            <button onClick={() => setEditingComment(null)}>გაუქმება</button>
          </div>
        ) : (
          <>
            <p className="comment-text">{comment.text}</p>

            <div className="comment-actions">
              {isAuthorized && (
                <button
                  className="reply-button"
                  onClick={() => toggleReplyInput(comment.id)}
                >
                  პასუხი
                </button>
              )}
              {canModifyComment && (
                <>
                  <button
                    className="edit-button"
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditText(comment.text);
                    }}
                  >
                    რედაქტირება
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                  >
                    წაშლა
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {replyInputVisible[comment.id] && (
          <div className="reply-section">
            <input
              type="text"
              value={replyText[comment.id] || ""}
              onChange={(e) => handleReplyChange(comment.id, e.target.value)}
              placeholder="დაწერეთ პასუხი..."
            />
            <button onClick={() => handleReplySubmit(comment.id)}>
              გაგზავნა
            </button>
          </div>
        )}

        {comments
          .filter((reply) => reply.parentId === comment.id)
          .map((reply) => renderComment(reply, level + 1))}
      </div>
    );
  };

  return (
    <div className="forum-post">
      <Image
        src={image}
        alt="post image"
        width={150}
        height={100}
        className="forum-post-image"
      />
      <div className="forum-post-content">
        <div className="forum-post-author">
          <Image
            src={author.avatar}
            alt={`${author.name}'s avatar`}
            width={30}
            height={30}
            className="forum-post-avatar"
          />
          <span className="forum-post-author-name">{author.name}</span>
          {isAuthorized && canModifyPost && (
            <div className="post-actions">
              <button
                className="edit-button"
                onClick={() => setIsEditingPost(true)}
              >
                ✏️ რედაქტირება
              </button>
              <button
                className="delete-button"
                onClick={() => deletePostMutation.mutate()}
              >
                🗑️ წაშლა
              </button>
            </div>
          )}
        </div>

        {isEditingPost ? (
          <div className="edit-post-section">
            <textarea
              value={editedPostText}
              onChange={(e) => setEditedPostText(e.target.value)}
              className="edit-post-input"
            />
            <div className="tags-input">
              <select
                value=""
                onChange={handleTagChange}
                disabled={editedPostTags.length >= 3}
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
              {editedPostTags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}>×</button>
                </span>
              ))}
            </div>
            {editedPostImage ? (
              <div className="current-image">
                <Image
                  src={URL.createObjectURL(editedPostImage)}
                  alt="current post image"
                  width={150}
                  height={100}
                />
              </div>
            ) : (
              <div className="current-image">
                <Image
                  src={image}
                  alt="current post image"
                  width={150}
                  height={100}
                />
              </div>
            )}
            <input
              type="file"
              onChange={handleEditedFileChange}
              accept="image/*"
              className="file-input"
            />
            {error && <div className="error-message">{error}</div>}
            <div className="edit-post-buttons">
              <button onClick={handlePostEdit}>შენახვა</button>
              <button
                onClick={() => {
                  setIsEditingPost(false);
                  setEditedPostText(text);
                  setEditedPostTags(category);
                  setEditedPostImage(null);
                }}
              >
                გაუქმება
              </button>
            </div>
          </div>
        ) : (
          <p className="forum-post-text">{text}</p>
        )}

        <div className="forum-post-footer">
          <div className="forum-post-categories">
            {category.map((cat, index) => (
              <span key={index} className="forum-post-category">
                {cat}
              </span>
            ))}
          </div>
          <span className="forum-post-time">{time}</span>
          <span
            className="forum-post-comments"
            onClick={() => setShowComments(!showComments)}
          >
            💬 {comments.length}
          </span>
          <button
            className={`forum-post-favorite ${userLiked ? "favorited" : ""}`}
            onClick={handleLike}
            disabled={!isAuthorized || likeMutation.isPending}
          >
            {likesCount} {userLiked ? "👍" : "👍🏻"}
          </button>
        </div>

        {showComments && (
          <div className="forum-comments">
            {comments
              .filter((comment) => !comment.parentId)
              .map((comment) => renderComment(comment))}
          </div>
        )}

        {isAuthorized && (
          <div className="main-comment-container">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="main-comment-input"
              placeholder="Write a comment..."
            />
            <button
              onClick={() => commentMutation.mutate()}
              disabled={!newComment.trim() || commentMutation.isPending}
            >
              {commentMutation.isPending ? "Posting..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumPost;
