"use client";

import { useUser } from "@/modules/auth/hooks/use-user";
import { redirect, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Role } from "@/types/role";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, error } = useUser();
  const pathname = usePathname(); // იღებს მიმდინარე URL-ს

  if (isLoading) {
    return (
      <div className="container">
        <div className="h-[calc(100vh-5rem)] flex items-center justify-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  // თუ მომხმარებელი არაა ავტორიზებული ან API-ს შეცდომა აქვს, გადაამისამართე
  if (!isLoading && (!user || error)) {
    return redirect("/login");
  }
  if (!user) {
    return null; // ან რაღაც 404/error კომპონენტი
  }
  // თუ მიმდინარე გვერდი /admin/products-ია, Seller-საც შეიყვანე
  const isSellerAllowed =
    (pathname === "/admin/products" || pathname === "/admin/products/create") &&
    user.role === Role.Seller;
  // თუ Admin-ია ან Seller და /admin/products-ზეა, შევუშვათ, სხვა შემთხვევაში არა
  if (!isLoading && !(user.role === Role.Admin || isSellerAllowed)) {
    return redirect("/login");
  }

  return children;
}
