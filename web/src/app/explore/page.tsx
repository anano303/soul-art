"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { GalleryViewer } from "@/components/gallery-viewer";
import type { GalleryViewerPost } from "@/components/gallery-viewer";
import type { GalleryInteractionStats } from "@/lib/gallery-interaction.service";
import { trackSearch as metaTrackSearch } from "@/components/MetaPixel";
import { trackSearch } from "@/lib/ga4-analytics";
import "./explore.css";

interface ExplorePost {
  _id: string;
  imageUrl: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  productId?: string | null;
  isSold?: boolean;
  artist?: {
    id: string;
    username: string;
    artistName?: string;
    artistSlug?: string;
    profileImageUrl?: string;
    name?: string;
    storeName?: string;
    storeLogo?: string;
    storeLogoPath?: string;
  };
}

interface SearchArtist {
  id: string;
  slug: string;
  name: string;
  storeLogoPath?: string;
  storeLogo?: string;
  profileImagePath?: string;
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [searchVisible, setSearchVisible] = useState(true);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchArtist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryStats, setGalleryStats] = useState<Map<string, GalleryInteractionStats>>(new Map());
  const { t, language } = useLanguage();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search artists function
  const searchArtists = async (query: string) => {
    if (!query || query.length < 2) return [];
    try {
      const response = await fetchWithAuth(`/artists/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
      return [];
    } catch (error) {
      console.error("Error searching artists:", error);
      return [];
    }
  };

  // Keep refs in sync with state
  useEffect(() => {
    cursorRef.current = cursor;
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
  }, [cursor, hasMore, loading]);

  // Fetch explore posts - NO dependencies on changing state
  const fetchPosts = useCallback(async (search?: string, reset = false) => {
    if (loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (cursorRef.current && !reset) params.append("cursor", cursorRef.current);
      params.append("limit", "30");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
      const response = await fetch(`${apiUrl}/explore?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (reset) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching explore posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search submission
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchPopup(false);
      const normalizedKeyword = searchQuery.trim();
      metaTrackSearch(normalizedKeyword);
      trackSearch(normalizedKeyword, searchResults.length);
      
      try {
        const response = await fetchWithAuth(`/artists/search/ranking?q=${encodeURIComponent(normalizedKeyword)}`);
        if (response.ok) {
          const ranking = await response.json();
          const recommendedTab = ranking.recommendedTab === "products" ? "products" : "users";
          router.push(`/search/users/${normalizedKeyword}?tab=${recommendedTab}`);
        } else {
          router.push(`/search/users/${normalizedKeyword}`);
        }
      } catch {
        router.push(`/search/users/${normalizedKeyword}`);
      }
    }
  };

  const handleArtistClick = (artist: SearchArtist) => {
    setShowSearchPopup(false);
    setSearchQuery("");
    if (searchQuery.trim()) {
      metaTrackSearch(searchQuery.trim());
      trackSearch(searchQuery.trim(), searchResults.length);
    }
    router.push(`/artists/${artist.slug}`);
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!initialized || loadingRef.current) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
        fetchPosts();
      }
    });

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [initialized, posts.length, fetchPosts]);

  // Artist search dropdown
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length >= 2) {
      setIsSearching(true);
      searchArtists(debouncedSearchQuery).then((results) => {
        setSearchResults(results);
        setShowSearchPopup(true);
        setIsSearching(false);
      });
    } else {
      setSearchResults([]);
      setShowSearchPopup(false);
      setIsSearching(false);
    }
  }, [debouncedSearchQuery]);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll behavior for search bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 10;

      if (Math.abs(currentScrollY - lastScrollYRef.current) < scrollThreshold) {
        return;
      }

      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        // Scrolling down & past 100px
        setSearchVisible(false);
      } else if (currentScrollY < lastScrollYRef.current) {
        // Scrolling up
        setSearchVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initial load
  useEffect(() => {
    fetchPosts("", true);
    setInitialized(true);
  }, [fetchPosts]);

  // Initialize gallery stats from posts data
  useEffect(() => {
    const newStats = new Map<string, GalleryInteractionStats>();
    posts.forEach((post) => {
      if (post.imageUrl) {
        newStats.set(post.imageUrl, {
          imageUrl: post.imageUrl,
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          isLikedByUser: false,
        });
      }
    });
    setGalleryStats(newStats);
  }, [posts]);

  // Gallery helper functions
  const getStatsForImage = (imageUrl: string): GalleryInteractionStats => {
    return galleryStats.get(imageUrl) || {
      imageUrl,
      likesCount: 0,
      commentsCount: 0,
      isLikedByUser: false,
    };
  };

  const updateStats = (imageUrl: string, updates: Partial<GalleryInteractionStats>) => {
    setGalleryStats((prev) => {
      const newStats = new Map(prev);
      const current = newStats.get(imageUrl) || {
        imageUrl,
        likesCount: 0,
        commentsCount: 0,
        isLikedByUser: false,
      };
      newStats.set(imageUrl, { ...current, ...updates });
      return newStats;
    });
  };

  // Convert posts to gallery viewer format
  const galleryPosts: GalleryViewerPost[] = posts.map((post) => ({
    postId: post._id,
    _id: post._id,
    images: [{ url: post.imageUrl, order: 0 }],
    caption: post.caption || "",
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    artist: post.artist,
    productId: post.productId || null,
    hideBuyButton: false,
    isSold: post.isSold || false,
  }));

  return (
    <div className="explore-page">
      {/* Search Bar */}
      <div className={`explore-search ${searchVisible ? "explore-search--visible" : "explore-search--hidden"}`} ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="explore-search__container">
          <Search className="explore-search__icon" size={20} />
          <input
            type="text"
            placeholder={language === "en" ? "Search artists..." : "ძიება..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.length >= 2) {
                setShowSearchPopup(true);
              }
            }}
            className="explore-search__input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowSearchPopup(false);
              }}
              className="explore-search__clear"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <button type="submit" style={{ display: "none" }} />
        </form>

        {/* Search Popup */}
        {showSearchPopup && searchQuery.length >= 2 && (
          <div className="explore-search__popup">
            {isSearching ? (
              <div className="explore-search__popup-loading">
                {language === "en" ? "Searching..." : "ძიება..."}
              </div>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <div className="explore-search__popup-section">
                    <h4 className="explore-search__popup-title">
                      {language === "en" ? "Artists" : "არტისტები"}
                    </h4>
                    {searchResults.slice(0, 5).map((artist) => (
                      <button
                        key={artist.id}
                        className="explore-search__popup-item"
                        onClick={() => handleArtistClick(artist)}
                      >
                        <div className="explore-search__popup-avatar">
                          {artist.storeLogoPath || artist.storeLogo || artist.profileImagePath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={artist.storeLogoPath || artist.storeLogo || artist.profileImagePath}
                              alt={artist.name}
                            />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div className="explore-search__popup-info">
                          <span className="explore-search__popup-name">{artist.name}</span>
                          <span className="explore-search__popup-badge">
                            {language === "en" ? "Artist" : "არტისტი"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && (
                  <div className="explore-search__popup-empty">
                    {language === "en" ? "No artists found" : "არტისტები არ მოიძებნა"}
                  </div>
                )}
                <div className="explore-search__popup-footer">
                  <button
                    type="button"
                    className="explore-search__popup-view-all"
                    onClick={handleSearchSubmit}
                  >
                    {language === "en" ? "View all results" : "ყველა შედეგის ნახვა"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Posts Grid */}
      <div className="explore-grid">
        {posts.map((post, index) => (
          <div
            key={post._id}
            className="explore-grid__item"
            ref={index === posts.length - 1 ? lastPostRef : null}
            onClick={() => {
              setSelectedPostIndex(index);
              setViewerOpen(true);
            }}
          >
            <Image
              src={post.imageUrl}
              alt={post.caption || "Artwork"}
              fill
              className="explore-grid__image"
              sizes="(max-width: 768px) 33vw, 25vw"
            />
            <div className="explore-grid__overlay">
              <div className="explore-grid__stats">
                <span>❤️ {post.likesCount || 0}</span>
                <span>💬 {post.commentsCount || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="explore-loading">
          <div className="explore-loading__spinner" />
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="explore-empty">
          <p>{t("explore.noResults") || "No artworks found"}</p>
        </div>
      )}

      {/* Gallery Viewer */}
      {viewerOpen && galleryPosts.length > 0 && posts[selectedPostIndex]?.artist && (
        <GalleryViewer
          posts={galleryPosts}
          currentPostIndex={selectedPostIndex}
          currentImageIndex={currentImageIndex}
          artist={{
            id: posts[selectedPostIndex].artist?.id || "",
            name: posts[selectedPostIndex].artist?.storeName || posts[selectedPostIndex].artist?.username || "Unknown Artist",
            storeName: posts[selectedPostIndex].artist?.storeName,
            storeLogo: posts[selectedPostIndex].artist?.profileImageUrl,
          }}
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedPostIndex(0);
            setCurrentImageIndex(0);
          }}
          onPostIndexChange={(postIndex, imageIndex) => {
            setSelectedPostIndex(postIndex);
            if (imageIndex !== undefined) setCurrentImageIndex(imageIndex);
          }}
          onImageIndexChange={setCurrentImageIndex}
          getStatsForImage={getStatsForImage}
          updateStats={updateStats}
          hideHeaderText={true}
        />
      )}
    </div>
  );
}
