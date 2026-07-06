"""Per-company cyber exposure from NVD CVEs + CISA KEV + breach news.
Deterministic score (NOT a commercial rating). Vendor keyword per company from
sources.nvd.VENDORS; breaches pulled from the enriched `news` (category
cyber-attack). Per-source isolation: on any fetch error the company simply gets
a low/empty cyber record rather than failing the run."""
from datetime import datetime, timedelta, timezone
import entities
from real_loader import read_dataset
from sources.base import get_json
from sources.nvd import VENDORS, _score as cvss_of

NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0"
KEV = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
WINDOW_DAYS = 180
BANDS = [(80, "F"), (65, "D"), (50, "C"), (30, "B"), (0, "A")]


def band_for(score: int) -> str:
    for threshold, letter in BANDS:
        if score >= threshold:
            return letter
    return "A"


def score_from_counts(cve_count: int, kev_count: int, breach_count: int) -> int:
    """0-100 exposure. KEV (actively exploited) and breaches weigh heaviest."""
    raw = min(45, cve_count * 3) + min(35, kev_count * 12) + min(20, breach_count * 10)
    return int(min(100, raw))


def _vendor_for(company_name: str, industry: str) -> str | None:
    key = company_name.split()[0].lower()
    return key if key in VENDORS.get(industry, []) else None


def run(industry: str = "semiconductor") -> dict:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=WINDOW_DAYS)
    fmt = "%Y-%m-%dT%H:%M:%S.000"
    try:
        kev = get_json(KEV, "cisa_kev", max_age_h=24)
        kev_ids = {v["cveID"] for v in kev.get("vulnerabilities", [])}
    except Exception:
        kev_ids = set()
    news = read_dataset(industry, "news") or []
    out: dict[str, dict] = {}
    for e in entities.load(industry):
        vendor = _vendor_for(e["name"], industry)
        recent, kev_hits = [], []
        if vendor:
            try:
                data = get_json(NVD, f"cyber_{industry}_{vendor}",
                                params={"keywordSearch": vendor, "pubStartDate": start.strftime(fmt),
                                        "pubEndDate": end.strftime(fmt), "resultsPerPage": 40,
                                        "cvssV3Severity": "HIGH"}, max_age_h=24, throttle_s=6.5)
            except Exception:
                data = {}
            for v in data.get("vulnerabilities", [])[:40]:
                cve = v.get("cve", {})
                cid = cve.get("id", "")
                recent.append({"id": cid, "cvss": cvss_of(cve), "vendor": vendor})
                if cid in kev_ids:
                    kev_hits.append({"id": cid, "name": vendor})
        breaches = [{"title": n.get("headline", n.get("title", "")), "date": n.get("ago", "")}
                    for n in news if n.get("category") == "cyber-attack"
                    and e["name"] in (n.get("relatedCompanies") or [])][:5]
        score = score_from_counts(len(recent), len(kev_hits), len(breaches))
        out[e["id"]] = {"score": score, "band": band_for(score),
                        "recentCves": recent[:8], "kevHits": kev_hits[:5], "breaches": breaches}
    return {"cyber": out}
