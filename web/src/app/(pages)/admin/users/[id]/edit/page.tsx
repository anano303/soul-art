"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";
import { User } from "@/types";
import "./edit-user.css";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetchWithAuth(`/users/${params.id}`);
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.log(error);
        toast({
          title: "Error",
          description: "Failed to fetch user",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const updateData = {
        name: user.name,
        email: user.email,
        role: user.role,
      };

      await fetchWithAuth(`/users/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      router.push("/admin/users");
    } catch (error) {
      console.log(error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="edit-user-container">
      <h1>Edit User</h1>
      <form onSubmit={handleSubmit} className="edit-user-form">
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            value={user.role}
            onChange={(e) => setUser({ ...user, role: e.target.value as Role })}
          >
            <option value={Role.User}>User</option>
            <option value={Role.Admin}>Admin</option>
            <option value={Role.Seller}>Seller</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button">
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
