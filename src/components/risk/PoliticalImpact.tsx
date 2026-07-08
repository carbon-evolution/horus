"use client";
import { useMemo, useState } from "react";
import type { GeoRisk, RawMaterial, SupplierEdge } from "@/lib/types";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatTile } from "@/components/ui/StatTile";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { PoliticalImpactMap } from "@/components/risk/PoliticalImpactMap";

const tensionColor = (t: number) => (t >= 70 ? "var(--risk-high)" : t >= 45 ? "var(--risk-med)" : "var(--risk-low)");
const supplyColor = (r: string) => (r === "high" ? "#ef4444" : r === "medium" ? "#f59e0b" : "#34d399");

function matchMaterial(edgeMat: string, name: string) {
  const a = edgeMat.toLowerCase(), b = name.toLowerCase();
  return a.includes(b) || b.includes(a);
}

export function PoliticalImpact({ geo, materials, edges }: { geo: GeoRisk[]; materials: RawMaterial[]; edges: SupplierEdge[] }) {
  const tensionOf = useMemo(() => new Map(geo.map((g) => [g.country, g])), [geo]);

  // Producer countries that also have tension data, ranked by instability.
  const producers = useMemo(() => {
    const set = new Set<string>();
    for (const m of materials) for (const p of m.topProducers) set.add(p.country);
    return [...set]
      .map((c) => ({ country: c, tension: tensionOf.get(c)?.tension ?? null }))
      .sort((a, b) => (b.tension ?? -1) - (a.tension ?? -1));
  }, [materials, tensionOf]);

  const [country, setCountry] = useState<string>(producers[0]?.country ?? "");
  const g = tensionOf.get(country);

  const impact = useMemo(() => {
    const mats = materials
      .filter((m) => m.topProducers.some((p) => p.country === country))
      .map((m) => {
        const share = m.topProducers.find((p) => p.country === country)?.share ?? 0;
        const deps = edges.filter((e) => matchMaterial(e.material, m.name));
        return {
          material: m,
          share,
          buyers: [...new Set(deps.map((e) => e.buyer))],
          suppliers: [...new Set(deps.map((e) => e.supplier))],
        };
      })
      .sort((a, b) => b.share - a.share);
    const companies = [...new Set(mats.flatMap((x) => x.buyers))];
    return { mats, companies };
  }, [country, materials, edges]);

  const highTension = producers.filter((p) => (p.tension ?? 0) >= 70).length;
  const atRiskMaterials = new Set(materials.filter((m) => m.topProducers.some((p) => (tensionOf.get(p.country)?.tension ?? 0) >= 70)).map((m) => m.name)).size;
  const topInstability = producers[0];

  if (!producers.length) return null;

  return (
    <div>
      <div className="mb-3 text-[11px] text-[var(--text-dim)]">
        Political instability in a producing country cascades to the raw materials sourced there and the companies that depend on them. Click a country on the map or a chip to trace the chain; dashed arcs show where else each material is produced.
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Producing Countries" value={producers.length} icon="Globe" accent="#a78bfa" />
        <StatTile label="High-Tension Producers" value={highTension} icon="TriangleAlert" accent="#ef4444" />
        <StatTile label="Materials At Risk" value={atRiskMaterials} icon="Boxes" accent="#f59e0b" />
        <StatTile label="Top Instability" value={topInstability?.tension ?? "—"} sub={topInstability?.country} icon="Crosshair" accent="#38bdf8" />
      </div>

      {/* world map of producing countries */}
      <div className="mb-3">
        <PoliticalImpactMap geo={geo} materials={materials} selected={country} onSelectAction={setCountry} />
      </div>

      {/* country chips ranked by tension */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {producers.map((p) => {
          const sel = p.country === country;
          return (
            <button
              key={p.country}
              onClick={() => setCountry(p.country)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                sel ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]" : "border-[var(--panel-border)] text-[var(--text-dim)] hover:bg-white/5"
              }`}
            >
              {p.country}
              {p.tension != null && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tensionColor(p.tension) }} />}
              <span className="tabular-nums text-[10px] text-[var(--text-faint)]">{p.tension ?? "—"}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* materials at risk */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{country}</span>
            {g && <span className="text-[11px]" style={{ color: tensionColor(g.tension) }}>tension {g.tension} · {g.role}</span>}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Materials sourced here</div>
          <div className="mt-1.5 space-y-2">
            {impact.mats.map(({ material: m, share }) => (
              <div key={m.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{m.name}</span>
                  <RiskBadge level={m.supplyRisk} label={`${m.supplyRisk} supply`} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--panel)]">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, background: supplyColor(m.supplyRisk) }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-[10px] text-[var(--text-faint)]">{share}% from {country}</span>
                </div>
                <div className="mt-1 text-[10px] text-[var(--text-faint)]">Feeds {m.usedIn} · {m.price}</div>
              </div>
            ))}
            {impact.mats.length === 0 && <div className="text-[11px] text-[var(--text-faint)]">No tracked materials sourced from {country}.</div>}
          </div>
        </div>

        {/* dependent companies */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Companies dependent on these materials</div>
          {impact.companies.length ? (
            <div className="mt-1.5 space-y-1.5">
              {impact.mats.filter((x) => x.buyers.length).map(({ material: m, buyers, suppliers }) => (
                <div key={m.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: supplyColor(m.supplyRisk) }} />
                    <span className="font-medium">{m.name}</span>
                    <span className="text-[var(--text-faint)]">→</span>
                    <span className="flex flex-wrap gap-1">
                      {buyers.map((b) => <CompanyLink key={b} name={b} />)}
                    </span>
                  </div>
                  {suppliers.length > 0 && (
                    <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">via supplier{suppliers.length > 1 ? "s" : ""}: {suppliers.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1.5 text-[11px] text-[var(--text-faint)]">
              No direct company dependency is tracked for {country}&apos;s materials in this industry&apos;s supplier map — the exposure flows through downstream inputs (see the materials&apos; end-uses at left).
            </div>
          )}

          {g && impact.mats.length > 0 && (
            <div className="mt-3 rounded-lg p-2 text-[11px]" style={{ background: `${tensionColor(g.tension)}18`, color: tensionColor(g.tension) }}>
              Instability in {country} (tension {g.tension}) threatens output of {impact.mats.map((x) => x.material.name).join(", ")}
              {impact.companies.length > 0 && <> — directly impacting {impact.companies.join(", ")}</>}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
