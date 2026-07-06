"""OpenDART (Korea FSS electronic disclosure) -> filings + alerts for Korean
issuers. These companies (Samsung, SK hynix, LG Energy, Samsung SDI) file with
Korea's Financial Supervisory Service, NOT the U.S. SEC, so sources/sec.py has
nothing for them and their "M&A / filings" panel was empty. This mirrors sec.py:
material disclosures (major-event reports, acquisitions, buybacks, supply
contracts) become per-company filings + a merged alert stream. Insider-ownership
and routine reports are filtered out. Requires DART_API_KEY (free, keyed).

Read-modify-write: merges onto whatever sec.py already wrote to filings/alerts
(per-source isolation — a DART failure keeps the SEC data intact)."""
import io
import json
import zipfile
import xml.etree.ElementTree as ET
import entities
from config import DART_API_KEY, CACHE_DIR
from real_loader import read_dataset
from sources.base import get_json, UA

LIST = "https://opendart.fss.or.kr/api/list.json"
CORPCODE = "https://opendart.fss.or.kr/api/corpCode.xml"
VIEWER = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"

# Material disclosure classification. Korean report-name keyword -> (English
# label, severity). Order matters: the first keyword found wins, so the most
# specific / highest-signal M&A actions are listed before generic ones.
CLASSIFY = [
    ("합병", ("Merger", "high")),
    ("분할합병", ("Split-merger", "high")),
    ("분할", ("Spin-off / split", "high")),
    ("영업양수", ("Business acquisition", "high")),
    ("영업양도", ("Business divestiture", "high")),
    ("주식교환", ("Share swap / exchange", "high")),
    ("타법인주식", ("Acquisition of equity stake", "high")),
    ("주식및출자증권취득", ("Acquisition of equity stake", "high")),
    ("주식및출자증권처분", ("Disposal of equity stake", "medium")),
    ("출자", ("Equity investment", "medium")),
    ("유상증자", ("Rights offering (capital raise)", "medium")),
    ("무상증자", ("Bonus share issue", "low")),
    ("전환사채", ("Convertible bond issuance", "medium")),
    ("신주인수권부사채", ("Warrant bond issuance", "medium")),
    ("교환사채", ("Exchangeable bond issuance", "medium")),
    ("자기주식취득", ("Share buyback", "medium")),
    ("자기주식처분", ("Treasury share disposal", "low")),
    ("공급계약", ("Major supply contract", "medium")),
    ("단일판매", ("Major supply contract", "medium")),
    ("유형자산", ("Tangible-asset acquisition", "medium")),
    ("현금ㆍ현물배당", ("Dividend decision", "low")),
    ("주요사항보고서", ("Material event report", "medium")),
]
# Report-name substrings that mark noise we always drop (insider ownership,
# proxy solicitation, 5%+ holding reports, routine related-party trade).
SKIP = ("소유상황보고서", "소유주식변동", "대량보유", "의결권", "상품ㆍ용역거래",
        "특정증권등")


def classify(report_nm: str) -> tuple[str, str] | None:
    """Material disclosure -> (english label, severity); None to skip as noise."""
    if any(s in report_nm for s in SKIP):
        return None
    for kw, out in CLASSIFY:
        if kw in report_nm:
            return out
    return None


def _corp_code_map() -> dict[str, str]:
    """stock_code -> DART corp_code, cached (the source XML zip is ~3.5 MB)."""
    cache = CACHE_DIR / "dart_corpcodes.json"
    if cache.exists():
        return json.loads(cache.read_text())
    import requests
    resp = requests.get(CORPCODE, params={"crtfc_key": DART_API_KEY}, headers=UA, timeout=60)
    resp.raise_for_status()
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    root = ET.fromstring(z.read(z.namelist()[0]))
    mapping = {}
    for el in root.iter("list"):
        sc = (el.findtext("stock_code") or "").strip()
        cc = (el.findtext("corp_code") or "").strip()
        if sc and cc:
            mapping[sc] = cc
    CACHE_DIR.mkdir(exist_ok=True)
    cache.write_text(json.dumps(mapping))
    return mapping


def _korean(ent: dict) -> str | None:
    """Stock code for a Korean-listed entity (.KS / .KQ ticker), else None."""
    tk = ent.get("ticker") or ""
    if tk.endswith(".KS") or tk.endswith(".KQ"):
        return tk.split(".")[0]
    return None


def _ago(rcept_dt: str) -> str:
    """'YYYYMMDD' -> 'Nd ago' relative to today (filings are date-only)."""
    from datetime import date
    try:
        d = date(int(rcept_dt[:4]), int(rcept_dt[4:6]), int(rcept_dt[6:8]))
        days = max(0, (date.today() - d).days)
    except Exception:
        return "recently"
    return "today" if days == 0 else f"{days}d ago"


def run(industry: str = "semiconductor") -> dict:
    if not DART_API_KEY:
        raise RuntimeError("DART_API_KEY not set — keeping SEC-only filings")
    ents = [e for e in entities.load(industry) if _korean(e)]
    if not ents:
        return {}  # nothing to do for this industry
    codes = _corp_code_map()

    filings = dict(read_dataset(industry, "filings") or {})
    existing_alerts = list(read_dataset(industry, "alerts") or [])
    new_alerts: list[tuple[str, dict]] = []
    idx = 1
    for e in ents:
        corp = codes.get(_korean(e))
        if not corp:
            continue
        data = get_json(
            LIST, f"dart_list_{corp}",
            params={"crtfc_key": DART_API_KEY, "corp_code": corp,
                    "bgn_de": "20230101", "page_count": "100"},
            max_age_h=24, throttle_s=0.3,
        )
        per_company: list[dict] = []
        picked_alert = False
        for it in data.get("list", []):
            cls = classify(it.get("report_nm", ""))
            if not cls:
                continue
            label, severity = cls
            dt = it.get("rcept_dt", "")
            href = VIEWER.format(rcept_no=it.get("rcept_no", ""))
            if not picked_alert:  # freshest material filing feeds the alert stream
                new_alerts.append((dt, {
                    "id": f"dart{idx}",
                    "severity": severity,
                    "title": f"{e['name']} — {label}",
                    "entity": f"DART · Korea FSS · {e['ticker']}",
                    "href": f"/{industry}/companies/{e['id']}",
                    "ago": _ago(dt),
                }))
                idx += 1
                picked_alert = True
            if len(per_company) < 6:
                per_company.append({
                    "form": "DART",
                    "date": f"{dt[:4]}-{dt[4:6]}-{dt[6:8]}" if len(dt) == 8 else dt,
                    "label": label,
                    "href": href,
                })
        if per_company:
            filings[e["id"]] = per_company

    new_alerts.sort(key=lambda t: -int(t[0] or 0))
    alerts = existing_alerts + [a for _, a in new_alerts[:6]]
    return {"filings": filings, "alerts": alerts}
