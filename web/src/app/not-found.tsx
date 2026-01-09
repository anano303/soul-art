import Link from "next/link";
import { Suspense } from "react";
import { NotFoundTracker } from "@/components/NotFoundTracker";
import "./not-found.css";

export default function NotFound() {
  return (
    <>
      <Suspense fallback={null}>
        <NotFoundTracker />
      </Suspense>
    <main
      className="Container not-found-container"
    >
      <h1 className="not-found-title">
        404
      </h1>
      <h2 className="not-found-subtitle">
        გვერდი ვერ მოიძებნა
      </h2>
      <p className="not-found-description">
        სამწუხაროდ, თქვენ მიერ მოძებნილი გვერდი აღარ არსებობს ან გადატანილია
        სხვა მისამართზე.
      </p>
      <Link href="/" className="not-found-link">
        მთავარ გვერდზე დაბრუნება
      </Link>
    </main>
    </>
  );
}
