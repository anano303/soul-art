"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import "./seller-notifications.css";

interface SellerNotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  category?: "admin" | "product" | "suggestion" | "system";
  priority?: number;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
}

interface SellerNotificationsResponse {
  notifications: SellerNotificationItem[];
}

interface AdminHistoryNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  category?: "admin" | "product" | "suggestion" | "system";
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readByUsersCount: number;
  readByUsers: Array<{
    userId: string;
    name: string;
    email?: string;
    readAt: string;
  }>;
}

interface AdminHistoryResponse {
  notifications: AdminHistoryNotification[];
  total: number;
}

const isSellerRole = (role?: string) => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "seller" || normalized === "seller_sales_manager";
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ka-GE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function SellerNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(
    null,
  );

  const enabled = !!user;
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const notificationsQuery = useQuery<SellerNotificationsResponse>({
    queryKey: ["seller-notifications"],
    queryFn: async () => {
      const response = await fetchWithAuth("/users/me/seller-notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch seller notifications");
      }
      return response.json();
    },
    enabled,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const adminHistoryQuery = useQuery<AdminHistoryResponse>({
    queryKey: ["admin", "seller-notifications-history", "header"],
    queryFn: async () => {
      const response = await fetchWithAuth(
        "/users/admin/seller-notifications-history?limit=80&offset=0",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch admin notifications history");
      }
      return response.json();
    },
    enabled: enabled && isAdmin,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const notifications = useMemo(() => {
    const items = notificationsQuery.data?.notifications ?? [];
    if (isSellerRole(user?.role)) {
      return items;
    }
    return items.filter((item) => item.category !== "admin");
  }, [notificationsQuery.data?.notifications, user?.role]);

  const adminNotifications = useMemo(
    () => adminHistoryQuery.data?.notifications ?? [],
    [adminHistoryQuery.data?.notifications],
  );

  const visibleNotifications = isAdmin ? adminNotifications : notifications;

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.readAt).map((item) => item.id),
    [notifications],
  );
  const unreadCount = isAdmin
    ? 0
    : unreadIds.length;

  const markReadMutation = useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const response = await fetchWithAuth("/users/me/seller-notifications/read", {
        method: "PATCH",
        body: JSON.stringify(
          notificationIds?.length ? { notificationIds } : {},
        ),
      });
      if (!response.ok) {
        throw new Error("Failed to mark seller notifications as read");
      }
      return response.json() as Promise<{ success: boolean; updatedCount: number }>;
    },
    onSuccess: (_, ids) => {
      const targetIds = new Set(ids ?? []);
      queryClient.setQueryData<SellerNotificationsResponse>(
        ["seller-notifications"],
        (current) => {
          if (!current) return current;
          return {
            notifications: current.notifications.map((notification) => {
              if (!targetIds.size || targetIds.has(notification.id)) {
                return {
                  ...notification,
                  readAt: notification.readAt || new Date().toISOString(),
                  isRead: true,
                };
              }
              return notification;
            }),
          };
        },
      );
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  if (!enabled) {
    return null;
  }

  const handleToggle = () => {
    const nextValue = !isOpen;
    setIsOpen(nextValue);
    if (!isAdmin && nextValue && unreadIds.length > 0 && !markReadMutation.isPending) {
      markReadMutation.mutate(unreadIds);
    }
  };

  const navigateToAction = async (url?: string | null, category?: string) => {
    if (!url || !url.startsWith("/")) return;

    // Auto-follow artist when clicking suggestion notification
    if (category === "suggestion" && url.startsWith("/@")) {
      const slug = url.slice(2); // remove "/@"
      if (slug) {
        try {
          const res = await fetchWithAuth(`/users/follow-by-slug/${encodeURIComponent(slug)}`, {
            method: "POST",
          });
          if (res.ok) {
            // Invalidate caches so the page loads with fresh data
            queryClient.invalidateQueries({ queryKey: ["artist-profile"] });
            queryClient.invalidateQueries({ queryKey: ["user"] });
          }
        } catch {
          // ignore — navigate anyway
        }
      }
    }

    router.push(url);
    setIsOpen(false);
  };

  return (
    <div className="seller-header-notifications" ref={rootRef}>
      <button
        type="button"
        className={`seller-header-notifications__trigger ${
          isOpen ? "is-open" : ""
        }`}
        onClick={handleToggle}
        aria-label="Seller notifications"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? <BellRing size={19} /> : <Bell size={19} />}
        {unreadCount > 0 && (
          <span className="seller-header-notifications__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="seller-header-notifications__panel">
          <div className="seller-header-notifications__panel-header">
            <div>
              <h3>შეტყობინებები</h3>
              <p>
                {isAdmin
                  ? "სრული ისტორია + ნახვების სტატისტიკა"
                  : "ახალი პროდუქტები, შეთავაზებები და მნიშვნელოვანი განახლებები"}
              </p>
            </div>
            {unreadCount === 0 && (
              <span className="seller-header-notifications__read-state">
                <CheckCheck size={14} />
                ნანახია
              </span>
            )}
          </div>

          {(isAdmin ? adminHistoryQuery.isLoading : notificationsQuery.isLoading) ? (
            <div className="seller-header-notifications__empty">
              იტვირთება...
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="seller-header-notifications__empty">
              ჯერ შეტყობინება არ არის.
            </div>
          ) : (
            <div className="seller-header-notifications__list">
              {visibleNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`seller-header-notifications__item seller-header-notifications__item--${notification.type} ${
                    !isAdmin && (notification as SellerNotificationItem).readAt
                      ? "is-read"
                      : "is-unread"
                  }`}
                >
                  <div className="seller-header-notifications__item-top">
                    <strong>{notification.title}</strong>
                    <time dateTime={notification.createdAt}>
                      {formatTimestamp(notification.createdAt)}
                    </time>
                  </div>
                  {notification.category === "admin" && (
                    <div className="seller-header-notifications__admin-badge">
                      მნიშვნელოვანი
                    </div>
                  )}
                  <p>{notification.message}</p>
                  {isAdmin && (
                    <div
                      className="seller-header-notifications__admin-stats"
                      onMouseEnter={() => setHoveredNotificationId(notification.id)}
                      onMouseLeave={() => setHoveredNotificationId(null)}
                    >
                      <span className="seller-header-notifications__admin-seen">
                        ნანახი: {(notification as AdminHistoryNotification).readByUsersCount || 0}
                      </span>
                      <span className="seller-header-notifications__admin-arrow">▸</span>

                      {hoveredNotificationId === notification.id && (
                        <div className="seller-header-notifications__seen-popover">
                          <div className="seller-header-notifications__seen-title">
                            ვინ ნახა
                          </div>
                          <div className="seller-header-notifications__seen-list">
                            {((notification as AdminHistoryNotification).readByUsers || []).length > 0 ? (
                              (notification as AdminHistoryNotification).readByUsers.map((reader) => (
                                <div
                                  key={`${notification.id}-${reader.userId}-${reader.readAt}`}
                                  className="seller-header-notifications__seen-item"
                                >
                                  <strong>{reader.name}</strong>
                                  <span>{reader.email || ""}</span>
                                  <time>{formatTimestamp(reader.readAt)}</time>
                                </div>
                              ))
                            ) : (
                              <div className="seller-header-notifications__seen-empty">
                                ჯერ არავის უნახავს
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {notification.actionUrl && (
                    <button
                      type="button"
                      className="seller-header-notifications__action"
                      onClick={() => {
                        navigateToAction(notification.actionUrl, notification.category);
                      }}
                    >
                      {notification.actionLabel || "გახსნა"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
