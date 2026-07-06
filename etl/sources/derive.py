"""Derived KPIs: patch the values we now have real data for (company count,
fetched news count) into the seeded KPI cards, preserving labels/icons/accents.
The remaining cards are curated universe-level aggregates and pass through."""
from real_loader import read_dataset


def build_kpis(seeded: list[dict], companies_count: int, news_count: int) -> list[dict]:
    computed = {
        "Companies Tracked": str(companies_count) if companies_count else None,
        "News Impacting Markets": str(news_count) if news_count else None,
    }
    out = []
    for k in seeded:
        k = dict(k)
        if computed.get(k["label"]):
            k["value"] = computed[k["label"]]
        out.append(k)
    return out


def run(industry: str = "semiconductor") -> dict:
    seeded = read_dataset(industry, "kpis") or []
    companies = read_dataset(industry, "companies") or []
    news = read_dataset(industry, "news") or []
    return {"kpis": build_kpis(seeded, len(companies), len(news))}
