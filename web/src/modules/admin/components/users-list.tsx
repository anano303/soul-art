"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { deleteUser } from "@/modules/admin/api/delete-user";
// import type { User } from "@/types";
import { Role } from "@/types/role"; // Role enum იმპორტი
import "./usersList.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers } from "../api/get-users";
import { CreateUserModal } from "./create-user-modal";
// import { CreateUserModal } from "./create-user-modal";

export function UsersList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => getUsers(page, 8),
    retry: false,
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

  if (isLoading) return <div>Loading...</div>;
  if (error) return null;

  return (
    <div className="usr-card">
      <div className="usr-header">
        <h1 className="usr-title">Users</h1>
        <button
          className="create-user-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="usr-icon" />
          Create User
        </button>
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
          {data?.items?.map((user) => (
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
                ) : (
                  <span className="usr-badge">
                    <UserIcon className="usr-icon" />
                    Customer
                  </span>
                )}
              </td>
              <td className="usr-td">
              {new Date(user.createdAt).toLocaleDateString() || "არასწორი თარიღი"}
              </td>
              <td className="usr-td usr-td-right">
                <div className="usr-actions">
                  <button
                    className="usr-btn"
                    onClick={() => router.push(`/admin/users/${user._id}/edit`)}
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
          ))}
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
          Page {page} of {data?.pages || 1}
        </span>
        <button
          className="pagination-btn"
          onClick={() => setPage((p) => Math.min(data?.pages || 1, p + 1))}
          disabled={page === (data?.pages || 1)}
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
