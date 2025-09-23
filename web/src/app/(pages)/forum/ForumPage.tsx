"use client";
import { useState, useEffect } from "react";
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
  const router = useRouter();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isForumsLoading,
  } = useInfiniteQuery<Forum[], Error>({
    initialPageParam: 1,
    queryKey: ["forums"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchWithAuth(`/forums?page=${pageParam}`, {
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
          <button className="create-post-button" onClick={handleAddPostClick}>
            {t("forum.addNewPost")}
          </button>

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
                    profileImage: forum.user.profileImage,
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
