"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
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

interface PopulatedUser {
  _id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface BlogPostData {
  _id: string;
  title: string;
  titleEn: string;
  artist: string;
  artistEn: string;
  artistUsername?: string; // მხატვრის username-ი პროფილისთვის
  coverImage: string;
  intro: string;
  introEn: string;
  qa: QA[];
  qaEn: QA[];
  images?: string[];
  publishDate: string;
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
  const intro = language === "en" && post.introEn ? post.introEn : post.intro;
  const qaItems = language === "en" && post.qaEn?.length ? post.qaEn : post.qa;
  const artistName =
    language === "en" && post.artistEn ? post.artistEn : post.artist;
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
            <h1 className="blog-post-title">{title}</h1>
            <div className="blog-post-meta">
              <span className="blog-post-artist">
                {language === "en" ? "Artist: " : "ხელოვანი: "}
                {artistName}
              </span>
              <span className="blog-post-author">
                {language === "en" ? "Author: " : "ავტორი: "}
                {authorName}
              </span>
              {formattedDate && (
                <span className="blog-post-date">{formattedDate}</span>
              )}
            </div>
          </div>
        </div>

        <div className="blog-post-content">
          <p className="blog-post-intro">{intro}</p>

          {/* Artist Links Section */}
          {post.artistUsername && (
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
          {language === "en" ? "← All Interviews" : "← ყველა ინტერვიუ"}
        </Link>
      </div>
    </div>
  );
}
