"""NIST NVD 2.0 API -> cyber CVE alerts appended to the `alerts` stream.
Keyless (rate-limited to ~5 req/30s, so throttled + cached 24h). Reads whatever
`sec.py` already wrote to `alerts` and merges recent high-severity CVEs for the
sector's well-indexed vendors, preserving per-source isolation via read-modify-write."""
from datetime import datetime, timedelta, timezone
from real_loader import read_dataset
from sources.base import get_json, ago

API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
# Vendors with dense NVD coverage (driver/firmware/BMC CVEs) — one keyword each.
VENDORS = {
    "semiconductor": ["nvidia", "intel", "amd", "qualcomm"],
    "ai": ["nvidia", "intel", "amd", "google"],
    "battery": ["tesla", "panasonic", "lg", "samsung"],
}
WINDOW_DAYS = 120


def _score(cve: dict) -> float:
    metrics = cve.get("metrics", {})
    for k in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        if metrics.get(k):
            return float(metrics[k][0]["cvssData"].get("baseScore") or 0)
    return 0.0


def _epoch(published: str) -> float:
    return datetime.fromisoformat(published[:19]).replace(tzinfo=timezone.utc).timestamp()


def normalize_cve(vendor: str, cve: dict, industry: str, idx: int,
                  now_epoch: float | None = None) -> dict:
    score = _score(cve)
    return {
        "id": f"cve{idx}",
        "severity": "high" if score >= 9 else "medium",
        "title": f"{cve['id']} — CVSS {score:.1f} affecting {vendor.capitalize()} products",
        "entity": f"NIST NVD · cyber ({vendor})",
        "href": f"/{industry}/monitoring/alerts",
        "ago": ago(_epoch(cve["published"]), now_epoch),
    }


def run(industry: str = "semiconductor") -> dict:
    existing = read_dataset(industry, "alerts") or []
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=WINDOW_DAYS)
    fmt = "%Y-%m-%dT%H:%M:%S.000"
    cve_alerts: list[tuple[float, dict]] = []
    idx = 1
    for vendor in VENDORS.get(industry, VENDORS["semiconductor"]):
        data = get_json(
            API, f"nvd_{industry}_{vendor}",
            params={"keywordSearch": vendor, "pubStartDate": start.strftime(fmt),
                    "pubEndDate": end.strftime(fmt), "resultsPerPage": 40,
                    "cvssV3Severity": "HIGH"},
            max_age_h=24, throttle_s=6.5,
        )
        for v in data.get("vulnerabilities", []):
            cve = v.get("cve", {})
            if not cve.get("published") or _score(cve) < 7:
                continue
            cve_alerts.append((_epoch(cve["published"]), normalize_cve(vendor, cve, industry, idx)))
            idx += 1
    cve_alerts.sort(key=lambda t: -t[0])
    # Keep the SEC filings on top of the feed; append the freshest CVEs beneath.
    merged = list(existing) + [a for _, a in cve_alerts[:6]]
    return {"alerts": merged}
