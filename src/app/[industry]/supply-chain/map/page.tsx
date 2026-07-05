"use client";
import dynamic from "next/dynamic";

// The 3D force graph pulls in three.js — load it only on this route, client-only.
const SupplyChainMap = dynamic(() => import("@/components/supply/SupplyChainMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[72vh] items-center justify-center text-sm text-[var(--text-dim)]">Loading 3D supply-chain graph…</div>
  ),
});

export default function Page() {
  return <SupplyChainMap />;
}
