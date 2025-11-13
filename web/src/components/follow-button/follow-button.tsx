"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserPlus, UserCheck } from "lucide-react";
import { useUser } from "@/modules/auth/hooks/use-user";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "@/hooks/use-toast";
import "./follow-button.css";

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export function FollowButton({
  targetUserId,
  targetUserName,
  initialIsFollowing = false,
  onFollowChange,
  className = "",
}: FollowButtonProps) {
  const router = useRouter();
  const { user } = useUser();
  const isAuthenticated = !!user;
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch current follow status when component mounts
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!isAuthenticated || !user || user.id === targetUserId) {
        return;
      }

      try {
        const response = await fetchWithAuth(
          `/users/${targetUserId}/following-status`
        );
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      } catch (error) {
        console.error("Failed to fetch follow status:", error);
      }
    };

    fetchFollowStatus();
  }, [isAuthenticated, user, targetUserId]);

  const handleFollow = useCallback(async () => {
    if (!isAuthenticated || !user) {
      // Redirect to login with current page as redirect parameter
      const redirect =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (user.id === targetUserId) {
      toast({
        title: "Invalid Action",
        description: "You cannot follow yourself",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = `/users/${targetUserId}/follow`;

      if (isFollowing) {
        // Unfollow
        await fetchWithAuth(endpoint, { method: "DELETE" });
        setIsFollowing(false);
        onFollowChange?.(false);
        toast({
          title: "Unfollowed",
          description: `You are no longer following ${targetUserName}`,
        });
      } else {
        // Follow
        await fetchWithAuth(endpoint, { method: "POST" });
        setIsFollowing(true);
        onFollowChange?.(true);
        toast({
          title: "Following",
          description: `You are now following ${targetUserName}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
    }
  }, [
    isAuthenticated,
    user,
    targetUserId,
    targetUserName,
    isFollowing,
    onFollowChange,
    router,
  ]);

  // Don't show follow button if viewing own profile
  if (user?.id === targetUserId) {
    return null;
  }

  if (!isFollowing) {
    // Show Follow button (to both authenticated and non-authenticated users)
    return (
      <button
        onClick={handleFollow}
        disabled={isLoading}
        className={`follow-button follow-button--follow ${className}`}
      >
        <UserPlus size={16} />
        {isLoading ? "Following..." : "Follow"}
      </button>
    );
  }

  // Show Following button with dropdown
  return (
    <div className={`follow-button-container ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading}
        className="follow-button follow-button--following"
      >
        <UserCheck size={16} />
        Following
        <ChevronDown size={14} className={showDropdown ? "rotated" : ""} />
      </button>

      {showDropdown && (
        <div className="follow-dropdown">
          <button
            onClick={handleFollow}
            disabled={isLoading}
            className="follow-dropdown__item"
          >
            Unfollow
          </button>
        </div>
      )}

      {showDropdown && (
        <div
          className="follow-dropdown-backdrop"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
