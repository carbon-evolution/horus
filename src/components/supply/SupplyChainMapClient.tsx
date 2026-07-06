"use client";
import dynamic from "next/dynamic";
import type { GraphData } from "@/lib/types";

// The 3D force graph pulls in three.js — load it only on this route, client-only.
// This thin client wrapper lets the server page pass the graph in as a prop.
const SupplyChainMap = dynamic(() => import("@/components/supply/SupplyChainMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[72vh] items-center justify-center text-sm text-[var(--text-dim)]">Loading 3D supply-chain graph…</div>
  ),
});

export function SupplyChainMapClient({ graph }: { graph: GraphData }) {
  return <SupplyChainMap graph={graph} />;
}
