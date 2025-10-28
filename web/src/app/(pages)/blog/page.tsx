"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import "./blog.css";

interface BlogPost {
  _id: string;
  title: string;
  titleEn: string;
  artist: string;
  artistEn: string;
  coverImage: string;
  intro: string;
  introEn: string;
  publishDate: string;
}

export default function BlogPage() {
  const { t, language } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/blog?published=true`
        );
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="blog-container">
      <div className="blog-hero">
        <h1 className="blog-title">{language === "en" ? "Blog" : "ბლოგი"}</h1>
        <p className="blog-subtitle">
          {language === "en"
            ? "Interviews with Georgian Artists"
            : "ინტერვიუები ქართველ ხელოვანებთან"}
        </p>
      </div>

      {loading ? (
        <div className="blog-loading">
          <p>{language === "en" ? "Loading..." : "იტვირთება..."}</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.length === 0 ? (
            <div className="blog-empty">
              <p>
                {language === "en"
                  ? "No articles yet. Check back soon!"
                  : "სტატიები მალე გამოჩნდება!"}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <Link
                href={`/blog/${post._id}`}
                key={post._id}
                className="blog-card"
              >
                <div className="blog-card-image">
                  <Image
                    src={post.coverImage}
                    alt={language === "en" ? post.titleEn : post.title}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="blog-card-content">
                  <div className="blog-card-meta">
                    <span className="blog-card-date">
                      {new Date(post.publishDate).toLocaleDateString("ka-GE")}
                    </span>
                    <span className="blog-card-artist">
                      {language === "en" ? post.artistEn : post.artist}
                    </span>
                  </div>
                  <h2 className="blog-card-title">
                    {language === "en" ? post.titleEn : post.title}
                  </h2>
                  <p className="blog-card-excerpt">
                    {language === "en"
                      ? post.introEn.slice(0, 150) + "..."
                      : post.intro.slice(0, 150) + "..."}
                  </p>
                  <span className="blog-card-link">
                    {language === "en" ? "Read more →" : "წაიკითხე მეტი →"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
