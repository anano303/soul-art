"use client";

import { useState } from "react";
import "./avatar.css";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

// Fixed pool of brand-harmonious avatar tones (navy / gold / bronze family).
// Same name → same colour, but constrained to the brand palette.
const AVATAR_COLORS = [
  "#0a1f44", // navy
  "#0f3d63", // navy (lighter) — replaces the slate tone that read purplish
  "#a67c3d", // gold-bronze
  "#6b4a23", // deep bronze
  "#8a5a2b", // warm bronze
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const DEFAULTS = ["/avatar.jpg", "/avatar.png", "/default-avatar.jpg"];

/**
 * Avatar with a graceful initials fallback (coloured circle) instead of a grey
 * silhouette or a generic default image. Same name → same colour.
 */
export function Avatar({ src, name, size = 48, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = (name || "").trim() || "?";
  const isDefaultImg = !!src && DEFAULTS.some((d) => src.includes(d));
  const showImage = !!src && !failed && !isDefaultImg;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src as string}
        alt={label}
        width={size}
        height={size}
        className={`sa-avatar sa-avatar--img ${className}`}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  const bg = colorFromName(label);
  return (
    <div
      className={`sa-avatar sa-avatar--initials ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: bg,
      }}
      aria-label={label}
      role="img"
    >
      {initials(label)}
    </div>
  );
}

export default Avatar;
