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


from sources.sec_facts import build_history, _series


def _pt(start, end, val, form="10-K", fp="FY", fy=None):
    return {"start": start, "end": end, "val": val, "form": form, "fp": fp,
            "fy": fy if fy is not None else int(end[:4])}


def test_sec_facts_annual_series_and_fallback():
    g = {
        # primary R&D tag: two full years
        "ResearchAndDevelopmentExpense": {"units": {"USD": [
            _pt("2023-01-01", "2023-12-31", 5_000_000_000),
            _pt("2024-01-01", "2024-12-31", 7_000_000_000),
            _pt("2024-07-01", "2024-09-30", 1_800_000_000, fp="Q3"),  # quarter — ignored
        ]}},
        # capex: primary tag empty for recent year, fallback carries it
        "PaymentsToAcquirePropertyPlantAndEquipment": {"units": {"USD": [
            _pt("2023-01-01", "2023-12-31", 1_000_000_000),
        ]}},
        "PaymentsToAcquireProductiveAssets": {"units": {"USD": [
            _pt("2024-01-01", "2024-12-31", 3_240_000_000),
        ]}},
    }
    hist = build_history({"facts": {"us-gaap": g}})
    assert hist["rnd"] == [{"year": 2023, "val": 5.0}, {"year": 2024, "val": 7.0}]
    # fallback backfills 2024, primary keeps 2023
    assert {r["year"]: r["val"] for r in hist["capex"]} == {2023: 1.0, 2024: 3.24}
    assert "acquisitions" not in hist  # no data -> metric dropped


def test_sec_facts_currency_conversion():
    g = {"Revenues": {"units": {"EUR": [
        _pt("2024-01-01", "2024-12-31", 10_000_000_000),  # 10B EUR -> ~10.8B USD
    ]}}}
    rev = _series(g, ["Revenues"], 6)
    assert rev == [{"year": 2024, "val": 10.8}]


from sources.yahoo_facts import _to_series, build_history as yf_build_history


class _FakeDF:
    """Minimal stand-in for a yfinance statement DataFrame (index + .loc rows)."""
    def __init__(self, rows):
        import datetime
        self.index = list(rows)
        self._rows = {k: {datetime.datetime(y, 12, 31): v for y, v in pairs}
                      for k, pairs in rows.items()}
        self.empty = not rows

    class _Loc:
        def __init__(self, outer):
            self.outer = outer

        def __getitem__(self, key):
            import pandas as pd
            return pd.Series(self.outer._rows[key])

    @property
    def loc(self):
        return _FakeDF._Loc(self)


def test_yahoo_facts_to_series_fx_and_abs():
    # KRW values -> USD billions; capex is a negative cash outflow -> abs.
    pairs = [(2024, 53_741_600_000_000), (2025, 52_153_100_000_000)]
    out = _to_series([(y, -v) for y, v in pairs], fx=1 / 1400.0)
    assert out == [{"year": 2024, "val": 38.39}, {"year": 2025, "val": 37.25}]


def test_yahoo_facts_build_history_picks_rows_and_skips_missing():
    inc = _FakeDF({"Total Revenue": [(2024, 300_000_000_000_000)],
                   "Net Income": [(2024, 33_000_000_000_000)]})  # no R&D row
    cf = _FakeDF({"Capital Expenditure": [(2024, -53_000_000_000_000)]})
    hist = yf_build_history(inc, cf, fx=1 / 1400.0)
    assert hist["revenue"] == [{"year": 2024, "val": 214.29}]
    assert hist["capex"] == [{"year": 2024, "val": 37.86}]
    assert "rnd" not in hist and "acquisitions" not in hist


from sources.derive import build_compare_radar, AXES


