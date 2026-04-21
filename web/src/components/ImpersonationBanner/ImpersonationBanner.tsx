"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/axios";
import { storeUserData, clearUserData } from "@/lib/auth";

export function ImpersonationBanner() {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAdminId(localStorage.getItem("impersonating_admin_id"));
  }, []);

  if (!adminId) return null;

  const handleReturn = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/return-to-admin", {
        adminId,
      });
      if (data.user) {
        localStorage.removeItem("impersonating_admin_id");
        storeUserData(data.user);
        window.location.href = "/admin";
      }
    } catch (err) {
      console.error("Return to admin failed:", err);
      // If it fails, clear impersonation state and redirect to login
      localStorage.removeItem("impersonating_admin_id");
      clearUserData();
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        right: 16,
        zIndex: 9999,
        background: "#dc2626",
        color: "#fff",
        padding: "10px 18px",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
      onClick={!loading ? handleReturn : undefined}
      title="დაბრუნდი ადმინის ექაუნთზე"
    >
      🔙 {loading ? "იტვირთება..." : "დაბრუნდი ადმინად"}
    </div>
  );
}
