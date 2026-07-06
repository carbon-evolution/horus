from sources.base import fmt_cap, ago


def test_fmt_cap():
    assert fmt_cap(3.42e12) == "$3.42T"
    assert fmt_cap(87.3e9) == "$87.3B"
    assert fmt_cap(512e6) == "$512M"


def test_ago():
    now = 1_000_000_000
    assert ago(now - 120, now) == "2m ago"
    assert ago(now - 7200, now) == "2h ago"
    assert ago(now - 3 * 86400, now) == "3d ago"


from sources.yahoo import normalize_company, normalize_financial


def test_normalize_company():
    raw = {"id": "nvidia", "name": "NVIDIA", "ticker": "NVDA", "currency": "USD",
           "price": 135.2, "market_cap": 3.42e12, "change24h": 1.8, "changeYtd": 24.5}
    c = normalize_company(raw)
    assert c == {"id": "nvidia", "name": "NVIDIA", "ticker": "NVDA",
                 "marketCap": "$3.42T", "price": "$135.20",
                 "change24h": 1.8, "changeYtd": 24.5}


def test_normalize_financial():
    raw = {"name": "NVIDIA", "revenue": 235.1e9, "profit": 120.4e9,
           "rnd": 8.67e9, "capex": 3.2e9}
    f = normalize_financial(raw)
    assert f == {"company": "NVIDIA", "revenue": 235.1, "profit": 120.4,
                 "rnd": 8.67, "capex": 3.2}


from sources.wikidata import build_meta


def test_build_meta_merges_facts_and_derived():
    facts = {"ceo": "Jensen Huang", "hq": "Santa Clara", "founded": "1993", "employees": "29,600"}
    company = {"id": "nvidia", "name": "NVIDIA", "changeYtd": 24.5}
    m = build_meta(facts, company, "semiconductor")
    assert m["ceo"] == "Jensen Huang" and m["founded"] == "1993"
    assert 0 <= m["healthScore"] <= 100
    assert m["exposure"] in ("low", "medium", "high")
    assert sum(s["share"] for s in m["segments"]) == 100


def test_build_meta_handles_missing_facts():
    m = build_meta({}, {"id": "x", "name": "X", "changeYtd": -2}, "semiconductor")
    assert m["ceo"] == "—" and m["hq"] == "—"


from sources.patentsview import normalize_patents


def test_normalize_patents():
    rows = normalize_patents("NVIDIA", total=1867,
                             cpc_counts={"G06": 934, "H01": 560, "G11": 373, "B60": 12})
    assert rows["company"] == "NVIDIA"
    assert rows["total"] == 1867
    assert rows["pending"] > 0
    assert len(rows["categories"]) == 3
    assert rows["categories"][0]["count"] >= rows["categories"][1]["count"]


from sources.comtrade import normalize_shipment


def test_normalize_shipment():
    s = normalize_shipment({"reporterDesc": "Netherlands", "partnerDesc": "Taiwan",
                            "cmdCode": "8486", "primaryValue": 8.4e9})
    assert s["lane"] == "Netherlands → Taiwan"
    assert s["origin"] == "Netherlands" and s["destination"] == "Taiwan"
    assert s["mode"] == "air" and s["commodity"] == "Semiconductor Machinery"
    assert s["volume"] == "$8.4B/yr"
    assert s["risk"] in ("low", "medium", "high")
