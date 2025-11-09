"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";
import { User } from "@/types";
import "./blog-list.css";

interface BlogPost {
  _id: string;
  title: string;
  titleEn: string;
  artist: string;
  artistEn: string;
  author?: string;
  authorEn?: string;
  coverImage: string;
  publishDate: string;
  isPublished: boolean;
  createdById?: string;
  authorId?: string;
  authorEmail?: string;
  ownerId?: string;
  createdByEmail?: string;
  createdBy?: {
    _id?: string;
    id?: string;
    userId?: string;
    authorId?: string;
    username?: string;
    email?: string;
    name?: string;
  } | null;
}

export function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return getUserData();
  });
  const [userRole, setUserRole] = useState<Role | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return getUserData()?.role ?? null;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userData = getUserData();
    setCurrentUser(userData ?? null);
    setUserRole(userData?.role ?? null);
  }, []);

  const isAdmin = userRole === Role.Admin;
  const isBlogger = userRole === Role.Blogger;
  const canCreatePosts = isAdmin || isBlogger;

  const isPostOwner = (post: BlogPost) => {
    if (!currentUser) return false;

    const normalize = (value: unknown) => {
      if (value === undefined || value === null) {
        return "";
      }
      return String(value);
    };

    const userIdCandidates = [
      post.createdById,
      post.authorId,
      post.ownerId,
      post.createdBy?._id,
      post.createdBy?.id,
      post.createdBy?.userId,
      post.createdBy?.authorId,
    ]
      .filter(Boolean)
      .map((candidate) => normalize(candidate));

    if (
      currentUser._id &&
      userIdCandidates.some((candidate) => candidate === currentUser._id)
    ) {
      return true;
    }

    const emailCandidates = [
      post.createdBy?.email,
      post.authorEmail,
      post.createdByEmail,
    ]
      .filter(Boolean)
      .map((candidate) => normalize(candidate).toLowerCase());

    if (
      currentUser.email &&
      emailCandidates.includes(currentUser.email.toLowerCase())
    ) {
      return true;
    }

    return false;
  };

  const canEditPost = (post: BlogPost) =>
    isAdmin || (isBlogger && isPostOwner(post));

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const queryParam =
        filter === "all" ? "" : `?published=${filter === "published"}`;
      const response = await fetchWithAuth(`/blog${queryParam}`);

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      } else {
        toast.error("ბლოგ პოსტების ჩატვირთვა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      toast.error("შეცდომა მოხდა");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error("არ გაქვთ პოსტის წაშლის უფლება");
      return;
    }

    if (!confirm("დარწმუნებული ხართ რომ გსურთ ამ პოსტის წაშლა?")) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/blog/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("პოსტი წარმატებით წაიშალა");
        fetchPosts();
      } else {
        toast.error("პოსტის წაშლა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("შეცდომა მოხდა");
    }
  };

  const handleTogglePublish = async (id: string) => {
    if (!isAdmin) {
      toast.error("გამოქვეყნების შეცვლა მხოლოდ ადმინს შეუძლია");
      return;
    }

    try {
      const response = await fetchWithAuth(`/blog/${id}/toggle-publish`, {
        method: "PUT",
      });

      if (response.ok) {
        toast.success("სტატუსი შეიცვალა");
        fetchPosts();
      } else {
        toast.error("სტატუსის შეცვლა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("შეცდომა მოხდა");
    }
  };

  if (loading) {
    return <div className="loading">იტვირთება...</div>;
  }

  return (
    <div className="blog-admin-container">
      <div className="blog-admin-header">
        <h1>ბლოგის მართვა</h1>
        {canCreatePosts && (
          <Link href="/admin/blog/create" className="btn-create">
            <Plus size={20} />
            ახალი პოსტი
          </Link>
        )}
      </div>

      <div className="blog-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          ყველა ({posts.length})
        </button>
        <button
          className={`filter-btn ${filter === "published" ? "active" : ""}`}
          onClick={() => setFilter("published")}
        >
          გამოქვეყნებული
        </button>
        <button
          className={`filter-btn ${filter === "draft" ? "active" : ""}`}
          onClick={() => setFilter("draft")}
        >
          დრაფტი
        </button>
      </div>

      <div className="blog-posts-grid">
        {posts.map((post) => (
          <div key={post._id} className="blog-post-card">
            <div className="post-image">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                style={{ objectFit: "cover" }}
              />
              <div className="post-status">
                {post.isPublished ? (
                  <span className="status-badge published">
                    <Eye size={14} />
                    გამოქვეყნებული
                  </span>
                ) : (
                  <span className="status-badge draft">
                    <EyeOff size={14} />
                    დრაფტი
                  </span>
                )}
              </div>
            </div>

            <div className="post-content">
              <div className="post-meta">
                <span className="post-date">
                  <Calendar size={14} />
                  {new Date(post.publishDate).toLocaleDateString("ka-GE")}
                </span>
              </div>

              <h3 className="post-title">{post.title}</h3>
              {post.artist && (
                <p className="post-artist">მხატვარი: {post.artist}</p>
              )}
              <p className="post-author">
                ავტორი:{" "}
                {post.author ||
                  post.createdBy?.name ||
                  post.createdBy?.username ||
                  "უცნობი"}
              </p>

              <div className="post-actions">
                {canEditPost(post) && (
                  <Link
                    href={`/admin/blog/${post._id}/edit`}
                    className="btn-action btn-edit"
                  >
                    <Edit size={16} />
                    რედაქტირება
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleTogglePublish(post._id)}
                      className="btn-action btn-toggle"
                    >
                      {post.isPublished ? (
                        <>
                          <EyeOff size={16} />
                          დამალვა
                        </>
                      ) : (
                        <>
                          <Eye size={16} />
                          გამოქვეყნება
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(post._id)}
                      className="btn-action btn-delete"
                    >
                      <Trash2 size={16} />
                      წაშლა
                    </button>
                  </>
                )}
                {!canEditPost(post) && !isAdmin && (
                  <span className="post-actions-readonly">
                    {isBlogger
                      ? "შეგიძლიათ მხოლოდ საკუთარი პოსტების რედაქტირება"
                      : "მხოლოდ ადმინს შეუძლია პოსტის შეცვლა"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="empty-state">
          <p>პოსტები არ მოიძებნა</p>
          {canCreatePosts && (
            <Link href="/admin/blog/create" className="btn-create">
              <Plus size={20} />
              შექმენი პირველი პოსტი
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
