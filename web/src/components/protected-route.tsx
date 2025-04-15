"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're running on client before accessing browser APIs
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run the navigation check once we're on client and auth check is complete
    if (isClient && !isLoading) {
      if (!user) {
        // თუ მომხმარებელი არაა დალოგინებული, გადავამისამართოთ ლოგინ გვერდზე
        router.push("/login");
      } else if (adminOnly && user.role !== "admin") {
        // თუ ადმინის გვერდზე შედის არაადმინი, გადავამისამართოთ მთავარ გვერდზე
        router.push("/");
      }
    }
  }, [user, isLoading, router, adminOnly, isClient]);

  // Don't render anything during initial server-side render
  if (!isClient) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  // თუ ინფორმაცია იტვირთება ან მომხმარებელი არაა დალოგინებული, აჩვენოს ლოადინგ
  if (isLoading || !user) {
    return <div className="loading-container">გთხოვთ დაელოდოთ...</div>;
  }

  // თუ ადმინის გვერდია და მომხმარებელი არაა ადმინი
  if (adminOnly && user.role !== "admin") {
    return <div className="error-container">უფლებამოსილების გარეშე!</div>;
  }

  // თუ ყველაფერი კარგადაა, აჩვენოს გვერდის შიგთავსი
  return <>{children}</>;
}
