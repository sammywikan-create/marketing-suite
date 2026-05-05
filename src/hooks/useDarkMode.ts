"use client";
import { useState, useEffect, useCallback } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(false);

  // Read initial preference from localStorage or system
  useEffect(() => {
    const stored = localStorage.getItem("ms_dark_mode");
    if (stored !== null) {
      setDark(stored === "true");
    } else {
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  // Apply class to <html>
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("ms_dark_mode", String(next));
      return next;
    });
  }, []);

  return { dark, toggle };
}
