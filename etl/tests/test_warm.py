import json
import seed_loader
import warm
from config import rds


def test_warm_sets_namespaced_keys(fresh_db):
    seed_loader.run()
    warm.run()
    r = rds()
    raw = r.get("scr:semiconductor:companies")
    assert raw is not None
    # value is the JSON payload of that dataset
    assert isinstance(json.loads(raw), list)
    assert r.get("scr:_global:sources") is not None
