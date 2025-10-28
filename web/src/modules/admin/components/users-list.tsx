"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { deleteUser } from "@/modules/admin/api/delete-user";
// import type { User } from "@/types";
import { Role } from "@/types/role"; // Role enum იმპორტი
import "./usersList.css";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getUsers } from "../api/get-users";
import { CreateUserModal } from "./create-user-modal";
import HeartLoading from "@/components/HeartLoading/HeartLoading";

const STORAGE_KEY = "soulart-admin-users-state";
type RoleFilter = "all" | Role;

export function UsersList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialPage = 1;
    let initialSearch = "";
    let initialRole: RoleFilter = "all";

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          page?: number;
          search?: string;
          role?: string;
        };

        if (parsed.page && Number.isFinite(parsed.page) && parsed.page > 0) {
          initialPage = Math.floor(parsed.page);
        }

        if (typeof parsed.search === "string") {
          initialSearch = parsed.search;
        }

        if (typeof parsed.role === "string") {
          const normalizedRole = parsed.role.toLowerCase() as RoleFilter;
          if (
            normalizedRole === "all" ||
            Object.values(Role).includes(normalizedRole as Role)
          ) {
            initialRole = normalizedRole;
          }
        }
      }
    } catch (err) {
      console.error("Failed to restore users list state:", err);
    }

    setPage(initialPage);
    setSearchInput(initialSearch);
    setDebouncedSearch(initialSearch.trim());
    setRoleFilter(initialRole);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);

    return () => window.clearTimeout(handler);
  }, [searchInput, isInitialized]);

  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          page,
          search: searchInput,
          role: roleFilter,
        })
      );
    } catch (err) {
      console.error("Failed to persist users list state:", err);
    }
  }, [page, searchInput, roleFilter, isInitialized]);

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ["users", page, debouncedSearch, roleFilter],
    queryFn: () => getUsers(page, 8, debouncedSearch, roleFilter),
    retry: false,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute for new users
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    enabled: isInitialized,
  });

  const handleDelete = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      const result = await deleteUser(userId);

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["users"] });

        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    }
  };

  useEffect(() => {
    if (!data || data.pages === 0) return;
    if (page > data.pages) {
      setPage(data.pages);
    }
  }, [data, page]);

  const summary = useMemo(() => {
    return {
      totalUsers: data?.summary?.totalUsers ?? data?.total ?? 0,
      admin: data?.summary?.roleCounts?.admin ?? 0,
      seller: data?.summary?.roleCounts?.seller ?? 0,
      blogger: data?.summary?.roleCounts?.blogger ?? 0,
      user: data?.summary?.roleCounts?.user ?? 0,
    };
  }, [data]);

  const totalPages = Math.max(data?.pages ?? 1, 1);

  if (!isInitialized || isLoading) {
    return (
      <div>
        <HeartLoading size="medium" />
      </div>
    );
  }
  if (error) return null;

  return (
    <div className="usr-card">
      <div className="usr-header">
        <h1 className="usr-title">Users</h1>
        <div className="usr-header-status">
          {isFetching && (
            <span className="usr-refresh-indicator">Refreshing…</span>
          )}
          <button
            className="create-user-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="usr-icon" />
            Create User
          </button>
        </div>
      </div>

      <div className="usr-toolbar">
        <div className="usr-filters">
          <label className="usr-search">
            <Search className="usr-search-icon" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email or phone"
              className="usr-input"
            />
          </label>

          <label className="usr-select-wrapper">
            <Filter className="usr-filter-icon" />
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
                setPage(1);
              }}
              className="usr-select"
            >
              <option value="all">All roles</option>
              <option value={Role.Admin}>Admins</option>
              <option value={Role.Seller}>Sellers</option>
              <option value={Role.User}>Customers</option>
              <option value={Role.Blogger}>Bloggers</option>
            </select>
          </label>
        </div>

        <div className="usr-summary">
          <div className="usr-summary-card">
            <span className="usr-summary-label">Total users</span>
            <span className="usr-summary-value">
              {summary.totalUsers.toLocaleString()}
            </span>
          </div>
          <div className="usr-summary-card">
            <span className="usr-summary-label">Admins</span>
            <span className="usr-summary-value">
              {summary.admin.toLocaleString()}
            </span>
          </div>
          <div className="usr-summary-card">
            <span className="usr-summary-label">Sellers</span>
            <span className="usr-summary-value">
              {summary.seller.toLocaleString()}
            </span>
          </div>
          <div className="usr-summary-card">
            <span className="usr-summary-label">Bloggers</span>
            <span className="usr-summary-value">
              {summary.blogger.toLocaleString()}
            </span>
          </div>
          <div className="usr-summary-card">
            <span className="usr-summary-label">Customers</span>
            <span className="usr-summary-value">
              {summary.user.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <table className="usr-table">
        <thead>
          <tr className="usr-thead-row">
            <th className="usr-th">ID</th>
            <th className="usr-th">NAME</th>
            <th className="usr-th">EMAIL</th>
            <th className="usr-th">ROLE</th>
            <th className="usr-th">JOINED</th>
            <th className="usr-th usr-th-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.length ? (
            data.items.map((user) => (
              <tr className="usr-tr" key={user._id}>
                <td className="usr-td usr-td-bold">#{user._id}</td>
                <td className="usr-td">{user.name}</td>
                <td className="usr-td">{user.email}</td>
                <td className="usr-td">
                  {user.role === Role.Admin ? (
                    <span className="usr-badge-admin">
                      <ShieldCheck className="usr-icon" />
                      Admin
                    </span>
                  ) : user.role === Role.Seller ? (
                    <span className="usr-badge-seller">
                      <ShieldCheck className="usr-icon" />
                      Seller
                    </span>
                  ) : user.role === Role.Blogger ? (
                    <span className="usr-badge-blogger">
                      <ShieldCheck className="usr-icon" />
                      Blogger
                    </span>
                  ) : (
                    <span className="usr-badge">
                      <UserIcon className="usr-icon" />
                      Customer
                    </span>
                  )}
                </td>
                <td className="usr-td">
                  {new Date(user.createdAt).toLocaleDateString() ||
                    "არასწორი თარიღი"}
                </td>
                <td className="usr-td usr-td-right">
                  <div className="usr-actions">
                    <button
                      className="usr-btn"
                      onClick={() =>
                        router.push(`/admin/users/${user._id}/edit`)
                      }
                      title="Edit user"
                    >
                      <Pencil className="usr-icon" />
                    </button>
                    <button
                      className="usr-btn usr-btn-danger"
                      onClick={() => handleDelete(user._id)}
                    >
                      <Trash2 className="usr-icon" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr className="usr-tr usr-empty-row">
              <td className="usr-td usr-td-center" colSpan={6}>
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {page} of {totalPages}
        </span>
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>

      {isModalOpen && (
        <CreateUserModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
