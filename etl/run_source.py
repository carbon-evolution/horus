"""Run one source end-to-end: fetch -> upsert -> warm.
Usage: run_source.py <name> [industry]   (industry defaults to semiconductor)."""
import sys
import real_loader
import warm
from sources import (yahoo, yahoo_facts, wikidata, patentsview, comtrade, gdelt, sec,
                     sec_facts, opendart, nvd, fedreg, holdings, news_enrich, cyber,
                     risks, scores, supplier_intel, materials_intel, facility_intel, summary, derive)

SOURCES = {m.__name__.rsplit(".", 1)[-1]: m
           for m in (yahoo, yahoo_facts, wikidata, patentsview, comtrade, gdelt, sec,
                     sec_facts, opendart, nvd, fedreg, holdings, news_enrich, cyber,
                     risks, scores, supplier_intel, materials_intel, facility_intel, summary, derive)}


def main() -> int:
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    industry = sys.argv[2] if len(sys.argv) > 2 else "semiconductor"
    mod = SOURCES.get(name)
    if not mod:
        print(f"usage: run_source.py <{'|'.join(SOURCES)}> [industry]")
        return 2
    loaded = real_loader.upsert_datasets(industry, mod.run(industry))
    warmed = warm.run()
    print(f"{name}[{industry}]: upserted {loaded}, warmed {warmed} keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
