"""Sanity-check a fresh data/prices.json against the committed one before publishing.

    python prices/check_prices.py              # compare working tree against HEAD
    python prices/check_prices.py --base REF   # compare against another git ref

Fails (exit 1) when a provider disappears, a provider's priced-region count drops sharply, a basket
leaves its plausible range, or one region's price moves by more than 50%. Always prints the regions
whose price index (price over the provider's cheapest region, x100, as the Placement view computes
it) moved by more than 5 points.

Standard library only.
"""
import io, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
REL = "data/prices.json"
RANGES = {"general": (80, 600), "h100": (4, 25), "blackwell": (4, 60)}   # Azure GB200 lists at $27-54/GPU-hr
INDEX_MOVE = 5
MAX_DROP = 0.10   # a priced-region count may fall by at most 10% (and at most 3 regions)
MAX_STEP = 0.50   # no single region price may move by more than 50%


def value(r, basket):
    if basket == "general":
        return r.get("general_monthly")
    g = (r.get("gpu") or {}).get(basket)
    return g.get("per_gpu_hour") if g else None


def indexes(doc, basket):
    out = {}
    for p, rs in doc["providers"].items():
        vals = {k: value(r, basket) for k, r in rs.items()}
        vals = {k: v for k, v in vals.items() if v is not None}
        if vals:
            floor = min(vals.values())
            out.update({(p, k): round(v / floor * 100) for k, v in vals.items()})
    return out


def main():
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else "HEAD"
    old = json.loads(subprocess.check_output(["git", "show", "%s:%s" % (base, REL)], cwd=ROOT))
    new = json.load(io.open(os.path.join(ROOT, REL), encoding="utf-8"))
    problems = []

    print("as_of %s -> %s" % (old.get("as_of"), new.get("as_of")))
    for p in sorted(set(old["providers"]) | set(new["providers"])):
        if p not in new["providers"]:
            problems.append("%s missing from the new file" % p)
            continue
        for b in RANGES:
            o = sum(value(r, b) is not None for r in old["providers"].get(p, {}).values())
            n = sum(value(r, b) is not None for r in new["providers"][p].values())
            print("%-7s %-9s priced regions %3d -> %3d" % (p, b, o, n))
            if o and (o - n > 3 or (o - n) / o > MAX_DROP):
                problems.append("%s %s priced regions fell %d -> %d" % (p, b, o, n))

    for b, (lo, hi) in RANGES.items():
        for p, rs in new["providers"].items():
            for k, r in rs.items():
                v = value(r, b)
                if v is not None and not lo <= v <= hi:
                    problems.append("%s %s %s = %s, outside %s-%s" % (p, k, b, v, lo, hi))
                o = value(old["providers"].get(p, {}).get(k, {}), b)
                if v is not None and o and abs(v - o) / o > MAX_STEP:
                    problems.append("%s %s %s moved %s -> %s" % (p, k, b, o, v))

    moves = []
    for b in RANGES:
        oi, ni = indexes(old, b), indexes(new, b)
        for key in sorted(set(oi) & set(ni)):
            if abs(ni[key] - oi[key]) > INDEX_MOVE:
                moves.append("%s %s %s: index %d -> %d" % (key[0], key[1], b, oi[key], ni[key]))
    print("\nIndex moves over %d points: %d" % (INDEX_MOVE, len(moves)))
    for m in moves:
        print("  " + m)

    if problems:
        print("\nFAIL: %d problem(s), do not publish" % len(problems))
        for m in problems:
            print("  " + m)
        sys.exit(1)
    print("\nOK to publish")


if __name__ == "__main__":
    main()
