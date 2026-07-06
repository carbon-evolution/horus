import type { Industry, Policy, EsgProfile, GeoRisk, Chokepoint, RadarAxis } from "@/lib/types";

// Risk & Compliance fixtures. Live sources later: gov RSS / GDELT (policies),
// CDP + company reports (ESG), GDELT + World Bank (geopolitical).
interface RiskBlock {
  policies: Policy[];
  esg: EsgProfile[];
  geo: GeoRisk[];
  // Per-entity radars for side-by-side compare (0-100 risk per axis).
  compareRadar: { entity: string; color: string; axes: RadarAxis[] }[];
}

const AXES = ["Geopolitical", "Supplier Conc.", "Financial", "Operational", "Regulatory", "ESG", "Raw Material", "Logistics"];
const mk = (vals: number[]): RadarAxis[] => AXES.map((axis, i) => ({ axis, value: vals[i] }));

// Build the entity series plus a "Sector Avg" that is the TRUE mean of those
// entities, so the composite line is always consistent with them — and with the
// dashboard radar, which is derived from this same Sector Avg (see fixtures.ts).
type Entity = { entity: string; color: string; vals: number[] };
function withAvg(entities: Entity[]): { entity: string; color: string; axes: RadarAxis[] }[] {
  const series = entities.map((e) => ({ entity: e.entity, color: e.color, axes: mk(e.vals) }));
  const avg = AXES.map((axis, i) => ({
    axis,
    value: Math.round(series.reduce((s, e) => s + e.axes[i].value, 0) / series.length),
  }));
  return [...series, { entity: "Sector Avg", color: "#f59e0b", axes: avg }];
}

export const CHOKEPOINTS: Chokepoint[] = [
  { name: "Taiwan Strait", share: "~90% of advanced logic transits/originates", risk: "high" },
  { name: "Strait of Malacca", share: "~40% of global trade volume", risk: "high" },
  { name: "South China Sea", share: "~33% of global shipping", risk: "high" },
  { name: "Suez Canal", share: "~12% of global trade", risk: "medium" },
  { name: "Panama Canal", share: "~5% of global trade (drought-constrained)", risk: "medium" },
  { name: "Strait of Hormuz", share: "~20% of petroleum + specialty gases", risk: "medium" },
];

const semiconductor: RiskBlock = {
  policies: [
    { id: "p1", title: "US CHIPS and Science Act — fab incentive tranche 3", authority: "US Dept. of Commerce", region: "USA", date: "2024-05-12", severity: "medium", targets: ["Intel", "TSMC", "Samsung"], summary: "New $6.6B award conditions tie funding to domestic capacity milestones." },
    { id: "p2", title: "Advanced chip export controls to China (Oct-23 update)", authority: "US BIS", region: "USA → China", date: "2024-04-04", severity: "high", targets: ["NVIDIA", "AMD", "Applied Materials"], summary: "Performance-density thresholds tightened; A800/H800 class banned." },
    { id: "p3", title: "EU Chips Act — pillar 2 capacity funding", authority: "European Commission", region: "EU", date: "2024-03-21", severity: "medium", targets: ["TSMC (ESMC)", "Intel", "Infineon"], summary: "€43B mobilized; Dresden mega-fab cleared state-aid review." },
    { id: "p4", title: "China gallium/germanium export licensing", authority: "MOFCOM", region: "China → Global", date: "2023-08-01", severity: "high", targets: ["Compound semi makers"], summary: "Export permits required; shipments down ~50% initial months." },
    { id: "p5", title: "Netherlands DUV immersion export restrictions", authority: "Dutch Govt / ASML", region: "NL → China", date: "2024-01-01", severity: "high", targets: ["ASML", "SMIC"], summary: "NXT:2000i-class immersion tools now license-refused to China." },
    { id: "p6", title: "Japan 23-item equipment export controls", authority: "METI", region: "Japan → China", date: "2023-07-23", severity: "medium", targets: ["Tokyo Electron", "Nikon"], summary: "Alignment with US controls on deposition/litho equipment." },
  ],
  esg: [
    { company: "TSMC", scope1: 2.2, scope2: 8.1, scope3: 12.4, waterRisk: "high", netZeroTarget: "2050", ethicalSourcing: "low" },
    { company: "Samsung", scope1: 4.1, scope2: 12.3, scope3: 18.9, waterRisk: "medium", netZeroTarget: "2050", ethicalSourcing: "low" },
    { company: "Intel", scope1: 1.9, scope2: 3.2, scope3: 9.8, waterRisk: "medium", netZeroTarget: "2040", ethicalSourcing: "low" },
    { company: "NVIDIA", scope1: 0.1, scope2: 0.6, scope3: 3.4, waterRisk: "low", netZeroTarget: "2035 (ops)", ethicalSourcing: "medium" },
    { company: "ASML", scope1: 0.2, scope2: 0.4, scope3: 5.1, waterRisk: "low", netZeroTarget: "2040", ethicalSourcing: "low" },
    { company: "SK hynix", scope1: 2.8, scope2: 6.9, scope3: 8.7, waterRisk: "medium", netZeroTarget: "2050", ethicalSourcing: "medium" },
    { company: "Micron", scope1: 1.6, scope2: 4.4, scope3: 7.2, waterRisk: "high", netZeroTarget: "2050", ethicalSourcing: "low" },
  ],
  geo: [
    { country: "Taiwan", flag: "🇹🇼", tension: 82, role: "Advanced logic (>90% at ≤5nm)", localization: 88, chokepoints: ["Taiwan Strait"] },
    { country: "China", flag: "🇨🇳", tension: 78, role: "Mature nodes, packaging, gallium/rare earths", localization: 72, chokepoints: ["Taiwan Strait", "South China Sea"] },
    { country: "South Korea", flag: "🇰🇷", tension: 58, role: "Memory (DRAM/HBM/NAND)", localization: 75, chokepoints: ["South China Sea"] },
    { country: "USA", flag: "🇺🇸", tension: 45, role: "Design, EDA, equipment; fab re-shoring", localization: 42, chokepoints: [] },
    { country: "Japan", flag: "🇯🇵", tension: 38, role: "Materials (photoresist, wafers), equipment", localization: 68, chokepoints: ["South China Sea"] },
    { country: "Netherlands", flag: "🇳🇱", tension: 30, role: "EUV lithography monopoly (ASML)", localization: 55, chokepoints: [] },
    { country: "Ukraine", flag: "🇺🇦", tension: 90, role: "Neon gas (~50% semiconductor-grade)", localization: 20, chokepoints: [] },
  ],
  compareRadar: withAvg([
    { entity: "TSMC", color: "#38bdf8", vals: [85, 60, 25, 55, 60, 45, 65, 60] },
    { entity: "Intel", color: "#a78bfa", vals: [40, 55, 70, 65, 45, 40, 55, 45] },
    { entity: "Samsung", color: "#34d399", vals: [60, 55, 40, 55, 50, 50, 60, 55] },
  ]),
};

