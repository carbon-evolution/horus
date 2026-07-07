// Maritime chokepoint routing (estimate). Maps a sea lane (origin → destination
// country) to the primary shipping chokepoints a vessel would transit, using
// coarse maritime regions. This is a routing heuristic for exposure analysis,
// not a routed nautical path — regional hops may be approximate.

type Region = "EA" | "SEA" | "SA" | "GULF" | "MED" | "EU" | "NA" | "SAM_P" | "SAM_A" | "AFR" | "OCE" | "?";

const REGION: Record<string, Region> = {
  // East Asia (behind the South China Sea / Taiwan Strait)
  China: "EA", "Hong Kong": "EA", "South Korea": "EA", Taiwan: "EA", Japan: "EA",
  // South-East Asia (astride the Strait of Malacca)
  Vietnam: "SEA", Malaysia: "SEA", Indonesia: "SEA", Singapore: "SEA", Thailand: "SEA", Philippines: "SEA",
  // South Asia (Indian Ocean, west of Malacca)
  India: "SA", Bangladesh: "SA",
  // Persian Gulf (behind the Strait of Hormuz)
  UAE: "GULF", "Saudi Arabia": "GULF", Qatar: "GULF", Iran: "GULF", Kuwait: "GULF", Bahrain: "GULF",
  // Mediterranean / Levant
  Israel: "MED", Turkey: "MED", Egypt: "MED",
  // Europe (Atlantic / North Sea, Suez-side of Asia trade)
  Netherlands: "EU", Germany: "EU", UK: "EU", Ireland: "EU", France: "EU", Sweden: "EU",
  Poland: "EU", Hungary: "EU", Italy: "EU", Spain: "EU", Finland: "EU", Belgium: "EU",
  // North America
  USA: "NA", Canada: "NA", Mexico: "NA",
  // South America
  Chile: "SAM_P", Peru: "SAM_P", Colombia: "SAM_P",
  Brazil: "SAM_A", Argentina: "SAM_A",
  // Africa
  "DR Congo": "AFR", "South Africa": "AFR", Morocco: "AFR", Nigeria: "AFR",
  // Oceania
  Australia: "OCE", "New Zealand": "OCE",
};

const WEST_OF_MALACCA: Region[] = ["EU", "MED", "GULF", "SA", "AFR"];

export function regionOf(country: string): Region {
  return REGION[country] ?? "?";
}

/** Primary chokepoints a sea lane between two countries is estimated to transit. */
export function chokepointsForLane(origin: string, dest: string): string[] {
  const a = regionOf(origin), b = regionOf(dest);
  if (a === "?" || b === "?" || (a === b && origin !== "Taiwan" && dest !== "Taiwan")) {
    // unknown region or a purely regional hop within one basin
    const cps = new Set<string>();
    if (origin === "Taiwan" || dest === "Taiwan") cps.add("Taiwan Strait");
    return [...cps];
  }
  const set = new Set<Region>([a, b]);
  const has = (r: Region) => set.has(r);
  const between = (g1: Region[], g2: Region[]) =>
    (g1.includes(a) && g2.includes(b)) || (g1.includes(b) && g2.includes(a));

  const cps = new Set<string>();

  // Strait of Hormuz — any Persian Gulf endpoint.
  if (has("GULF")) cps.add("Strait of Hormuz");

  // Suez Canal — Europe/Mediterranean ↔ Asia/Gulf.
  if (between(["EU", "MED"], ["EA", "SEA", "SA", "GULF"])) cps.add("Suez Canal");

  // Strait of Malacca — Indian Ocean / west ↔ East & SE Asia.
  if (between(WEST_OF_MALACCA, ["EA", "SEA"])) cps.add("Strait of Malacca");

  // South China Sea — East Asia reached from the south or west (SE Asia, Indian
  // Ocean, Europe, or via the Indonesian straits from Oceania). NOT trans-Pacific
  // arrivals (the Americas), which approach from the east via the Taiwan Strait.
  if (has("EA") && between(["EA"], ["SEA", "SA", "EU", "MED", "GULF", "AFR", "OCE"])) {
    cps.add("South China Sea");
  }

  // Taiwan Strait — any Taiwan endpoint, or East Asia ↔ trans-Pacific / Oceania.
  if (origin === "Taiwan" || dest === "Taiwan" || between(["EA"], ["NA", "SAM_P", "OCE"])) {
    cps.add("Taiwan Strait");
  }

  // Panama Canal — Atlantic South America / US-East ↔ Pacific.
  if (between(["SAM_A"], ["EA", "SEA", "SAM_P", "NA", "OCE"])) cps.add("Panama Canal");

  return [...cps];
}

