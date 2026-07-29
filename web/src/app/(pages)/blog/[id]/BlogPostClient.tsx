"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  Palette,
  ShoppingBag,
} from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { SocialShare } from "@/components/social-share";
import { useEtsyStatus } from "@/hooks/use-etsy-enabled";
import { useSellerPageHref } from "@/hooks/use-etsy-entry-href";
import EtsyDisabledNotice from "@/components/etsyDisabledNotice/EtsyDisabledNotice";
import { BlogPostData, PostType } from "./types";
import "./blog-post.css";

interface BlogPostClientProps {
  postId: string;
  initialPost: BlogPostData;
}

const getViewAuthorName = (post: BlogPostData, language: string): string => {
  // First, check if post has explicit author field
  if (post.author) {
    return language === "en" && post.authorEn ? post.authorEn : post.author;
  }

  // Fall back to createdBy data
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
};

const buildShareDescription = (
  post: BlogPostData,
  language: string,
  isInterview: boolean,
  isArticle: boolean,
  intro?: string | null,
  content?: string | null,
  artistName?: string | null,
  articleAuthor?: string | null,
  authorName?: string | null
): string => {
  const trimmedIntro = intro?.slice(0, 160)?.trim();
  const trimmedContent = content?.slice(0, 160)?.trim();
  const localizedTitle =
    language === "en" && post.titleEn ? post.titleEn : post.title;

  if (isArticle) {
    const snippet = trimmedContent || trimmedIntro || "";
    const author = articleAuthor || authorName || "";
    const description = [snippet, author].filter(Boolean).join(" - ");
    if (description) {
      return description;
    }

    return author ? `${localizedTitle} - ${author}` : localizedTitle;
  }

  if (isInterview) {
    const parts = [artistName, trimmedIntro, authorName || articleAuthor];
    const description = parts.filter(Boolean).join(" | ");
    if (description) {
      return description;
    }

    const author = authorName || articleAuthor || "";
    return (
      [artistName || localizedTitle, author].filter(Boolean).join(" - ") ||
      localizedTitle
    );
  }

  const fallbackSnippet = trimmedIntro || trimmedContent || "";
  const fallbackAuthor = authorName || articleAuthor || "";
  const fallback = [fallbackSnippet, fallbackAuthor]
    .filter(Boolean)
    .join(" - ");
  if (fallback) {
    return fallback;
  }

  return fallbackAuthor
    ? `${localizedTitle} - ${fallbackAuthor}`
    : localizedTitle;
};

export function BlogPostClient({ postId, initialPost }: BlogPostClientProps) {
  const { language } = useLanguage();
  const [post, setPost] = useState<BlogPostData | null>(initialPost);
  const { temporarilyDisabled: etsyDisabled } = useEtsyStatus(false);
  // On the Etsy launch post, sellers go straight to their own page (where the
  // publish button is) instead of the guide; everyone else keeps the link the
  // post was authored with.
  const sellerPageHref = useSellerPageHref();

  // The Etsy launch article points at /etsy-guide — while the integration is
  // paused it carries the same outage warning as the guide itself.
  const isEtsyPost = useMemo(() => {
    const haystack = [
      post?.title,
      post?.titleEn,
      post?.subtitle,
      post?.subtitleEn,
      post?.artistUsername,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes("etsy");
  }, [post]);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (!postId) {
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/blog/${postId}/view`, {
      method: "POST",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to increment view: ${response.status}`);
        }

        const updatedPost: BlogPostData = await response.json();
        setPost((prev) => {
          if (!prev) {
            return updatedPost;
          }

          return { ...prev, views: updatedPost.views ?? prev.views };
        });
      })
      .catch((err) => console.error("Failed to increment view:", err));
  }, [postId]);

  useEffect(() => {
    if (!post) {
      return;
    }
    const localizedTitle =
      language === "en" && post.titleEn ? post.titleEn : post.title;
    document.title = `${localizedTitle} - Soulart Blog`;
  }, [post, language]);

  if (!post) {
    return (
      <div className="blog-post-container">
        <p>{language === "en" ? "Article not found" : "სტატია არ მოიძებნა"}</p>
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

  const articleLinkLabel = useMemo(() => {
    const defaultLabel =
      language === "en" ? "Related Link" : "დაკავშირებული ლინკი";
    if (!post.artistUsername) {
      return defaultLabel;
    }
    if (language === "en") {
      return post.linkNameEn || post.linkName || defaultLabel;
    }
    return post.linkName || post.linkNameEn || defaultLabel;
  }, [language, post.artistUsername, post.linkName, post.linkNameEn]);

  const authorName = useMemo(
    () => getViewAuthorName(post, language),
    [post, language]
  );

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

  const shareDescription = buildShareDescription(
    post,
    language,
    isInterview,
    isArticle,
    intro,
    content,
    artistName,
    articleAuthor,
    authorName
  );
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : process.env.NEXT_PUBLIC_WEB_URL
      ? `${process.env.NEXT_PUBLIC_WEB_URL}/blog/${post._id}`
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
          <h1 className="blog-post-title-content">{title}</h1>

          <div className="blog-post-share-row">
            <SocialShare
              url={shareUrl}
              title={title}
              description={shareDescription}
            />
            {post.views !== undefined && (
              <div className="blog-post-views">
                <span className="views-icon" aria-hidden="true">
                  👁️
                </span>
                <span className="views-count">
                  {post.views} {language === "en" ? "views" : "ნახვა"}
                </span>
              </div>
            )}
          </div>

          {isEtsyPost && etsyDisabled && <EtsyDisabledNotice />}

          {isArticle && subtitle && (
            <h2 className="blog-post-subtitle-content">{subtitle}</h2>
          )}

          {isInterview && intro && <p className="blog-post-intro">{intro}</p>}

          {isArticle && content && (
            <div className="blog-article-content">
              <p className="blog-article-text">{content}</p>
            </div>
          )}

          {isArticle && post.artistUsername && (
            <div className="article-external-link">
              <a
                href={
                  isEtsyPost && sellerPageHref
                    ? sellerPageHref
                    : post.artistUsername
                }
                target={isEtsyPost && sellerPageHref ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="external-link-btn"
              >
                <span>{articleLinkLabel}</span>
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
                    {/* <span className="qa-q-label">
                      {language === "en" ? "Question:" : "კითხვა:"}
                    </span> */}
                    <h3>{item.question}</h3>
                  </div>
                  <div className="qa-answer">
                    {/* <span className="qa-a-label">
                      {language === "en" ? "Answer:" : "პასუხი:"}
                    </span> */}
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
