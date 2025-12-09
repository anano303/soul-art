"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/modules/cart/context/cart-context";
import { useRouter, usePathname } from "next/navigation";
import "./floating-cart-icon.css";

export function FloatingCartIcon() {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Drag state using refs for immediate updates
  const [position, setPosition] = useState({ bottom: 80, left: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const startPositionRef = useRef({ x: 0, y: 0 }); // drag-ის დაწყების პოზიცია
  const positionRef = useRef({ bottom: 80, left: 20 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const DRAG_THRESHOLD = 5; // მინიმალური პიქსელი რომ ჩაითვალოს drag-ად

  let cartData;
  try {
    cartData = useCart();
  } catch (error) {
    console.log("FloatingCartIcon: CartProvider not available");
    return null;
  }

  const { totalItems } = cartData;

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("floatingCartPosition");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
        positionRef.current = parsed;
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem("floatingCartPosition", JSON.stringify(position));
    positionRef.current = position;
  }, [position]);

  const isOnCartRelatedPage = () => {
    if (!pathname) return false;
    return (
      pathname.startsWith("/cart") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/orders")
    );
  };

  useEffect(() => {
    const shouldShow = totalItems > 0 && !isOnCartRelatedPage();

    if (shouldShow && !isVisible) {
      setIsAnimatingOut(false);
      setIsVisible(true);
    } else if (!shouldShow && isVisible) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }

    if (shouldShow && totalItems > 0) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [totalItems, pathname, isVisible]);

  // Mouse drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    setIsDragging(true);

    startPositionRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = {
      x: e.clientX - positionRef.current.left,
      y: e.clientY - (window.innerHeight - positionRef.current.bottom - 60),
    };
  };

  // Touch drag start
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    setIsDragging(true);

    startPositionRef.current = { x: touch.clientX, y: touch.clientY };
    dragOffsetRef.current = {
      x: touch.clientX - positionRef.current.left,
      y: touch.clientY - (window.innerHeight - positionRef.current.bottom - 60),
    };
  };

  // Safe boundaries - არ შევიდეს header/footer/nav-ში
  const HEADER_HEIGHT = 80; // header სიმაღლე
  const FOOTER_HEIGHT = 80; // footer/nav სიმაღლე
  const BUTTON_SIZE = 60;
  const PADDING = 10;

  // Global event listeners - always attached
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      // შევამოწმოთ საკმარისი მოძრაობა არის თუ არა drag-ად ჩასათვლელად
      const dx = e.clientX - startPositionRef.current.x;
      const dy = e.clientY - startPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD) return; // ჯერ არ ჩაითვალოს drag-ად

      hasDraggedRef.current = true;

      const newLeft = e.clientX - dragOffsetRef.current.x;
      const newTop = e.clientY - dragOffsetRef.current.y;

      // საზღვრები - header-ს და footer-ს არ შევეხოთ
      const minLeft = PADDING;
      const maxLeft = window.innerWidth - BUTTON_SIZE - PADDING;
      const minBottom = FOOTER_HEIGHT + PADDING;
      const maxBottom =
        window.innerHeight - HEADER_HEIGHT - BUTTON_SIZE - PADDING;

      const left = Math.max(minLeft, Math.min(maxLeft, newLeft));
      const bottom = Math.max(
        minBottom,
        Math.min(maxBottom, window.innerHeight - newTop - BUTTON_SIZE)
      );

      positionRef.current = { bottom, left };
      setPosition({ bottom, left });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const wasDragging = isDraggingRef.current;
      const didDrag = hasDraggedRef.current;
      
      if (wasDragging) {
        isDraggingRef.current = false;
        setIsDragging(false);
        
        // თუ არ გადაადგილდა (კლიკი იყო) - გავხსნათ კალათა
        if (!didDrag && buttonRef.current?.contains(e.target as Node)) {
          router.push("/cart");
        }
        
        hasDraggedRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      const touch = e.touches[0];

      // შევამოწმოთ საკმარისი მოძრაობა არის თუ არა drag-ად ჩასათვლელად
      const dx = touch.clientX - startPositionRef.current.x;
      const dy = touch.clientY - startPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD) return; // ჯერ არ ჩაითვალოს drag-ად

      e.preventDefault();
      hasDraggedRef.current = true;

      const newLeft = touch.clientX - dragOffsetRef.current.x;
      const newTop = touch.clientY - dragOffsetRef.current.y;

      // საზღვრები - header-ს და footer-ს არ შევეხოთ
      const minLeft = PADDING;
      const maxLeft = window.innerWidth - BUTTON_SIZE - PADDING;
      const minBottom = FOOTER_HEIGHT + PADDING;
      const maxBottom =
        window.innerHeight - HEADER_HEIGHT - BUTTON_SIZE - PADDING;

      const left = Math.max(minLeft, Math.min(maxLeft, newLeft));
      const bottom = Math.max(
        minBottom,
        Math.min(maxBottom, window.innerHeight - newTop - BUTTON_SIZE)
      );

      positionRef.current = { bottom, left };
      setPosition({ bottom, left });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const wasDragging = isDraggingRef.current;
      const didDrag = hasDraggedRef.current;
      
      if (wasDragging) {
        isDraggingRef.current = false;
        setIsDragging(false);
        
        // თუ არ გადაადგილდა (tap იყო) - გავხსნათ კალათა
        if (!didDrag && buttonRef.current?.contains(e.target as Node)) {
          router.push("/cart");
        }
        
        hasDraggedRef.current = false;
      }
    };

    // Always attach listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [router]);

  // Tooltip პოზიციის გამოთვლა - საით არის მეტი ადგილი
  const getTooltipPosition = () => {
    if (typeof window === "undefined") return "right";
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const buttonLeft = position.left;
    const buttonBottom = position.bottom;
    const buttonTop = screenHeight - buttonBottom - BUTTON_SIZE;
    
    // ვნახოთ რომელ მხარეს არის მეტი სივრცე
    const spaceLeft = buttonLeft;
    const spaceRight = screenWidth - buttonLeft - BUTTON_SIZE;
    const spaceTop = buttonTop;
    const spaceBottom = buttonBottom;
    
    // პრიორიტეტით ვირჩევთ: მარჯვნივ > მარცხნივ > ზემოთ > ქვემოთ
    const minSpace = 120; // მინიმალური სივრცე tooltip-ისთვის
    
    if (spaceRight >= minSpace) return "right";
    if (spaceLeft >= minSpace) return "left";
    if (spaceTop >= 80) return "top";
    return "bottom";
  };
  
  const tooltipPosition = getTooltipPosition();

  if (!isVisible) return null;

  return (
    <div
      ref={buttonRef}
      className={`floating-cart-icon ${
        isAnimatingOut ? "animate-out" : "animate-in"
      } ${isDragging ? "dragging" : ""}`}
      style={{
        bottom: `${position.bottom}px`,
        left: `${position.left}px`,
        right: "auto",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      data-cart-toggle="true"
    >
      {showTooltip && !isDragging && (
        <div
          className={`floating-cart-tooltip animate-tooltip tooltip-${tooltipPosition}`}
        >
          გადადი კალათში 🛒
        </div>
      )}

      <div className="cart-icon-wrapper">
        <ShoppingCart className="cart-icon" />
        {totalItems > 0 && (
          <div className="cart-badge animate-badge">
            {totalItems > 99 ? "99+" : totalItems}
          </div>
        )}
      </div>

      {!isDragging && <div className="cart-ripple"></div>}
      <div className="drag-indicator">⋮⋮</div>
    </div>
  );
}
