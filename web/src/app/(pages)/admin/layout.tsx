"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api-client";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";
import { Sidebar } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          console.log("Not authenticated, redirecting to login");
          router.push("/login?redirect=/admin");
          return;
        }

        // Get user data from local storage
        const userData = getUserData();
        if (!userData) {
          console.log("No user data found, redirecting to login");
          router.push("/login?redirect=/admin");
          return;
        }

        // Check if user has admin or seller role
        if (userData.role !== Role.Admin && userData.role !== Role.Seller) {
          console.log("User doesn't have admin permissions");
          router.push("/");
          return;
        }

        // User is authenticated and authorized
        setAuthorized(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/login?redirect=/admin");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">იტვირთება...</p>
      </div>
    );
  }

  if (!authorized) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
