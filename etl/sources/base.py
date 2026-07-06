"""Shared helpers for source modules: cached HTTP + display formatters."""
import json
import time
import requests
from config import CACHE_DIR

UA = {"User-Agent": "scr-radar-etl/1.0 (research dashboard; contact: local)"}


def get_json(url: str, cache_key: str, params: dict | None = None,
             headers: dict | None = None, max_age_h: float = 12.0,
             throttle_s: float = 0.0, timeout: float = 30.0):
    """GET JSON with an on-disk cache. On any fetch error, fall back to the
    last cached copy regardless of age (source isolation: stale beats broken).
    `throttle_s` sleeps before the network request only — cache hits are free —
    for APIs that 429 on rapid consecutive calls (GDELT)."""
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / f"{cache_key}.json"
    if path.exists() and (time.time() - path.stat().st_mtime) < max_age_h * 3600:
        return json.loads(path.read_text())
    try:
        if throttle_s:
            time.sleep(throttle_s)
        resp = requests.get(url, params=params, headers={**UA, **(headers or {})}, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        path.write_text(json.dumps(data))
        return data
    except Exception:
        if path.exists():
            return json.loads(path.read_text())
        raise


def fmt_cap(usd: float) -> str:
    """1_234e9 -> '$1.23T'; 45.6e9 -> '$45.6B'."""
    if usd >= 1e12:
        return f"${usd / 1e12:.2f}T"
    if usd >= 1e9:
        return f"${usd / 1e9:.1f}B"
    return f"${usd / 1e6:.0f}M"


def ago(epoch: float, now: float | None = None) -> str:
    """Epoch seconds -> '2h ago' / '3d ago' (matches fixture style)."""
    delta = max(0, (now if now is not None else time.time()) - epoch)
    if delta < 3600:
        return f"{max(1, int(delta // 60))}m ago"
    if delta < 86400:
        return f"{int(delta // 3600)}h ago"
    return f"{int(delta // 86400)}d ago"
