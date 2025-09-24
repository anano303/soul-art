"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

interface FastNavigationProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

/**
 * Optimized navigation component for PWA with instant navigation feel
 * Pre-fetches content on hover/touch and uses client-side routing
 */
export function FastNavigation({ 
  href, 
  children, 
  className = "", 
  prefetch = true 
}: FastNavigationProps) {
  const router = useRouter();
  const prefetchedRef = useRef(false);
  const touchStartTime = useRef<number>(0);

  const handlePrefetch = useCallback(() => {
    if (!prefetch || prefetchedRef.current) return;
    
    // Prefetch the page
    router.prefetch(href);
    prefetchedRef.current = true;
  }, [href, prefetch, router]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Add loading state to show immediate feedback
    document.body.style.cursor = "wait";
    
    // Use client-side navigation for instant feel
    router.push(href);
    
    // Reset cursor after a short delay
    setTimeout(() => {
      document.body.style.cursor = "";
    }, 100);
  }, [href, router]);

  const handleTouchStart = useCallback(() => {
    touchStartTime.current = Date.now();
    handlePrefetch();
  }, [handlePrefetch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime.current;
    
    // If it's a quick tap (not a scroll), navigate
    if (touchDuration < 200) {
      e.preventDefault();
      router.push(href);
    }
  }, [href, router]);

  return (
    <a
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation' 
      }}
    >
      {children}
    </a>
  );
}

export default FastNavigation;