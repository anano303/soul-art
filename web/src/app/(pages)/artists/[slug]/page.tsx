import { notFound } from "next/navigation";
import { ArtistProfileView } from "@/modules/artists/components/artist-profile-view";
import { ArtistProfileResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

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

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  const data = await fetchArtistProfile(slug.toLowerCase());

  return (
    <main
      className="Container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <ArtistProfileView data={data} />
    </main>
  );
}
