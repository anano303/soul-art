"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ForumPost from "./ForumPost";
import "./ForumPage.css";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import CreateForumModal from "./CreateForumModal";
import { useUser } from "@/modules/auth/hooks/use-user";
import Loading from "../admin/users/loading";
import LoadingAnim from "@/components/loadingAnim/loadingAnim";
import { useLanguage } from "@/hooks/LanguageContext";

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

const ForumPage = () => {
  const { t } = useLanguage();
  const { user, isLoading: isUserLoading } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(inputValue);
      setSearchQuery(inputValue);
      setIsSearching(inputValue.length > 0);
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [inputValue]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isForumsLoading,
  } = useInfiniteQuery<Forum[], Error>({
    initialPageParam: 1,
    queryKey: ["forums", debouncedSearchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const endpoint = debouncedSearchQuery 
        ? `/forums/search?query=${encodeURIComponent(debouncedSearchQuery)}&page=${pageParam}` 
        : `/forums?page=${pageParam}`;
      
      const response = await fetchWithAuth(endpoint, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      return data as Forum[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 20) {
        return allPages.length + 1;
      }
      return undefined;
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop !==
          document.documentElement.offsetHeight ||
        isFetchingNextPage
      )
        return;
      if (hasNextPage) {
        fetchNextPage();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleAddPostClick = () => {
    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const clearSearch = () => {
    setInputValue("");
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setIsSearching(false);
  };

  if (isUserLoading || isForumsLoading) {
    return (
      <div>
        {" "}
        <LoadingAnim />{" "}
      </div>
    );
  }

  return (
    <div className="forum-page">
      {isUserLoading || isForumsLoading ? (
        <div>
          {" "}
          <Loading />{" "}
        </div>
      ) : (
        <>
          <div className="forum-header">
            <button className="create-post-button" onClick={handleAddPostClick}>
              {t("forum.addNewPost")}
            </button>

            <div className="search-container">
              <input
                type="text"
                placeholder={t("forum.searchPlaceholder") || "ძიება..."}
                value={inputValue}
                onChange={handleSearchChange}
                className="search-input"
              />
              {inputValue && (
                <button onClick={clearSearch} className="clear-search-btn">
                  ✕
                </button>
              )}
              {inputValue !== debouncedSearchQuery && inputValue.length > 0 && (
                <div className="search-loading">
                  <span>•••</span>
                </div>
              )}
            </div>
          </div>

          {isSearching && (
            <div className="search-info">
              {t("forum.searchResults") || "ძიების შედეგები"}: "{debouncedSearchQuery}"
              {data?.pages[0]?.length === 0 && (
                <span className="no-results">
                  {" "}
                  - {t("forum.noResults") || "შედეგი არ მოიძებნა"}
                </span>
              )}
            </div>
          )}

          <CreateForumModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />

          {data?.pages.map((page) =>
            page.map((forum: Forum) => {
              const isOwner = user?._id === forum.user._id;
              const isAdmin = user?.role === "admin";
              const canModify = isOwner || isAdmin;

              return (
                <ForumPost
                  key={forum._id}
                  id={forum._id}
                  image={forum.image || "/avatar.jpg"}
                  text={forum.content}
                  category={forum.tags}
                  author={{
                    name: forum.user.name,
                    _id: forum.user._id,
                    avatar: "/avatar.jpg",
                    profileImage: forum.user.profileImage || undefined,
                    role: forum.user.role,
                  }}
                  currentUser={
                    user
                      ? {
                          _id: user._id,
                          role: user.role,
                          name: user.name,
                          profileImage: user.profileImage,
                        }
                      : undefined
                  }
                  comments={forum.comments.map((comment) => ({
                    id: comment._id,
                    text: comment.content,
                    author: {
                      name: comment.user.name,
                      _id: comment.user._id,
                      avatar: "/avatar.jpg",
                      profileImage: comment.user.profileImage || undefined,
                    },
                    parentId: comment.parentId?.toString(),
                    replies: comment.replies?.map((r) => r.toString()),
                    likes: comment.likes || 0,
                    likesArray: comment.likesArray || [],
                  }))}
                  time={new Date(forum.createdAt).toLocaleDateString()}
                  likes={forum.likes}
                  isLiked={forum.likesArray.includes(user?._id || "")}
                  isAuthorized={!!user}
                  canModify={canModify}
                />
              );
            })
          )}

          {isFetchingNextPage && <div>{t("forum.loadingMore")}</div>}
        </>
      )}
    </div>
  );
};

export default ForumPage;