const ai: RiskBlock = {
  policies: [
    { id: "a1", title: "AI diffusion rule — compute export tiers", authority: "US BIS", region: "USA → Global", date: "2024-05-02", severity: "high", targets: ["NVIDIA", "AMD", "Hyperscalers"], summary: "Tiered country caps on accelerator exports; license floors by TPP." },
    { id: "a2", title: "EU AI Act — GPAI obligations in force", authority: "European Commission", region: "EU", date: "2024-08-01", severity: "medium", targets: ["OpenAI", "Anthropic", "Meta"], summary: "Systemic-risk model duties: evals, incident reporting, cybersecurity." },
    { id: "a3", title: "Datacenter grid-connection moratoria (multiple)", authority: "State/National regulators", region: "US / IE / NL", date: "2024-03-15", severity: "medium", targets: ["Microsoft", "Amazon", "Google"], summary: "Power-constrained regions pause new DC interconnects." },
    { id: "a4", title: "Cloud KYC for foreign training runs (proposed)", authority: "US Dept. of Commerce", region: "USA", date: "2024-01-29", severity: "medium", targets: ["AWS", "Azure", "GCP"], summary: "IaaS providers must verify identities of foreign large-training customers." },
  ],
  esg: [
    { company: "Microsoft", scope1: 0.3, scope2: 6.8, scope3: 15.4, waterRisk: "medium", netZeroTarget: "2030 (neg.)", ethicalSourcing: "low" },
    { company: "Alphabet", scope1: 0.2, scope2: 5.1, scope3: 12.2, waterRisk: "medium", netZeroTarget: "2030", ethicalSourcing: "low" },
    { company: "Amazon", scope1: 15.3, scope2: 5.6, scope3: 50.2, waterRisk: "medium", netZeroTarget: "2040", ethicalSourcing: "medium" },
    { company: "Meta", scope1: 0.1, scope2: 4.2, scope3: 8.9, waterRisk: "high", netZeroTarget: "2030", ethicalSourcing: "low" },
    { company: "NVIDIA", scope1: 0.1, scope2: 0.6, scope3: 3.4, waterRisk: "low", netZeroTarget: "2035 (ops)", ethicalSourcing: "medium" },
  ],
  geo: [
    { country: "USA", flag: "🇺🇸", tension: 45, role: "Frontier models, GPUs, hyperscale DCs", localization: 65, chokepoints: [] },
    { country: "Taiwan", flag: "🇹🇼", tension: 82, role: "GPU fabrication + CoWoS packaging", localization: 85, chokepoints: ["Taiwan Strait"] },
    { country: "South Korea", flag: "🇰🇷", tension: 58, role: "HBM memory (SK hynix/Samsung)", localization: 78, chokepoints: ["South China Sea"] },
    { country: "China", flag: "🇨🇳", tension: 78, role: "Restricted-market models + domestic accelerators", localization: 60, chokepoints: ["South China Sea"] },
    { country: "Middle East", flag: "🇦🇪", tension: 52, role: "Sovereign AI datacenter buildouts", localization: 25, chokepoints: ["Strait of Hormuz"] },
  ],
  compareRadar: withAvg([
    { entity: "NVIDIA", color: "#38bdf8", vals: [70, 88, 20, 55, 75, 40, 60, 45] },
    { entity: "Microsoft", color: "#a78bfa", vals: [45, 80, 15, 50, 60, 55, 40, 35] },
    { entity: "CoreWeave", color: "#34d399", vals: [50, 90, 65, 60, 55, 45, 55, 40] },
  ]),
};

