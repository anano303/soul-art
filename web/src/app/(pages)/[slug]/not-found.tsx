import { Suspense } from "react";
import { NotFoundTracker } from "@/components/NotFoundTracker";

export default function ArtistNotFound() {
  return (
    <>
      <Suspense fallback={null}>
        <NotFoundTracker />
      </Suspense>
      <main
        className="Container"
        style={{
          paddingTop: "4rem",
          paddingBottom: "4rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          არტისტი ვერ მოიძებნა
        </h1>
        <p style={{ color: "#475569" }}>
          მოძებნილი არტისტის გვერდი აღარ არსებობს ან ჯერ არ არის გამოქვეყნებული.
        </p>
      </main>
    </>
  );
}
