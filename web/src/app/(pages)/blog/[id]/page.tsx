"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { SocialShare } from "@/components/social-share";
import {
  Palette,
  Image as ImageIcon,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import "./blog-post.css";

interface QA {
  question: string;
  answer: string;
}

enum PostType {
  INTERVIEW = "interview",
  ARTICLE = "article",
}

interface PopulatedUser {
  _id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface BlogPostData {
  _id: string;
  postType: PostType;
  title: string;
  titleEn: string;
  artist?: string;
  artistEn?: string;
  artistUsername?: string;
  coverImage: string;
  intro?: string;
  introEn?: string;
  qa?: QA[];
  qaEn?: QA[];
  subtitle?: string;
  subtitleEn?: string;
  content?: string;
  contentEn?: string;
  author?: string;
  authorEn?: string;
  images?: string[];
  publishDate: string;
  views?: number;
  createdBy?: PopulatedUser | string | null;
  createdAt?: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const { language } = useLanguage();
  const postId = params?.id as string;
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/blog/${postId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load post ${postId}`);
        }

        const data: BlogPostData = await response.json();
        setPost(data);

        // Increment view count
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/blog/${postId}/view`, {
          method: "POST",
        }).catch((err) => console.error("Failed to increment view:", err));
      } catch (err) {
        console.error("Error fetching blog post", err);
        setError(
          language === "en"
            ? "We couldn't load this article."
            : "სტატიის ჩატვირთვა ვერ მოხდა."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, language]);

  // Update meta tags for social sharing
  useEffect(() => {
    if (!post) return;

    const title = language === "en" && post.titleEn ? post.titleEn : post.title;
    const description = (() => {
      if (post.postType === PostType.ARTICLE) {
        return language === "en" && post.contentEn
          ? post.contentEn.slice(0, 160)
          : post.content?.slice(0, 160) || "";
      } else {
        return language === "en" && post.introEn
          ? post.introEn.slice(0, 160)
          : post.intro?.slice(0, 160) || "";
      }
    })();
    const author = (() => {
      if (post.postType === PostType.ARTICLE) {
        return language === "en" && post.authorEn
          ? post.authorEn
          : post.author || "";
      } else {
        return language === "en" && post.artistEn
          ? post.artistEn
          : post.artist || "";
      }
    })();
    const url = typeof window !== "undefined" ? window.location.href : "";

    // Convert cover image to absolute URL for social sharing
    const getAbsoluteImageUrl = (imageUrl: string) => {
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }
      // If it's a relative URL, prepend the API URL
      return `${process.env.NEXT_PUBLIC_API_URL}${
        imageUrl.startsWith("/") ? "" : "/"
      }${imageUrl}`;
    };

    const absoluteImageUrl = getAbsoluteImageUrl(post.coverImage);

    // Debug log
    console.log("Cover Image URL for meta tags:", absoluteImageUrl);

    // Update document title
    document.title = `${title} - Soulart Blog`;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(
        `meta[property="${property}"]`
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updateMetaName = (name: string, content: string) => {
      let meta = document.querySelector(
        `meta[name="${name}"]`
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:image", absoluteImageUrl);
    updateMetaTag("og:image:width", "1200");
    updateMetaTag("og:image:height", "630");
    updateMetaTag("og:image:alt", title);
    updateMetaTag("og:url", url);
    updateMetaTag("og:type", "article");
    updateMetaTag("og:site_name", "Soulart");

    // Twitter Card tags
    updateMetaName("twitter:card", "summary_large_image");
    updateMetaName("twitter:title", title);
    updateMetaName("twitter:description", description);
    updateMetaName("twitter:image", absoluteImageUrl);
    updateMetaName("twitter:image:alt", title);

    // Additional meta tags
    updateMetaName("description", description);
    if (author) {
      updateMetaName("author", author);
    }

    // Cleanup function
    return () => {
      // Optionally remove meta tags on unmount
    };
  }, [post, language]);

  if (loading) {
    return (
      <div className="blog-post-container">
        <p>
          {language === "en" ? "Loading article..." : "სტატია იტვირთება..."}
        </p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="blog-post-container">
        <p>
          {error ||
            (language === "en" ? "Article not found" : "სტატია არ მოიძებნა")}
        </p>
      </div>
    );
  }

  const title = language === "en" && post.titleEn ? post.titleEn : post.title;
  const subtitle =
    language === "en" && post.subtitleEn ? post.subtitleEn : post.subtitle;
  const intro = language === "en" && post.introEn ? post.introEn : post.intro;
  const content =
    language === "en" && post.contentEn ? post.contentEn : post.content;
  const qaItems = language === "en" && post.qaEn?.length ? post.qaEn : post.qa;
  const artistName =
    language === "en" && post.artistEn ? post.artistEn : post.artist;
  const articleAuthor =
    language === "en" && post.authorEn ? post.authorEn : post.author;

  const isInterview = !post.postType || post.postType === PostType.INTERVIEW;
  const isArticle = post.postType === PostType.ARTICLE;

  const authorName = (() => {
    if (!post.createdBy) {
      return language === "en" ? "Soulart Admin" : "სოულარტის გუნდი";
    }

    if (typeof post.createdBy === "string") {
      return language === "en" ? "Soulart Admin" : "სოულარტის გუნდი";
    }

    const fullName = [post.createdBy.firstName, post.createdBy.lastName]
      .filter(Boolean)
      .join(" ");

    return (
      fullName ||
      post.createdBy.name ||
      post.createdBy.username ||
      (language === "en" ? "Soulart Admin" : "სოულარტის გუნდი")
    );
  })();
  const publishDate = post.publishDate || post.createdAt;
  const formattedDate = publishDate
    ? new Date(publishDate).toLocaleDateString(
        language === "en" ? "en-US" : "ka-GE",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : "";

  return (
    <div className="blog-post-container">
      <Link href="/blog" className="blog-post-back">
        <ArrowLeft size={20} />
        {language === "en" ? "Back to Blog" : "უკან ბლოგში"}
      </Link>

      <article className="blog-post">
        <div className="blog-post-header">
          <div className="blog-post-cover">
            <Image
              src={post.coverImage}
              alt={title}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
          <div className="blog-post-header-content">
            <div className="blog-post-meta">
              {isInterview && artistName && (
                <span className="blog-post-artist">
                  {language === "en" ? "Artist: " : "ხელოვანი: "}
                  {artistName}
                </span>
              )}
              <span className="blog-post-author">
                {language === "en" ? "Author: " : "ავტორი: "}
                {isArticle && articleAuthor ? articleAuthor : authorName}
              </span>
              {formattedDate && (
                <span className="blog-post-date">{formattedDate}</span>
              )}
            </div>
          </div>
        </div>

        <div className="blog-post-content">
          {/* Title after image */}
          <h1 className="blog-post-title-content">{title}</h1>

          {/* Social Share - right after title */}
          <SocialShare
            url={
              typeof window !== "undefined"
                ? window.location.href
                : `${process.env.NEXT_PUBLIC_WEB_URL}/blog/${post._id}`
            }
            title={title}
            description={
              isInterview ? intro : isArticle ? content?.slice(0, 150) : ""
            }
          />

          {/* Subtitle for articles - after social share */}
          {isArticle && subtitle && (
            <h2 className="blog-post-subtitle-content">{subtitle}</h2>
          )}

          {isInterview && intro && <p className="blog-post-intro">{intro}</p>}

          {isArticle && content && (
            <div className="blog-article-content">
              <p className="blog-article-text">{content}</p>
            </div>
          )}

          {/* Article External Link */}
          {isArticle && post.artistUsername && (
            <div className="article-external-link">
              <a
                href={post.artistUsername}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link-btn"
              >
                <span>
                  {language === "en" ? "Related Link" : "დაკავშირებული ლინკი"}
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          )}

          {/* Artist Links Section for Interviews */}
          {isInterview && post.artistUsername && (
            <div className="artist-links-section">
              <div className="artist-links-card">
                <div className="artist-links-header">
                  <Palette className="artist-links-icon" size={32} />
                  <h3>
                    {language === "en"
                      ? "Explore Artist's Work"
                      : "გაეცანი მხატვრის ნამუშევრებს"}
                  </h3>
                </div>
                <div className="artist-links-buttons">
                  <Link
                    href={`/@${post.artistUsername}`}
                    className="artist-link-btn gallery-btn"
                  >
                    <ImageIcon className="btn-icon" size={20} />
                    <span className="btn-text">
                      {language === "en" ? "View Gallery" : "ნახე გალერეა"}
                    </span>
                  </Link>
                  <Link
                    href={`/search/users/${post.artistUsername}`}
                    className="artist-link-btn shop-btn"
                  >
                    <ShoppingBag className="btn-icon" size={20} />
                    <span className="btn-text">
                      {language === "en"
                        ? "Shop Artworks"
                        : "შეიძინე ნამუშევრები"}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {isInterview && qaItems && qaItems.length > 0 && (
            <div className="blog-post-qa">
              {qaItems.map((item, index) => (
                <div key={index} className="qa-item">
                  <div className="qa-question">
                    <span className="qa-q-label">
                      {language === "en" ? "Question:" : "კითხვა:"}
                    </span>
                    <h3>{item.question}</h3>
                  </div>
                  <div className="qa-answer">
                    <span className="qa-a-label">
                      {language === "en" ? "Answer:" : "პასუხი:"}
                    </span>
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {post.images && post.images.length > 0 && (
            <div className="blog-post-gallery">
              <h3 className="gallery-title">
                {language === "en" ? "Gallery" : "გალერეა"}
              </h3>
              <div className="gallery-grid">
                {post.images.map((img, idx) => (
                  <div key={idx} className="gallery-item">
                    <Image
                      src={img}
                      alt={`${post.artist} work ${idx + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <div className="blog-post-footer">
        {post.views !== undefined && (
          <div className="blog-post-views">
            <span className="views-icon">👁️</span>
            <span className="views-count">
              {post.views} {language === "en" ? "views" : "ნახვა"}
            </span>
          </div>
        )}

        <Link href="/blog" className="blog-post-back-btn">
          {language === "en"
            ? isArticle
              ? "← All Blog Posts"
              : "← All Interviews"
            : isArticle
            ? "← ყველა პოსტი"
            : "← ყველა ინტერვიუ"}
        </Link>
      </div>
    </div>
  );
}
