"use client";
import { useApp } from "@/lib/store";
import { getCompany, getCompanies } from "@/lib/provider";

// Cross-panel focus helper. The store keeps the focused company *id*; most
// fixtures reference companies by *name*, so matching here is name-based and
// bidirectional-contains to survive short forms ("TSMC" in "TSMC ↔ NVIDIA").
export function useFocus() {
  const industry = useApp((s) => s.industry);
  const focusId = useApp((s) => s.focusCompany);
  const setFocusCompany = useApp((s) => s.setFocusCompany);
  const focusName = focusId ? (getCompany(industry, focusId)?.name ?? null) : null;
  const active = !!focusName;

  const toggleFocus = (id: string) => setFocusCompany(focusId === id ? null : id);
  const clearFocus = () => setFocusCompany(null);
  const matchesText = (text: string) => {
    if (!focusName) return false;
    const a = text.toLowerCase();
    const b = focusName.toLowerCase();
    return a.includes(b) || b.includes(a);
  };
  const nameToId = (name: string) =>
    getCompanies(industry).find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;

  return { focusId, focusName, active, toggleFocus, clearFocus, matchesText, nameToId, setFocusCompany };
}

// Shared treatment: when a focus is active, non-matching rows/items dim.
export function focusDim(active: boolean, matched: boolean): string {
  return active && !matched ? "opacity-35" : "";
}
