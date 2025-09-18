import { Metadata } from "next";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import SingleForumPost from "./SingleForumPost";

interface Forum {
  _id: string;
  content: string;
  user: {
    name: string;
    _id: string;
    role: string;
    profileImage?: string;
  };
  tags: string[];
  comments: Array<{
    _id: string;
    content: string;
    user: {
      name: string;
      _id: string;
      profileImage?: string;
    };
    createdAt: string;
    parentId?: string;
    replies?: string[];
    likes?: number;
    likesArray?: string[];
  }>;
  likes: number;
  likesArray: string[];
  image: string;
  createdAt: string;
}

// Helper function to truncate text for SEO
function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

// Helper function to extract text from HTML or format content
function extractTextContent(content: string): string {
  // Remove HTML tags if any
  const textOnly = content.replace(/<[^>]*>/g, "");
  // Remove extra whitespace
  return textOnly.replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1"
      }/forums/${id}`,
      {
        next: { revalidate: 60 }, // Revalidate every minute
      }
    );

    if (!response.ok) {
      return {
        title: "Forum Post Not Found - SoulArt.ge",
        description: "The requested forum post could not be found.",
      };
    }

    const forum: Forum = await response.json();

    const textContent = extractTextContent(forum.content);
    const title = `${truncateText(textContent, 60)} - ${
      forum.user.name
    } | SoulArt.ge Forum`;
    const description = truncateText(textContent, 155);

    // Get all comment text for additional SEO content
    const commentTexts = forum.comments
      .map((comment) => extractTextContent(comment.content))
      .join(" ");

    const fullContent = `${textContent} ${commentTexts}`;
    const keywords = [
      "SoulArt.ge",
      "ქართული ხელოვნება",
      "Georgian art",
      "ფორუმი",
      "forum",
      ...forum.tags,
      forum.user.name,
    ].join(", ");

    return {
      title,
      description,
      keywords,
      authors: [{ name: forum.user.name }],
      creator: forum.user.name,
      publisher: "SoulArt.ge",

      openGraph: {
        title,
        description,
        url: `https://soulart.ge/forum/${id}`,
        siteName: "SoulArt.ge",
        images: forum.image
          ? [
              {
                url: forum.image,
                width: 1200,
                height: 630,
                alt: truncateText(textContent, 100),
              },
            ]
          : [],
        locale: "ka_GE",
        type: "article",
        publishedTime: forum.createdAt,
        authors: [forum.user.name],
        section: "Forum",
        tags: forum.tags,
      },

      twitter: {
        card: "summary_large_image",
        title,
        description,
        creator: `@${forum.user.name}`,
        images: forum.image ? [forum.image] : [],
      },

      alternates: {
        canonical: `https://soulart.ge/forum/${id}`,
      },

      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },

      other: {
        "article:author": forum.user.name,
        "article:published_time": forum.createdAt,
        "article:section": "Forum",
        "article:tag": forum.tags.join(","),
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Forum Post - SoulArt.ge",
      description:
        "Discover Georgian art and connect with artists on SoulArt.ge forum.",
    };
  }
}

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SingleForumPost postId={id} />;
}
