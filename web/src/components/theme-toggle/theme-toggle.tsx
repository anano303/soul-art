"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/ThemeContext";
import "./theme-toggle.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      title={theme === "light" ? "Dark Mode" : "Light Mode"}
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
