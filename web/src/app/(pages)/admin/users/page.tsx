"use client";

import { UsersList } from "@/modules/admin/components/users-list";

export default function AdminUsersPage() {
  return (
    <div className="responsive-container" style={{
      maxWidth: "90%",
      margin: "0 auto",
      overflowX: "auto",
      width: "100%"
    }}>
      <UsersList />
    </div>
  );
}
