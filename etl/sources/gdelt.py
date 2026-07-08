"""GDELT 2.0 DOC API -> news dataset (latest English articles per company)."""
import calendar
import re
import time
import entities
from sources.base import get_json, ago

API = "https://api.gdeltproject.org/api/v2/doc/doc"
HIGH = re.compile(r"restrict|export control|ban|sanction|tension|halt|shortage|lawsuit", re.I)
MED = re.compile(r"delay|concern|probe|tariff|risk|cut|drop", re.I)


def _epoch(seendate: str) -> float:
    return calendar.timegm(time.strptime(seendate, "%Y%m%dT%H%M%SZ"))


def normalize_article(art: dict, company: str, idx: int, now_epoch: float | None = None) -> dict:
    title = art["title"].strip()
    impact = "high" if HIGH.search(title) else "medium" if MED.search(title) else "low"
    return {
        "id": f"n{idx}",
        "company": company,
        "headline": title[:140],
        "impact": impact,
        "impactLabel": f"Market Impact: {impact.capitalize()}",
        "ago": ago(_epoch(art["seendate"]), now_epoch),
        # ISO date so the UI can derive the relative time live (ago goes stale)
        "date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(_epoch(art["seendate"]))),
    }


def run(industry: str = "semiconductor") -> dict:
    """One combined OR query (GDELT 429s on rapid consecutive calls); each
    article is attributed to the first company whose name appears in its title."""
    ents = entities.load(industry)
    # GDELT rejects quoted single words ("phrase too short") — quote only multi-word names.
    terms = [f'"{e["name"]}"' if " " in e["name"] else e["name"] for e in ents]
    query = "(" + " OR ".join(terms) + ") sourcelang:english"
    data = get_json(
        API, f"gdelt_{industry}",
        params={"query": query, "mode": "ArtList", "format": "json",
                "maxrecords": 75, "timespan": "3d", "sort": "DateDesc"},
        max_age_h=3, throttle_s=5.0,
    )
    items, idx, seen = [], 1, set()
    for art in data.get("articles", []) or []:
        title = (art.get("title") or "").strip()
        key = title.lower()
        if not title or key in seen or not art.get("seendate"):
            continue
        company = next((e["name"] for e in ents if e["name"].lower() in key), None)
        if not company:
            continue
        seen.add(key)
        items.append(normalize_article(art, company, idx))
        idx += 1
    return {"news": items[:30]}
