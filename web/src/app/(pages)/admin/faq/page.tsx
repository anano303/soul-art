"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserData, storeUserData } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";
import { FaqAdmin } from "@/modules/admin/components/faq-admin";


export default function AdminFaqPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      const cachedUser = getUserData();
      if (cachedUser?.role === Role.Admin) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await fetchWithAuth("/auth/profile");
        const freshUser = await response.json();
        if (freshUser) {
          storeUserData(freshUser);
          if (freshUser.role === Role.Admin) {
            if (isMounted) setIsLoading(false);
            return;
          }
        }
      } catch {
        router.push("/login?redirect=/admin/faq");
        return;
      }

      router.push("/");
    };

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "2rem 1rem" }}>
      <FaqAdmin />
    </div>
  );
}
