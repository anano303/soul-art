"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "@/hooks/use-toast";
import { Avatar } from "@/components/ui/avatar";
import {
  FaStar,
  FaCrown,
  FaUsers,
  FaEye,
  FaUserPlus,
  FaUserCheck,
} from "react-icons/fa";
import "./PopularArtists.css";

interface PopularArtist {
  id: string;
  name: string;
  artistSlug: string;
  storeName: string;
  coverImage: string;
  avatarImage: string;
  rating: number;
  reviewsCount: number;
  followersCount?: number;
  weeklySalesCount?: number;
  weeklyViewsCount?: number;
}

interface PopularArtistsData {
  bySales: PopularArtist[];
  byViews: PopularArtist[];
  byFollowers: PopularArtist[];
  byRating: PopularArtist[];
}

const PopularArtists = () => {
  const { language } = useLanguage();
  const router = useRouter();
  const { user } = useUser();
  const [data, setData] = useState<PopularArtistsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<
    Record<string, boolean>
  >({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    const fetchPopularArtists = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/artists/popular/weekly?limit=4`
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching popular artists:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularArtists();
  }, []);

  // Fetch follow status for all artists when user is authenticated
  useEffect(() => {
    const fetchFollowStatuses = async () => {
      if (!user || !data) return;

      const allArtists = getAllUniqueArtists();
      const statuses: Record<string, boolean> = {};

      await Promise.all(
        allArtists.map(async (artist) => {
          if (artist.id === user.id) return;
          try {
            const response = await fetchWithAuth(
              `/users/${artist.id}/following-status`
            );
            const result = await response.json();
            statuses[artist.id] = result.isFollowing;
          } catch (error) {
            console.error("Failed to fetch follow status:", error);
          }
        })
      );

      setFollowingStatus(statuses);
    };

    fetchFollowStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data]);

  // Handle follow/unfollow
  const handleFollow = useCallback(
    async (e: React.MouseEvent, artistId: string, artistName: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        const redirect =
          typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      if (user.id === artistId) {
        toast({
          title: language === "ge" ? "შეცდომა" : "Error",
          description:
            language === "ge"
              ? "საკუთარ თავს ვერ გამოიწერთ"
              : "You cannot follow yourself",
          variant: "destructive",
        });
        return;
      }

      setFollowLoading((prev) => ({ ...prev, [artistId]: true }));

      try {
        const isCurrentlyFollowing = followingStatus[artistId];
        const endpoint = `/users/${artistId}/follow`;

        if (isCurrentlyFollowing) {
          await fetchWithAuth(endpoint, { method: "DELETE" });
          setFollowingStatus((prev) => ({ ...prev, [artistId]: false }));
          toast({
            title: language === "ge" ? "გამოწერა გაუქმებულია" : "Unfollowed",
            description:
              language === "ge"
                ? `აღარ მიყვებით ${artistName}-ს`
                : `You are no longer following ${artistName}`,
          });
        } else {
          await fetchWithAuth(endpoint, { method: "POST" });
          setFollowingStatus((prev) => ({ ...prev, [artistId]: true }));
          toast({
            title: language === "ge" ? "გამოწერილია" : "Following",
            description:
              language === "ge"
                ? `მიყვებით ${artistName}-ს`
                : `You are now following ${artistName}`,
          });
        }
      } catch (error) {
        toast({
          title: language === "ge" ? "შეცდომა" : "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update follow status",
          variant: "destructive",
        });
      } finally {
        setFollowLoading((prev) => ({ ...prev, [artistId]: false }));
      }
    },
    [user, followingStatus, language, router]
  );

  // Handle rating click - navigate to artist page reviews section
  const handleRatingClick = useCallback(
    (e: React.MouseEvent, artistSlug: string) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/@${artistSlug}#info`);
    },
    [router]
  );

  // შევაერთოთ ყველა უნიკალური ხელოვანი ერთ მასივში და შევავსოთ ყველა ველი
  const getAllUniqueArtists = (): PopularArtist[] => {
    if (!data) return [];

    // პირველ რიგში შევქმნათ lookup map-ები თითოეული კატეგორიისთვის
    const viewsMap = new Map<string, number>();
    const salesMap = new Map<string, number>();
    const followersMap = new Map<string, number>();

    // შევავსოთ lookup map-ები
    for (const artist of data.byViews || []) {
      if (artist.weeklyViewsCount !== undefined) {
        viewsMap.set(artist.id, artist.weeklyViewsCount);
      }
    }
    for (const artist of data.bySales || []) {
      if (artist.weeklySalesCount !== undefined) {
        salesMap.set(artist.id, artist.weeklySalesCount);
      }
    }
    for (const artist of data.byFollowers || []) {
      if (artist.followersCount !== undefined) {
        followersMap.set(artist.id, artist.followersCount);
      }
    }

    const artistsMap = new Map<string, PopularArtist>();

    // პრიორიტეტით: გაყიდვები > ნახვები > გამომწერები > შეფასებები
    const allArrays = [
      data.bySales,
      data.byViews,
      data.byFollowers,
      data.byRating,
    ];

    for (const arr of allArrays) {
      for (const artist of arr || []) {
        if (!artistsMap.has(artist.id)) {
          // დავამატოთ ახალი ხელოვანი ყველა ხელმისაწვდომი მონაცემით
          artistsMap.set(artist.id, {
            ...artist,
            weeklyViewsCount:
              artist.weeklyViewsCount ?? viewsMap.get(artist.id),
            weeklySalesCount:
              artist.weeklySalesCount ?? salesMap.get(artist.id),
            followersCount:
              artist.followersCount ?? followersMap.get(artist.id),
          });
        }
      }
    }

    return Array.from(artistsMap.values()).slice(0, 8); // მაქსიმუმ 8 ხელოვანი
  };

  const artists = getAllUniqueArtists();

  // არ ვაჩვენოთ თუ მონაცემები ცარიელია
  if (!loading && artists.length === 0) {
    return null;
  }

  return (
    <section className="popularArtists">
      <div className="popularArtists__header">
        <h2 className="popularArtists__title">
          <FaCrown className="popularArtists__icon" />
          {language === "ge"
            ? "კვირის პოპულარული ხელოვანები"
            : "Popular Artists of the Week"}
        </h2>
      </div>

      {loading ? (
        <div className="popularArtists__loading">
          <div className="popularArtists__grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="popularArtists__skeletonCard" />
            ))}
          </div>
        </div>
      ) : (
        <div className="popularArtists__grid">
          {artists.map((artist, index) => (
            <Link
              href={`/@${artist.artistSlug}`}
              key={artist.id}
              className={`popularArtists__card ${
                !artist.coverImage && !artist.avatarImage
                  ? "popularArtists__card--noImage"
                  : ""
              }`}
              style={{
                backgroundImage: artist.coverImage
                  ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${artist.coverImage})`
                  : artist.avatarImage
                  ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${artist.avatarImage})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <div
                className={`popularArtists__rank ${
                  index > 2 ? "popularArtists__rank--number" : ""
                }`}
              >
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : `#${index + 1}`}
              </div>

              <div className="popularArtists__avatar">
                <Avatar
                  src={artist.avatarImage}
                  name={artist.storeName || artist.name}
                  size={60}
                  className="popularArtists__avatarImg"
                />
              </div>

              <div className="popularArtists__info">
                <h3 className="popularArtists__name">
                  {artist.storeName || artist.name}
                </h3>

                <span className="popularArtists__badge">
                  {language === "ge" ? "ხელოვანი" : "Artist"}
                </span>

                <p className="popularArtists__slug">@{artist.artistSlug}</p>

                <div className="popularArtists__stats">
                  <button
                    className="popularArtists__rating popularArtists__statBtn"
                    onClick={(e) => handleRatingClick(e, artist.artistSlug)}
                    title={
                      language === "ge" ? "შეფასებების ნახვა" : "View reviews"
                    }
                  >
                    <FaStar className="popularArtists__starIcon" />
                    {artist.rating.toFixed(1)}
                    <span className="popularArtists__reviewCount">
                      ({artist.reviewsCount})
                    </span>
                  </button>
                  <button
                    className={`popularArtists__followers popularArtists__statBtn ${
                      followingStatus[artist.id]
                        ? "popularArtists__followers--following"
                        : ""
                    }`}
                    onClick={(e) =>
                      handleFollow(
                        e,
                        artist.id,
                        artist.storeName || artist.name
                      )
                    }
                    disabled={followLoading[artist.id]}
                    title={
                      followingStatus[artist.id]
                        ? language === "ge"
                          ? "გამოწერის გაუქმება"
                          : "Unfollow"
                        : language === "ge"
                        ? "გამოწერა"
                        : "Follow"
                    }
                  >
                    {followLoading[artist.id] ? (
                      <span className="popularArtists__loadingSpinner" />
                    ) : followingStatus[artist.id] ? (
                      <FaUserCheck />
                    ) : (
                      <FaUserPlus />
                    )}
                    {artist.followersCount !== undefined &&
                      artist.followersCount > 0 && (
                        <span>{artist.followersCount}</span>
                      )}
                  </button>
                  {artist.weeklyViewsCount !== undefined &&
                    artist.weeklyViewsCount > 0 && (
                      <span className="popularArtists__views">
                        <FaEye />
                        {artist.weeklyViewsCount}
                      </span>
                    )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default PopularArtists;
