'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * UpdateBanner — Detects new deployments and shows a reload prompt.
 * 
 * How it works:
 * 1. On mount, fetches /api/version to get current build version
 * 2. Every 60 seconds, re-checks the version
 * 3. If version changes (new deployment), shows a sticky banner
 * 4. User clicks "Perbarui" to hard-reload
 */
export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const initialVersion = useRef<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const ver = data.version;

        if (!initialVersion.current) {
          // First load — store the version
          initialVersion.current = ver;
          return;
        }

        // Version changed — new deployment detected
        if (ver !== initialVersion.current) {
          setShowBanner(true);
        }
      } catch {
        // Network error — ignore silently
      }
    };

    // Initial check
    checkVersion();

    // Poll every 60 seconds
    interval = setInterval(checkVersion, 60_000);

    return () => clearInterval(interval);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 max-w-md">
        <div className="flex-shrink-0 text-2xl">🔄</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Versi baru tersedia!</p>
          <p className="text-xs text-blue-200 mt-0.5">Dashboard telah diperbarui. Reload untuk mendapatkan fitur terbaru.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex-shrink-0 bg-white text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          Perbarui
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="flex-shrink-0 text-blue-200 hover:text-white text-lg leading-none"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