def test_build_compare_radar_covers_all_companies_keeps_curated_and_composite():
    companies = [{"id": "tsmc", "name": "TSMC"}, {"id": "nvidia", "name": "NVIDIA"},
                 {"id": "micron", "name": "Micron"}]
    curated = [
        {"entity": "TSMC", "color": "#38bdf8",
         "axes": [{"axis": a, "value": 50} for a in AXES]},
        {"entity": "Sector Composite", "color": "#f59e0b",
         "axes": [{"axis": a, "value": 60} for a in AXES]},
    ]
    meta = {"nvidia": {"healthScore": 90, "exposure": "low"}}
    esg = [{"company": "Micron", "scope1": 1.6, "scope2": 4.4, "scope3": 7.2, "ethicalSourcing": "low"}]
    out = build_compare_radar(companies, curated, meta, esg)

    names = [s["entity"] for s in out]
    assert names == ["TSMC", "NVIDIA", "Micron", "Sector Composite"]  # every company + composite
    # curated entity passed through verbatim
    assert out[0] is curated[0]
    # NVIDIA: healthScore 90 -> Financial risk 10; exposure low -> Geopolitical ~35
    nv = {a["axis"]: a["value"] for a in out[1]["axes"]}
    assert nv["Financial"] == 10
    assert 20 <= nv["Geopolitical"] <= 45
    # every derived value stays in-range
    for s in out:
        for a in s["axes"]:
            assert 0 <= a["value"] <= 100


def test_build_compare_radar_is_deterministic():
    companies = [{"id": "micron", "name": "Micron"}]
    curated = [{"entity": "Sector Composite", "color": "#f59e0b",
                "axes": [{"axis": a, "value": 55} for a in AXES]}]
    a = build_compare_radar(companies, curated, {}, [])
    b = build_compare_radar(companies, curated, {}, [])
    assert a == b  # stable across calls (md5 seed, not salted hash())


from ai.summary import generate as gen_summary


def test_generate_exec_summary_is_factual():
    ctx = {"name": "TSMC", "industry": "semiconductor",
           "scores": {"overall": 71, "band": "D", "geopolitical": 90, "supplierDependency": 60,
                      "cyber": 55, "financial": 30, "esg": 45, "customerDependency": 50},
           "topRisk": {"title": "Geopolitical tension in Taiwan (82)"},
           "hq": "Hsinchu, Taiwan"}
    s = gen_summary(ctx)
    assert "TSMC" in s and "band D" in s and "Taiwan" in s
    assert 40 <= len(s.split()) <= 120


from sources.scores import build_scores, overall_and_band, SCORE_WEIGHTS


def test_overall_and_band_weighted():
    subs = {"supplierDependency": 80, "customerDependency": 50, "esg": 40,
            "cyber": 70, "financial": 60, "geopolitical": 90}
    overall, band = overall_and_band(subs)
    assert 0 <= overall <= 100 and band in ("A", "B", "C", "D", "F")
    assert abs(sum(SCORE_WEIGHTS.values()) - 1.0) < 1e-6


def test_build_scores_flags_customer_estimated():
    ctx = {"id": "tsmc", "name": "TSMC", "healthScore": 70, "exposure": "high",
           "esg": {"scope1": 2.2, "scope2": 8.1, "scope3": 12.4, "ethicalSourcing": "low"},
           "cyber": {"score": 65}, "edges": [], "geoTension": 82, "prevTrend": []}
    s = build_scores(ctx)
    assert s["factors"]["customerDependency"]["estimated"] is True
    assert s["band"] == overall_and_band({k: s[k] for k in SCORE_WEIGHTS})[1]
    assert s["trend"] and s["trend"][-1]["value"] == s["overall"]


def test_build_scores_deterministic():
    ctx = {"id": "x", "name": "X", "healthScore": 50, "exposure": "medium", "esg": {},
           "cyber": {"score": 40}, "edges": [], "geoTension": None, "prevTrend": []}
    assert build_scores(ctx) == build_scores(ctx)


from sources.risks import build_risks, PLAYBOOK


def test_build_risks_derives_from_signals():
    ctx = {
        "id": "tsmc", "name": "TSMC",
        "cyber": {"score": 80, "kevHits": [{"id": "CVE-1", "name": "tsmc"}]},
        "policies": [{"title": "DUV export curbs", "targets": ["TSMC"], "severity": "high"}],
        "geo": [{"country": "Taiwan", "tension": 82}],
        "hqCountry": "Taiwan",
        "supplierEdges": [{"buyer": "TSMC", "supplier": "Sole Co", "risk": "high", "material": "neon"}],
        "healthScore": 40,
    }
    risks = build_risks(ctx)
    cats = {r["category"] for r in risks}
    assert {"cyber", "regulatory", "geopolitical"} <= cats
    for r in risks:
        assert 0 <= r["severity"] <= 100 and 0.0 <= r["probability"] <= 1.0
        assert r["recommendedActions"] and r["source"] and r["category"] in PLAYBOOK


