"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Industry } from "@/lib/types";

interface AppState {
  industry: Industry;
  setIndustry: (i: Industry) => void;
  // Cross-panel focus: selecting a company filters peripheral widgets.
  focusCompany: string | null;
  setFocusCompany: (id: string | null) => void;
  // User-pinned company ids (persisted to localStorage).
  watchlist: string[];
  toggleWatch: (id: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      industry: "semiconductor",
      setIndustry: (industry) => set({ industry }),
      focusCompany: null,
      setFocusCompany: (focusCompany) => set({ focusCompany }),
      watchlist: [],
      toggleWatch: (id) =>
        set((s) => ({ watchlist: s.watchlist.includes(id) ? s.watchlist.filter((x) => x !== id) : [...s.watchlist, id] })),
    }),
    { name: "scr-radar", partialize: (s) => ({ industry: s.industry, watchlist: s.watchlist }) },
  ),
);
