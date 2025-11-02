import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogPostClient } from "./BlogPostClient";
import { BlogPostData, PostType } from "./types";

interface BlogPageParams {
  params: Promise<{
    id: string;
  }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_URL;

const getAbsoluteImageUrl = (
  imageUrl: string | undefined
): string | undefined => {
  if (!imageUrl) {
    return undefined;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const prefix = imageUrl.startsWith("/") ? "" : "/";
  if (WEB_BASE_URL) {
    return `${WEB_BASE_URL}${prefix}${imageUrl}`;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL}${prefix}${imageUrl}`;
  }

  return undefined;
};

const getPost = cache(async (postId: string): Promise<BlogPostData | null> => {
  if (!API_BASE_URL) {
    console.error("NEXT_PUBLIC_API_URL is not configured");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/blog/${postId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch blog post ${postId}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as BlogPostData;
    return data;
  } catch (error) {
    console.error("Error fetching blog post", error);
    return null;
  }
});

const getAuthorName = (post: BlogPostData): string | undefined => {
  if (post.postType === PostType.ARTICLE && (post.author || post.authorEn)) {
    return post.authorEn || post.author || undefined;
  }

  if (!post.createdBy) {
    return post.author || post.authorEn || undefined;
  }

  if (typeof post.createdBy === "string") {
    return post.author || post.authorEn || undefined;
  }

  const { firstName, lastName, name, username } = post.createdBy;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    fullName || name || username || post.author || post.authorEn || undefined
  );
};

const getShareTitle = (post: BlogPostData): string => {
  const baseTitle = post.title;

  if (!post.postType || post.postType === PostType.INTERVIEW) {
    const artist = post.artist;
    if (artist) {
      return `${artist} - ${baseTitle}`;
    }
  }

  return baseTitle;
};

const getShareDescription = (post: BlogPostData): string | undefined => {
  const author = post.author || getAuthorName(post);
  const intro = post.intro || "";
  const content = post.content || "";
  const artistName = post.artist || "";

  if (post.postType === PostType.ARTICLE) {
    const snippet = (content || intro).slice(0, 160).trim();
    const description = [snippet, author].filter(Boolean).join(" - ");
    if (description) {
      return description;
    }

    const fallbackTitle = post.titleEn || post.title;
    return author ? `${fallbackTitle} - ${author}` : fallbackTitle;
  }

  const snippet = intro.slice(0, 160).trim();
  const parts = [artistName, snippet, author].filter(Boolean);
  if (parts.length) {
    return parts.join(" | ");
  }

  const fallbackTitle = post.artist || post.title;
  return author ? `${fallbackTitle} - ${author}` : fallbackTitle;
};

export async function generateMetadata({
  params,
}: BlogPageParams): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: "Soulart Blog",
      description: "Discover interviews and articles on Soulart.",
    };
  }

  const shareTitle = getShareTitle(post);
  const shareDescription = getShareDescription(post);
  const coverImageUrl = getAbsoluteImageUrl(post.coverImage);
  const canonicalUrl = WEB_BASE_URL
    ? `${WEB_BASE_URL}/blog/${post._id}`
    : undefined;

  return {
    title: `${post.title} - Soulart Blog`,
    description: shareDescription,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      type: "article",
      title: shareTitle,
      description: shareDescription,
      url: canonicalUrl,
      siteName: "Soulart",
      images: coverImageUrl
        ? [
            {
              url: coverImageUrl,
              width: 1200,
              height: 630,
              alt: post.titleEn || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: coverImageUrl ? [coverImageUrl] : undefined,
    },
    authors: getAuthorName(post) ? [{ name: getAuthorName(post)! }] : undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPageParams) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  return <BlogPostClient postId={id} initialPost={post} />;
}
