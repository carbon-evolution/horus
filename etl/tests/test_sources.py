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
