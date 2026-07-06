"""Run one source end-to-end: fetch -> upsert -> warm. Usage: run_source.py <name>."""
import sys
import real_loader
import warm
from sources import yahoo, wikidata, patentsview, comtrade, gdelt, derive

SOURCES = {m.__name__.rsplit(".", 1)[-1]: m
           for m in (yahoo, wikidata, patentsview, comtrade, gdelt, derive)}


def main() -> int:
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    mod = SOURCES.get(name)
    if not mod:
        print(f"usage: run_source.py <{'|'.join(SOURCES)}>")
        return 2
    loaded = real_loader.upsert_datasets("semiconductor", mod.run("semiconductor"))
    warmed = warm.run()
    print(f"{name}: upserted {loaded}, warmed {warmed} keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
