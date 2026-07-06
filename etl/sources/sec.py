"""U.S. SEC EDGAR submissions API -> alerts (recent material filings per company).
Keyless, high-frequency. Each CIK's recent filings feed the alert stream; 8-K item
codes drive severity. Foreign issuers without a CIK are skipped (no US filings)."""
from datetime import datetime, timezone
import entities
from sources.base import get_json, ago

SUB = "https://data.sec.gov/submissions/CIK{cik}.json"

# Forms worth surfacing as alerts; everything else (Form 4/3/5/144 insider noise,
# SC 13G ownership, etc.) is filtered out.
FORM_LABEL = {
    "8-K": "material event (8-K)", "6-K": "foreign report (6-K)",
    "10-K": "annual report (10-K)", "10-Q": "quarterly report (10-Q)",
    "S-1": "registration (S-1)", "424B": "prospectus", "SC 13D": "activist stake (13D)",
}
# 8-K item codes that signal elevated risk (distress / accounting / leadership).
HIGH_ITEMS = {"1.03", "2.04", "2.06", "3.01", "4.01", "4.02"}
MED_ITEMS = {"1.01", "2.01", "2.05", "5.02"}  # material agreements, deals, exec change


def _epoch(iso: str) -> float:
    """'2026-07-02T18:05:12.000Z' or '2026-07-02' -> epoch seconds (UTC)."""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        dt = datetime.strptime(iso[:10], "%Y-%m-%d")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def _form_key(form: str) -> str | None:
    for k in FORM_LABEL:
        if form.startswith(k):
            return k
    return None


def normalize_filing(company: dict, industry: str, form: str, items: str,
                     accepted: str, idx: int, now_epoch: float | None = None) -> dict | None:
    key = _form_key(form)
    if not key:
        return None
    codes = {c.strip() for c in (items or "").split(",") if c.strip()}
    if key == "8-K" and codes & HIGH_ITEMS:
        severity = "high"
    elif key == "8-K":
        severity = "medium" if codes & MED_ITEMS else "low"
    elif key in ("10-K", "S-1", "SC 13D"):
        severity = "medium"
    else:
        severity = "low"
    return {
        "id": f"sec{idx}",
        "severity": severity,
        "title": f"{company['name']} filed {FORM_LABEL[key]}",
        "entity": f"SEC EDGAR · {company['ticker']}",
        "href": f"/{industry}/companies/{company['id']}",
        "ago": ago(_epoch(accepted), now_epoch),
    }


def run(industry: str = "semiconductor") -> dict:
    ents = [e for e in entities.load(industry) if e.get("cik")]
    alerts: list[tuple[float, dict]] = []
    idx = 1
    for e in ents:
        cik = str(e["cik"]).zfill(10)
        data = get_json(SUB.format(cik=cik), f"sec_{cik}", throttle_s=0.2)
        rec = data.get("filings", {}).get("recent", {})
        forms = rec.get("form", [])
        for i in range(min(len(forms), 40)):  # newest first; only scan the recent window
            accepted = rec.get("acceptanceDateTime", rec.get("filingDate", []))[i]
            a = normalize_filing(e, industry, forms[i], rec.get("items", [""] * len(forms))[i],
                                 accepted, idx)
            if a:
                alerts.append((_epoch(accepted), a))
                idx += 1
                break  # one most-recent notable filing per company keeps the feed diverse
    alerts.sort(key=lambda t: -t[0])
    return {"alerts": [a for _, a in alerts[:14]]}