const battery: RiskBlock = {
  policies: [
    { id: "b1", title: "EU Critical Raw Materials Act — benchmarks live", authority: "European Commission", region: "EU", date: "2024-05-23", severity: "medium", targets: ["CATL", "LG Energy", "Umicore"], summary: "2030 targets: 10% mined, 40% processed, 25% recycled domestically." },
    { id: "b2", title: "IRA 30D — foreign entity of concern rules", authority: "US Treasury / DOE", region: "USA", date: "2024-01-01", severity: "high", targets: ["CATL", "Gotion", "Ford-CATL JV"], summary: "EV credits void if battery components from FEOC (incl. China)." },
    { id: "b3", title: "China graphite export licensing", authority: "MOFCOM", region: "China → Global", date: "2023-12-01", severity: "high", targets: ["Anode makers", "Tesla", "Panasonic"], summary: "Spherical/synthetic graphite requires export permits." },
    { id: "b4", title: "EU Battery Regulation — carbon footprint declaration", authority: "European Commission", region: "EU", date: "2024-02-18", severity: "medium", targets: ["All cell makers"], summary: "Mandatory CO2 footprint disclosure per battery model from 2025." },
    { id: "b5", title: "Indonesia nickel ore export ban (ongoing)", authority: "Indonesian Govt", region: "Indonesia", date: "2020-01-01", severity: "medium", targets: ["Nickel refiners"], summary: "Forces domestic HPAL/smelting investment; reshapes nickel flows." },
  ],
  esg: [
    { company: "CATL", scope1: 3.1, scope2: 9.4, scope3: 28.2, waterRisk: "medium", netZeroTarget: "2035 (ops)", ethicalSourcing: "high" },
    { company: "BYD", scope1: 4.2, scope2: 11.1, scope3: 24.6, waterRisk: "medium", netZeroTarget: "2045", ethicalSourcing: "high" },
    { company: "Tesla", scope1: 0.6, scope2: 2.8, scope3: 30.7, waterRisk: "medium", netZeroTarget: "2040", ethicalSourcing: "medium" },
    { company: "LG Energy", scope1: 1.2, scope2: 5.6, scope3: 14.8, waterRisk: "low", netZeroTarget: "2050", ethicalSourcing: "medium" },
    { company: "Panasonic", scope1: 2.2, scope2: 4.9, scope3: 12.1, waterRisk: "low", netZeroTarget: "2030 (ops)", ethicalSourcing: "low" },
  ],
  geo: [
    { country: "China", flag: "🇨🇳", tension: 78, role: "Cell mfg (~75%), graphite, refining dominance", localization: 90, chokepoints: ["South China Sea", "Strait of Malacca"] },
    { country: "DR Congo", flag: "🇨🇩", tension: 74, role: "Cobalt mining (~74% global)", localization: 15, chokepoints: [] },
    { country: "Indonesia", flag: "🇮🇩", tension: 48, role: "Nickel (~55% global, HPAL boom)", localization: 45, chokepoints: ["Strait of Malacca"] },
    { country: "Australia", flag: "🇦🇺", tension: 25, role: "Lithium spodumene (~47%)", localization: 30, chokepoints: [] },
    { country: "Chile", flag: "🇨🇱", tension: 35, role: "Lithium brine (~24%), nationalization drift", localization: 40, chokepoints: ["Panama Canal"] },
    { country: "USA", flag: "🇺🇸", tension: 45, role: "Gigafactory buildout, IRA onshoring", localization: 35, chokepoints: [] },
  ],
  compareRadar: withAvg([
    { entity: "CATL", color: "#38bdf8", vals: [75, 70, 35, 55, 70, 80, 85, 60] },
    { entity: "Tesla", color: "#a78bfa", vals: [55, 75, 30, 50, 55, 65, 80, 55] },
    { entity: "LG Energy", color: "#34d399", vals: [50, 60, 45, 55, 50, 55, 75, 50] },
  ]),
};

export const RISK_DATA: Record<Industry, RiskBlock> = { semiconductor, ai, battery };
