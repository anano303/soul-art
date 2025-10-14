import { notFound } from "next/navigation";
import { ArtistProfileView } from "@/modules/artists/components/artist-profile-view";
import { ArtistProfileResponse } from "@/types";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
const SITE_BASE = process.env.NEXT_PUBLIC_CLIENT_URL || "https://soulart.ge";

async function fetchArtistProfile(
  slug: string
): Promise<ArtistProfileResponse> {
  const response = await fetch(
    `${API_BASE}/artists/${encodeURIComponent(slug)}`,
    {
      next: { revalidate: 60 },
      cache: "force-cache",
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Failed to load artist profile");
  }

  return response.json();
}

type ArtistPageProps = {
  params: Promise<{ slug: string }>;
};

function resolveBiographyText(
  bio: ArtistProfileResponse["artist"]["artistBio"] | undefined | null
) {
  if (!bio) return "";

  if (bio instanceof Map) {
    const ge = bio.get("ge");
    const en = bio.get("en");
    if (typeof en === "string" && en.trim()) return en.trim();
    if (typeof ge === "string" && ge.trim()) return ge.trim();
    for (const value of bio.values()) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  const record = bio as Record<string, string>;
  const en = record?.en?.trim();
  if (en) return en;
  const ge = record?.ge?.trim();
  if (ge) return ge;
  const fallback = Object.values(record || {}).find(
    (value) => typeof value === "string" && value.trim().length > 0
  );
  return fallback ? fallback.trim() : "";
}

function buildAbsoluteUrl(path: string) {
  try {
    return new URL(path, SITE_BASE).toString();
  } catch {
    return path;
  }
}

export async function generateMetadata({
  params,
}: ArtistPageProps): Promise<Metadata> {
  const { slug: originalSlug } = await params;
  let startIndex = 0;
  if (originalSlug.includes('@')) {
    startIndex = originalSlug.indexOf('@') + 1;
  } else if (originalSlug.includes('%40')) {
    startIndex = originalSlug.indexOf('%40') + 3;
  }
  const slug = originalSlug.toLowerCase().substring(startIndex);

  try {
    const data = await fetchArtistProfile(slug.toLowerCase());
    const artist = data.artist;
    const displayName = artist.storeName || artist.name;
    const biography = resolveBiographyText(artist.artistBio);
    const description = biography
      ? biography.slice(0, 180) + (biography.length > 180 ? "…" : "")
      : `${displayName} • SoulArt portfolio showcasing highlights and commissions.`;
    const canonical = buildAbsoluteUrl(`/@${slug}`);

    const logoUrl = artist.storeLogo || undefined;
    const imageUrl = logoUrl || artist.artistCoverImage || undefined;
    const images = imageUrl
      ? [
          {
            url: imageUrl,
            alt: displayName,
          },
        ]
      : undefined;

    return {
      title: `${displayName} | SoulArt Artist`,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${displayName} | SoulArt`,
        description,
        url: canonical,
        type: "profile",
        siteName: "SoulArt",
        images,
      },
      twitter: {
        card: images ? "summary_large_image" : "summary",
        title: `${displayName} | SoulArt`,
        description,
        images: images?.map((image) => image.url),
      },
    };
  } catch {
    const canonical = buildAbsoluteUrl(`/@${slug}`);
    return {
      title: "SoulArt Artist Portfolio",
      description:
        "Discover emerging Georgian artists, their highlights, and commissions on SoulArt.",
      alternates: { canonical },
      openGraph: {
        title: "SoulArt Artist Portfolio",
        description:
          "Discover emerging Georgian artists, their highlights, and commissions on SoulArt.",
        url: canonical,
        siteName: "SoulArt",
      },
      twitter: {
        card: "summary",
        title: "SoulArt Artist Portfolio",
        description:
          "Discover emerging Georgian artists, their highlights, and commissions on SoulArt.",
      },
    };
  }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  let startIndex = 0;
  if (slug.includes('@')) {
    startIndex = slug.indexOf('@') + 1;
  } else if (slug.includes('%40')) {
    startIndex = slug.indexOf('%40') + 3;
  }
  const data = await fetchArtistProfile(slug.toLowerCase().substring(startIndex));

  return (
    <main
      className="Container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <ArtistProfileView data={data} />
    </main>
  );
}
