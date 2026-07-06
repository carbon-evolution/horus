"""Entity map: etl/seeds/semiconductor.yaml -> list of dicts + company table sync."""
import yaml
from config import pg, SEEDS_DIR


def load(industry: str = "semiconductor") -> list[dict]:
    doc = yaml.safe_load((SEEDS_DIR / f"{industry}.yaml").read_text())
    return doc["companies"]


def sync_company_table(industry: str = "semiconductor") -> int:
    rows = load(industry)
    with pg() as conn:
        for c in rows:
            conn.execute(
                """insert into company (id, industry, name, ticker, cik, wikidata_qid)
                   values (%s, %s, %s, %s, %s, %s)
                   on conflict (id) do update set industry = excluded.industry,
                     name = excluded.name, ticker = excluded.ticker,
                     cik = excluded.cik, wikidata_qid = excluded.wikidata_qid""",
                (c["id"], industry, c["name"], c["ticker"], c.get("cik"), c.get("qid")),
            )
    return len(rows)
