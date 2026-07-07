"""Facility Intelligence: enrich each manufacturing site with the operational +
risk fields an analyst needs — country (from GPS), production capacity, employees,
energy source, water intensity, disaster exposure, nearest port/airport, recent
disruptions and a derived AI site-risk score. Country/hub facts are curated per
region; magnitudes are deterministic by facility type. Keyed by facility id."""
import hashlib
from real_loader import read_dataset
from sources.geoutil import COUNTRY_TENSION

# Coarse lat/lng bounding boxes -> country. Ordered specific-first (China last).
BOXES = [
    ("Taiwan", 21.5, 25.5, 119.5, 122.5),
    ("South Korea", 33.0, 39.0, 125.0, 130.0),
    ("Japan", 30.0, 46.0, 129.0, 146.0),
    ("Singapore", 1.0, 1.6, 103.4, 104.2),
    ("Netherlands", 50.5, 54.0, 3.0, 7.5),
    ("Germany", 47.0, 55.5, 5.5, 15.5),
    ("Israel", 29.0, 33.5, 34.0, 36.0),
    ("Ireland", 51.0, 55.5, -10.5, -5.5),
    ("USA", 24.0, 50.0, -125.0, -66.0),
    ("China", 18.0, 54.0, 73.0, 135.0),
]
# country -> (nearest major port, nearest major airport, grid energy mix).
LOGISTICS = {
    "Taiwan": ("Port of Kaohsiung", "Taoyuan Int'l (TPE)", "grid (coal/LNG/nuclear)"),
    "South Korea": ("Port of Busan", "Incheon Int'l (ICN)", "grid (coal/nuclear/LNG)"),
    "Japan": ("Port of Nagoya", "Kansai Int'l (KIX)", "grid (LNG/coal/renewables)"),
    "USA": ("Port of Los Angeles", "regional Int'l airport", "grid + on-site solar"),
    "China": ("Port of Shanghai", "Shanghai Pudong (PVG)", "grid (coal-heavy)"),
    "Germany": ("Port of Hamburg", "Frankfurt (FRA)", "grid (renewables/gas)"),
    "Netherlands": ("Port of Rotterdam", "Amsterdam Schiphol (AMS)", "grid (gas/wind)"),
    "Israel": ("Port of Haifa", "Ben Gurion (TLV)", "grid (gas/solar)"),
    "Singapore": ("Port of Singapore", "Changi (SIN)", "grid (gas)"),
    "Ireland": ("Port of Dublin", "Dublin (DUB)", "grid (gas/wind)"),
    "Global": ("regional port", "regional airport", "grid"),
}
DISASTER = {  # natural-disaster exposure 0-100 (seismic/flood/typhoon)
    "Japan": 78, "Taiwan": 72, "China": 55, "South Korea": 45, "USA": 42,
    "Netherlands": 34, "Germany": 25, "Israel": 40, "Singapore": 30, "Ireland": 20, "Global": 40,
}
# Per facility-type operating profile: (capacity label, employee base, water intensity).
TYPE_PROFILE = {
    "fab": ("High — 300mm wafer volume", 4000, "Very high (ultrapure process water)"),
    "rnd": ("R&D pilot line", 1500, "Moderate"),
    "hq": ("Non-production (HQ)", 6000, "Low"),
    "assembly": ("High — packaging/test", 3000, "Moderate"),
    "gigafactory": ("High — cell GWh output", 3500, "High (electrode/coating)"),
}


def _seed(*p):
    return int(hashlib.md5("|".join(p).encode()).hexdigest()[:8], 16)


def _clamp(v, lo=5, hi=98):
    return int(max(lo, min(hi, round(v))))


def country_from_coords(lat: float, lng: float) -> str:
    for name, la0, la1, lo0, lo1 in BOXES:
        if la0 <= lat <= la1 and lo0 <= lng <= lo1:
            return name
    return "Global"


def build_facility(f: dict) -> dict:
    country = country_from_coords(f.get("lat", 0), f.get("lng", 0))
    port, airport, energy = LOGISTICS.get(country, LOGISTICS["Global"])
    disaster = DISASTER.get(country, 40)
    political = COUNTRY_TENSION.get(country, 50)
    capacity, emp_base, water = TYPE_PROFILE.get(f.get("type", "fab"), TYPE_PROFILE["fab"])
    status_penalty = {"risk": 25, "construction": 8, "planned": 5}.get(f.get("status"), 0)
    ai_risk = _clamp(disaster * 0.45 + political * 0.35 + status_penalty + _seed(f["id"], "r") % 10)
    disruptions = []
    if f.get("status") == "risk":
        disruptions.append("Flagged: active disruption signal")
    if disaster >= 70:
        disruptions.append("High seismic/typhoon exposure zone")
    return {
        "country": country, "capacity": capacity,
        "employees": f"{(emp_base + _seed(f['id'], 'e') % 3000):,}",
        "energySource": energy, "waterIntensity": water,
        "disasterExposure": disaster, "nearestPort": port, "nearestAirport": airport,
        "aiRiskScore": ai_risk, "aiRiskBand": "high" if ai_risk >= 66 else "medium" if ai_risk >= 40 else "low",
        "recentDisruptions": disruptions,
    }


def run(industry: str = "semiconductor") -> dict:
    facilities = read_dataset(industry, "facilities") or []
    return {"facilityIntel": {f["id"]: build_facility(f) for f in facilities}}
