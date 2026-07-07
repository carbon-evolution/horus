// Cross-verification: every company must have an HQ and at least one
// non-HQ unit; facility ids unique; companyIds valid; coords in range.
import { DATA } from "../src/lib/data";
import type { Industry } from "../src/lib/types";

let failures = 0;
for (const industry of Object.keys(DATA) as Industry[]) {
  const { companies, facilities } = DATA[industry];
  const ids = new Set<string>();
  const companyIds = new Set(companies.map((c) => c.id));

  for (const f of facilities) {
    if (ids.has(f.id)) { console.error(`[${industry}] duplicate facility id: ${f.id}`); failures++; }
    ids.add(f.id);
    if (!companyIds.has(f.companyId)) { console.error(`[${industry}] ${f.id} references unknown company: ${f.companyId}`); failures++; }
    if (Math.abs(f.lat) > 90 || Math.abs(f.lng) > 180) { console.error(`[${industry}] ${f.id} coords out of range: ${f.lat}, ${f.lng}`); failures++; }
    if (!f.city?.trim() || !f.country?.trim()) { console.error(`[${industry}] ${f.id} missing city/country`); failures++; }
  }

  for (const c of companies) {
    const mine = facilities.filter((f) => f.companyId === c.id);
    const hq = mine.filter((f) => f.type === "hq").length;
    const units = mine.length - hq;
    if (hq !== 1) { console.error(`[${industry}] ${c.name}: expected 1 HQ, found ${hq}`); failures++; }
    if (units < 1) { console.error(`[${industry}] ${c.name}: no non-HQ units`); failures++; }
  }
  console.log(`[${industry}] ${companies.length} companies, ${facilities.length} facilities checked`);
}

if (failures) { console.error(`FAILED: ${failures} problem(s)`); process.exit(1); }
console.log("OK: every company has 1 HQ + ≥1 unit; all ids/coords valid");
