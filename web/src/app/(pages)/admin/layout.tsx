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
  const pathname = usePathname();

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

  if (!isLoading && (!user || error)) {
    return redirect("/login");
  }

  const isProductRelatedPath = pathname?.includes('/products') ?? false;
  const hasAccess = 
    user?.role === Role.Admin || 
    (user?.role === Role.Seller && isProductRelatedPath);

  if (!hasAccess) {
    console.log("Access denied:", {
      role: user?.role,
      path: pathname,
      isProductPath: isProductRelatedPath
    });
    return redirect("/login");
  }

  return children;
}