/** Parse a volume string like "$1.8B/yr" or "$712M/yr" to a number of $B. */
export function volumeToBillions(volume: string): number {
  const n = parseFloat(volume.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return /B/i.test(volume) ? n : /M/i.test(volume) ? n / 1000 : n;
}

// [lat, lng] for map projection. Chokepoints at their real straits; countries
// at a representative major port so routes read as sea lanes.
export const CHOKEPOINT_COORD: Record<string, [number, number]> = {
  "Strait of Malacca": [2.5, 101.3],
  "Strait of Hormuz": [26.6, 56.3],
  "Suez Canal": [30.5, 32.3],
  "Panama Canal": [9.1, -79.7],
  "Taiwan Strait": [24.5, 119.6],
  "South China Sea": [13.0, 114.0],
};

// Curated open-water via-points for major legs so routes bend around landmasses
// (Indian Ocean around India, up the Red Sea to Suez, through the Med to N. Europe)
// instead of cutting across continents. Keyed "A>B"; looked up in either order.
export const SEA_VIA: Record<string, [number, number][]> = {
  "Strait of Malacca>Suez Canal": [[6, 80], [13, 62], [12.5, 45], [20, 38]],
  "Suez Canal>Netherlands": [[33.5, 24], [37, 11], [36, -6], [46, -8]],
  "Suez Canal>Germany": [[33.5, 24], [37, 11], [36, -6], [48, -6]],
  "India>Strait of Malacca": [[5, 82], [6, 95]],
  "South China Sea>Strait of Malacca": [[2, 105]],
  "South China Sea>Taiwan Strait": [[18, 117]],
  // Australia (NW bulk-export coast) north through the Indonesian straits into
  // the South China Sea — never across the continent.
  "Australia>South China Sea": [[-8.5, 116], [0, 118], [8, 115]],
  "Australia>Strait of Malacca": [[-10, 114], [-2, 106]],
  // Trans-Pacific arcs from the Americas' Pacific coast to East Asia — open
  // ocean across the mid-Pacific, approaching via the Taiwan Strait.
  "Chile>Taiwan Strait": [[-22, -150], [5, 170]],
  "Peru>Taiwan Strait": [[-8, -140], [8, 165]],
  "USA>Taiwan Strait": [[30, -160], [22, 175]],
};

export function seaVia(a: string, b: string): [number, number][] {
  const f = SEA_VIA[`${a}>${b}`];
  if (f) return f;
  const r = SEA_VIA[`${b}>${a}`];
  return r ? [...r].reverse() : [];
}

export const COUNTRY_COORD: Record<string, [number, number]> = {
  China: [31.2, 121.5],        // Shanghai
  "Hong Kong": [22.3, 114.2],
  Taiwan: [24.8, 120.9],
  "South Korea": [35.1, 129.0], // Busan
  Japan: [35.4, 139.7],
  Vietnam: [10.8, 106.7],
  Malaysia: [3.0, 101.4],
  Indonesia: [-6.1, 106.8],
  Singapore: [1.3, 103.8],
  India: [19.0, 72.9],          // Mumbai
  UAE: [25.0, 55.1],
  "Saudi Arabia": [26.6, 50.1],
  Israel: [32.8, 35.0],         // Haifa
  Netherlands: [51.9, 4.5],     // Rotterdam
  Germany: [53.5, 9.9],
  UK: [51.5, 0.1],
  Ireland: [53.3, -6.2],
  France: [43.3, 5.4],
  Sweden: [59.3, 18.1],
  Poland: [54.4, 18.6],
  Hungary: [47.5, 19.0],
  Italy: [44.4, 8.9],
  Spain: [39.5, -0.4],
  Finland: [60.2, 25.0],
  USA: [34.0, -118.2],          // Los Angeles (Pacific)
  Canada: [49.3, -123.1],
  Mexico: [19.1, -104.3],
  Chile: [-33.0, -71.6],        // Valparaíso
  Peru: [-12.0, -77.1],
  Brazil: [-23.9, -46.3],
  Argentina: [-34.6, -58.4],
  "DR Congo": [-5.9, 12.4],
  "South Africa": [-33.9, 18.4],
  Australia: [-20.3, 118.6],    // Port Hedland (major bulk-export port)
  "New Zealand": [-36.8, 174.8],
};
