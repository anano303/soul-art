"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import "./user-menu.css";
import { Role } from "@/types/role";
import { useAuth } from "@/hooks/use-auth";

export default function UserMenu() {
  const { user, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Add state to store profile image URL
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Update profile image when user changes
  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    } else {
      setProfileImage("/avatar.jpg");
    }

    // დავამატოთ ლოგი დებაგისთვის
    console.log("User profile updated:", user);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return <div className="loader"></div>;
  }

  if (!user) {
    return (
      <Link href="/login" className="button">
        <span className="icon">
          🎭{" "}
          {/* <Image src={hunterIcon} alt="hunterIcon" width={28} height={28} /> */}
          შესვლა{" "}
        </span>
      </Link>
    );
  }

  return (
    <div className="dropdown" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="button"
        aria-label="Toggle user menu"
      >
        <div className="user-avatar">
          <Image 
            src={profileImage || "/avatar.jpg"} 
            alt={user.name}
            width={32} 
            height={32}
            className="avatar-image"
          />
        </div>
        <span className="username">{user.name || 'მომხმარებელი'}</span>
        <span className="icon">▼</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-label">ჩემი ანგარიში</div>
          <hr />
          <Link href="/profile" className="dropdown-item" onClick={() => setIsOpen(false)}>
            პროფილი
          </Link>
          <Link href="/profile/orders" className="dropdown-item" onClick={() => setIsOpen(false)}>
            შეკვეთები
          </Link>

          {(user.role === Role.Admin || user.role === Role.Seller) && (
            <>
              <hr />
              <div className="dropdown-label">ადმინ პანელი</div>
              <Link href="/admin/products" className="dropdown-item" onClick={() => setIsOpen(false)}>
                პროდუქტები
              </Link>
            </>
          )}

          {user.role === Role.Admin && (
            <>
              <Link href="/admin/users" className="dropdown-item" onClick={() => setIsOpen(false)}>
              მომხმარებლები
              </Link>
              <Link href="/admin/orders" className="dropdown-item" onClick={() => setIsOpen(false)}>
              შეკვეთები
              </Link>
            </>
          )}

          <hr />
          <button 
            onClick={() => {
              setIsOpen(false);
              logout();
            }} 
            className="dropdown-item logout-button"
          >
            გასვლა
          </button>
        </div>
      )}
    </div>
  );
}
