"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track404Error } from "@/lib/ga4-analytics";

export function NotFoundTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      track404Error(pathname);
    }
  }, [pathname]);

  return null;
}
