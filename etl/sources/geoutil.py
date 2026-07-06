"""Shared geography helpers for the scoring/risk stages. Wikidata HQ strings are
bare cities ('Seoul', 'California') and ai/battery have no companyMeta at all, so
we can't derive a company's country from meta reliably. This authoritative
id->country map (+ a country tension baseline) lets geopolitical scoring work for
every tracked company across all three industries."""

# Company id -> HQ country (country names align with the geo datasets where possible).
COUNTRY_BY_ID = {
    # semiconductor
    "nvidia": "USA", "tsmc": "Taiwan", "samsung": "South Korea", "asml": "Netherlands",
    "intel": "USA", "skhynix": "South Korea", "qualcomm": "USA", "micron": "USA",
    "ti": "USA", "infineon": "Germany", "broadcom": "USA", "amd": "USA", "amat": "USA",
    "lam": "USA", "tel": "Japan", "arm": "United Kingdom", "mediatek": "Taiwan",
    "kla": "USA", "nxp": "Netherlands", "adi": "USA",
    # ai
    "microsoft": "USA", "alphabet": "USA", "amazon": "USA", "meta": "USA", "openai": "USA",
    "alibaba": "China", "palantir": "USA", "anthropic": "USA", "databricks": "USA",
    "xai": "USA", "perplexity": "USA", "scaleai": "USA", "midjourney": "USA",
    "cerebras": "USA", "mistral": "France", "cohere": "Canada", "abridge": "USA",
    "huggingface": "USA", "runway": "USA", "deepseek": "China",
    # battery
    "catl": "China", "byd": "China", "tesla": "USA", "lges": "South Korea",
    "panasonic": "Japan", "samsungsdi": "South Korea", "skon": "South Korea",
    "calb": "China", "eve": "China", "gotion": "China", "toshiba": "Japan",
    "clarios": "USA", "svolt": "China", "aesc": "Japan", "sunwoda": "China",
    "lishen": "China", "northvolt": "Sweden", "exide": "India", "quantumscape": "USA",
    "gsyuasa": "Japan",
}

# Baseline supply-chain geopolitical tension per country (0-100), used when the
# per-industry geo dataset doesn't carry the country.
COUNTRY_TENSION = {
    "Taiwan": 82, "China": 78, "Ukraine": 90, "South Korea": 58, "India": 55,
    "USA": 45, "United Kingdom": 35, "France": 35, "Germany": 32, "Netherlands": 30,
    "Japan": 38, "Canada": 25, "Sweden": 28,
}


def country_for(cid: str) -> str:
    return COUNTRY_BY_ID.get(cid, "")


def country_tension(cid: str, geo_list: list[dict]) -> tuple[str, int]:
    """(country, tension 0-100). Prefer the industry geo dataset, else baseline."""
    country = COUNTRY_BY_ID.get(cid, "")
    if not country:
        return "", 50
    for g in geo_list or []:
        if g.get("country") == country:
            return country, int(g.get("tension", COUNTRY_TENSION.get(country, 50)))
    return country, COUNTRY_TENSION.get(country, 50)