from sources.cyber import score_from_counts, band_for


def test_cyber_score_and_band():
    assert score_from_counts(cve_count=0, kev_count=0, breach_count=0) < 20
    assert score_from_counts(cve_count=25, kev_count=4, breach_count=2) > 70
    assert band_for(85) == "F" and band_for(10) == "A"


from sources.news_enrich import classify_news, enrich_item


def test_classify_news_taxonomy():
    assert classify_news("Ransomware attack cripples chipmaker network")[0] == "cyber-attack"
    assert classify_news("Company X to acquire rival in $5B deal")[0] == "m&a"
    assert classify_news("New fab expansion announced in Arizona")[0] == "factory-expansion"
    assert classify_news("Earthquake disrupts production in Taiwan")[0] == "disaster"
    assert classify_news("Workers strike over wages")[0] == "labor-strike"
    assert classify_news("Quarterly earnings beat expectations")[0] == "financial"
    assert classify_news("Some unremarkable headline")[0] == "general"


def test_enrich_item_scores_and_related():
    item = {"headline": "Ransomware attack hits NVIDIA suppliers in Taiwan", "company": "NVIDIA"}
    out = enrich_item(item, ["NVIDIA", "TSMC"])
    assert out["category"] == "cyber-attack"
    assert 0 <= out["impactScore"] <= 100 and out["impact"] in ("low", "medium", "high")
    assert 0.0 <= out["confidence"] <= 1.0
    assert "NVIDIA" in out["relatedCompanies"] and out["geo"] == "Taiwan"


from sources.opendart import classify


def test_opendart_classify_material_and_noise():
    # material M&A / corporate actions -> (label, severity)
    assert classify("주요사항보고서(회사합병결정)") == ("Merger", "high")
    assert classify("타법인주식및출자증권취득결정") == ("Acquisition of equity stake", "high")
    assert classify("주요사항보고서(자기주식취득결정)") == ("Share buyback", "medium")
    assert classify("단일판매ㆍ공급계약체결") == ("Major supply contract", "medium")
    # generic major-event report still surfaces
    assert classify("주요사항보고서(유상증자결정)") == ("Rights offering (capital raise)", "medium")
    # insider-ownership / holding noise -> dropped
    assert classify("임원ㆍ주요주주특정증권등소유상황보고서") is None
    assert classify("주식등의대량보유상황보고서") is None
    assert classify("분기보고서") is None


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


from sources.gdelt import normalize_article


def test_normalize_article():
    n = normalize_article(
        {"title": "TSMC to expand Arizona fab amid export control tension",
         "seendate": "20260706T010000Z"},
        company="TSMC", idx=3, now_epoch=1_782_000_000)
    assert n["id"] == "n3" and n["company"] == "TSMC"
    assert n["impact"] == "high"          # matches 'export control' keyword
    assert n["headline"].startswith("TSMC to expand")
    assert n["ago"].endswith(" ago")


from sources.derive import build_kpis


def test_build_kpis_patches_values_keeps_style():
    seeded = [{"label": "Companies Tracked", "value": "99", "icon": "Building2", "accent": "#3b82f6"},
              {"label": "News Impacting Markets", "value": "152", "icon": "Newspaper", "accent": "#f59e0b"},
              {"label": "Facilities Worldwide", "value": "1,246", "icon": "Factory", "accent": "#34d399"}]
    kpis = build_kpis(seeded, companies_count=10, news_count=23)
    by = {k["label"]: k for k in kpis}
    assert by["Companies Tracked"]["value"] == "10"
    assert by["News Impacting Markets"]["value"] == "23"
    assert by["Facilities Worldwide"]["value"] == "1,246"   # curated label untouched
    assert by["Companies Tracked"]["icon"] == "Building2"   # style preserved
