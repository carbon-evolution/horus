"use client";
import { create } from "zustand";
import type { Industry } from "@/lib/types";

interface AppState {
  industry: Industry;
  setIndustry: (i: Industry) => void;
  // Cross-panel focus: selecting a company filters peripheral widgets.
  focusCompany: string | null;
  setFocusCompany: (id: string | null) => void;
}

export const useApp = create<AppState>((set) => ({
  industry: "semiconductor",
  setIndustry: (industry) => set({ industry }),
  focusCompany: null,
  setFocusCompany: (focusCompany) => set({ focusCompany }),
}));
