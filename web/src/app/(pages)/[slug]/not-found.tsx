"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track404Error } from "@/lib/ga4-analytics";

export default function ArtistNotFound() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      track404Error(pathname);
    }
  }, [pathname]);

  return (
    <main
      className="Container"
      style={{ paddingTop: "4rem", paddingBottom: "4rem", textAlign: "center" }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        არტისტი ვერ მოიძებნა
      </h1>
      <p style={{ color: "#475569" }}>
        მოძებნილი არტისტის გვერდი აღარ არსებობს ან ჯერ არ არის გამოქვეყნებული.
      </p>
    </main>
  );
}
