"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { track404Error } from "@/lib/ga4-analytics";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      track404Error(pathname);
    }
  }, [pathname]);

  return (
    <main
      className="Container"
      style={{
        paddingTop: "6rem",
        paddingBottom: "6rem",
        textAlign: "center",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1
        style={{
          fontSize: "4rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          color: "#1e293b",
        }}
      >
        404
      </h1>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#475569" }}>
        გვერდი ვერ მოიძებნა
      </h2>
      <p style={{ color: "#64748b", marginBottom: "2rem", maxWidth: "500px" }}>
        სამწუხაროდ, თქვენ მიერ მოძებნილი გვერდი აღარ არსებობს ან გადატანილია
        სხვა მისამართზე.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#000",
          color: "#fff",
          borderRadius: "0.5rem",
          textDecoration: "none",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#1e293b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#000";
        }}
      >
        მთავარ გვერდზე დაბრუნება
      </Link>
    </main>
  );
}
