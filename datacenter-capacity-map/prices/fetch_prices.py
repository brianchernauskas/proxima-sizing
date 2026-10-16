"""Fetch list prices for the placement baskets and write data/prices.json.

    python prices/fetch_prices.py            # all providers
    python prices/fetch_prices.py aws azure  # some

Two baskets, priced per region from each provider's own published price data (tier A):

  general  one month of a 4 vCPU / 16 GiB Linux VM (730 h, on-demand), 500 GB of general-purpose
           SSD block storage, and 1 TB (1,024 GB) of internet egress at the provider's tiered rates,
           free allowances included.
  gpu      on-demand price per GPU-hour for an H100 node and a Blackwell node (B200 or GB200),
           and whether the region offers it at all.

List prices, not negotiated ones. Enterprise discounts usually apply evenly across regions, so the
ratios between regions are what the placement view uses. Google needs an API key for its Cloud
Billing Catalog: set GCP_PRICING_KEY in the environment; without it Google is skipped.

Standard library only.
"""
import datetime as dt, gzip, io, json, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA, "prices.json")
HOURS = 730
DISK_GB = 500
EGRESS_GB = 1024
UA = {"User-Agent": "proxima-dc-capacity-map/1.0 (+https://tools.briansavesbillions.com/datacenter-capacity-map/)"}
TODAY = dt.date.today().isoformat()


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=dict(UA, **{"Accept-Encoding": "gzip"}))
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read()
            return json.loads(gzip.decompress(body) if body[:2] == b"\x1f\x8b" else body)   # AWS gzips regardless
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if i == tries - 1:
                raise
        except Exception:
            if i == tries - 1:
                raise
        time.sleep(2 * (i + 1))


def regions(provider):
    return json.load(io.open(os.path.join(DATA, provider + ".json"), encoding="utf-8"))["regions"]


def tiered(tiers, gb):
    """Cost of `gb` under [(start_gb, price_per_gb), ...] tiers (start ascending)."""
    tiers = sorted(tiers)
    cost = 0.0
    for i, (start, price) in enumerate(tiers):
        end = tiers[i + 1][0] if i + 1 < len(tiers) else float("inf")
        if gb > start:
            cost += (min(gb, end) - start) * price
    return round(cost, 2)


def basket(vm_hourly, disk_gb_month, egress):
    if None in (vm_hourly, disk_gb_month, egress):
        return None
    return round(vm_hourly * HOURS + disk_gb_month * DISK_GB + egress, 2)


# ---- AWS -----------------------------------------------------------------------------------------
AWS_WEB = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps"
AWS_VM, AWS_VM_FALLBACK, AWS_GPU = "m7i.xlarge", "m6i.xlarge", {"h100": ("p5.48xlarge", 8), "blackwell": ("p6-b200.48xlarge", 8)}


def aws():
    ebs = get(AWS_WEB + "/ec2/USD/current/ebs.json")["regions"]
    out = {}
    for r in regions("aws"):
        dt_offer = get("https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/%s/index.json" % r["id"])
        # Price files name regions by location, not code, and not always as the map does
        # ("EU (Frankfurt)", not "Europe (Frankfurt)"), so take AWS's own name for this code.
        loc = next((p["attributes"]["fromLocation"] for p in (dt_offer or {}).get("products", {}).values()
                    if p["attributes"].get("fromRegionCode") == r["id"]), r["name"])
        ec2 = get(AWS_WEB + "/ec2/USD/current/ec2-ondemand-without-sec-sel/%s/Linux/index.json" % urllib.parse.quote(loc))
        rows = {v.get("Instance Type"): float(v["price"]) for v in ((ec2 or {}).get("regions", {}).get(loc, {}) or {}).values()}
        disk = next((float(v["price"]) for k, v in ebs.get(loc, {}).items() if k == "Storage General Purpose gp3 GB Mo"), None)
        egress = None
        if dt_offer:
            tiers = []
            for sku, p in dt_offer["products"].items():
                a = p["attributes"]
                if a.get("transferType") == "AWS Outbound" and a.get("toLocation") == "External" and a.get("fromLocation") == loc:
                    for term in dt_offer["terms"]["OnDemand"].get(sku, {}).values():
                        for pd in term["priceDimensions"].values():
                            tiers.append((float(pd["beginRange"]), float(pd["pricePerUnit"]["USD"])))
            if tiers:
                # AWS gives the first 100 GB a month free across all regions.
                egress = tiered([(0, 0.0)] + [(max(s, 100.0), p) for s, p in tiers], EGRESS_GB)
        sku = AWS_VM if AWS_VM in rows else AWS_VM_FALLBACK   # previous generation where m7i is not offered
        vm = rows.get(sku)
        out[r["id"]] = {
            "vm": {"sku": sku, "hourly": vm, "fallback": sku != AWS_VM} if vm else None, "disk_gb_month": disk, "egress_1tb": egress,
            "general_monthly": basket(vm, disk, egress),
            "gpu": {k: ({"sku": sku, "gpus": n, "per_gpu_hour": round(rows[sku] / n, 4)} if sku in rows else None)
                    for k, (sku, n) in AWS_GPU.items()},
        }
        print("aws", r["id"], out[r["id"]]["general_monthly"], file=sys.stderr)
    return out, {
        "aws-prices-ec2": src("AWS EC2 on-demand pricing data (the feed behind aws.amazon.com/ec2/pricing)",
                              "https://aws.amazon.com/ec2/pricing/on-demand/", "m7i.xlarge (m6i.xlarge where m7i is not offered), p5.48xlarge and p6-b200.48xlarge, Linux, per region."),
        "aws-prices-ebs": src("AWS EBS pricing data", "https://aws.amazon.com/ebs/pricing/", "gp3 storage per GB-month, per region."),
        "aws-prices-egress": src("AWS Price List API: AWSDataTransfer offer",
                                 "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/region_index.json",
                                 "Data transfer out to the internet, tiered, per region; first 100 GB a month free."),
    }


# ---- Azure ---------------------------------------------------------------------------------------
AZ_VM, AZ_GPU = "Standard_D4s_v5", {"h100": ("Standard_ND96isr_H100_v5", 8), "blackwell": ("Standard_ND128isr_NDR_GB200_v6", 4)}


def az_query(f):
    u = "https://prices.azure.com/api/retail/prices?" + urllib.parse.urlencode({"$filter": f})
    rows = []
    while u:
        d = get(u); rows += d["Items"]; u = d.get("NextPageLink")
    return rows


def az_linux(rows):
    return {r["armRegionName"]: r["retailPrice"] for r in rows
            if r["type"] == "Consumption" and "Windows" not in r["productName"]
            and "Spot" not in r["skuName"] and "Low Priority" not in r["skuName"] and r["retailPrice"] > 0}


def azure():
    vm = az_linux(az_query("serviceName eq 'Virtual Machines' and armSkuName eq '%s'" % AZ_VM))
    gpu = {k: az_linux(az_query("serviceName eq 'Virtual Machines' and armSkuName eq '%s'" % sku)) for k, (sku, n) in AZ_GPU.items()}
    disk = {r["armRegionName"]: r["retailPrice"] * HOURS for r in az_query(
        "serviceName eq 'Storage' and productName eq 'Azure Premium SSD v2' and meterName eq 'Premium LRS Provisioned Capacity'")
        if r["type"] == "Consumption"}
    eg, eg_internet = {}, {}
    for prod, into in (("Rtn Preference: MGN", eg), ("Bandwidth - Routing Preference: Internet", eg_internet)):
        for r in az_query("serviceName eq 'Bandwidth' and productName eq '%s' and meterName eq 'Standard Data Transfer Out'" % prod):
            into.setdefault(r["armRegionName"], []).append((float(r["tierMinimumUnits"]), r["retailPrice"]))
    out = {}
    for r in regions("azure"):
        i = r["id"]
        # Default routing is the Microsoft network; a few regions list only internet routing.
        e = tiered(eg[i], EGRESS_GB) if i in eg else tiered(eg_internet[i], EGRESS_GB) if i in eg_internet else None
        v = vm.get(i)
        out[i] = {
            "egress_routing": "microsoft" if i in eg else "internet" if i in eg_internet else None,
            "vm": {"sku": AZ_VM, "hourly": v} if v else None, "disk_gb_month": round(disk[i], 4) if i in disk else None,
            "egress_1tb": e, "general_monthly": basket(v, disk.get(i), e),
            "gpu": {k: ({"sku": sku, "gpus": n, "per_gpu_hour": round(gpu[k][i] / n, 4)} if i in gpu[k] else None)
                    for k, (sku, n) in AZ_GPU.items()},
        }
    return out, {
        "azure-retail-prices": src("Azure Retail Prices API", "https://prices.azure.com/api/retail/prices",
                                   "D4s_v5, ND96isr H100 v5 and ND128isr GB200 v6 (Linux, pay-as-you-go), Premium SSD v2 capacity "
                                   "(baseline IOPS and throughput included), Standard data transfer out over the Microsoft network "
                                   "(the default routing), tiered with the first 100 GB free."),
    }


# ---- Oracle --------------------------------------------------------------------------------------
OCI_PARTS = {"ocpu": "B97384", "mem": "B97385", "blk": "B91961", "vpu": "B91962",
             "h100": "B98415", "b200": "B110978", "egress_na": "B88327", "egress_apac": "B93455", "egress_mea": "B93456"}


def oracle():
    items = {i["partNumber"]: i for i in get("https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/?currencyCode=USD")["items"]}
    price = lambda p: next(x["value"] for x in items[OCI_PARTS[p]]["currencyCodeLocalizations"][0]["prices"] if x["value"] > 0)
    vm_h = 2 * price("ocpu") + 16 * price("mem")          # 2 OCPU = 4 vCPU
    disk = price("blk") + 10 * price("vpu")                 # Balanced performance = 10 VPU per GB
    out = {}
    for r in regions("oracle"):
        zone = "egress_mea" if r["geo"] in ("Middle East", "Africa") else "egress_apac" if r["geo"] in ("Asia Pacific", "South America") else "egress_na"
        e = tiered([(0, 0.0), (10240, price(zone))], EGRESS_GB)   # first 10 TB a month free
        out[r["id"]] = {
            "vm": {"sku": "VM.Standard.E5.Flex (2 OCPU, 16 GB)", "hourly": round(vm_h, 4)}, "disk_gb_month": round(disk, 4),
            "egress_1tb": e, "general_monthly": basket(vm_h, disk, e),
            "gpu": {"h100": {"sku": "BM.GPU.H100.8", "gpus": 8, "per_gpu_hour": price("h100")},
                    "blackwell": {"sku": "BM.GPU.B200.8", "gpus": 8, "per_gpu_hour": price("b200")}},
            "gpu_availability": "not published",
        }
    return out, {
        "oci-price-list": src("Oracle Cloud price list API", "https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/?currencyCode=USD",
                              "Oracle publishes one price list for every commercial region. E5 Flex OCPU and memory, Block Volume at "
                              "Balanced performance (10 VPU/GB), outbound transfer with the first 10 TB a month free, H100 and B200 per "
                              "GPU-hour. The price list does not say which regions offer GPU shapes."),
    }


# ---- Google --------------------------------------------------------------------------------------
def gcp():
    key = os.environ.get("GCP_PRICING_KEY")
    key_file = os.path.join(os.path.expanduser("~"), ".config", "proxima", "gcp-pricing-key.txt")   # outside every repo
    if not key and os.path.exists(key_file):
        key = io.open(key_file, encoding="utf-8").read().strip()
    if not key:
        print("gcp skipped: no key in GCP_PRICING_KEY or %s" % key_file, file=sys.stderr)
        return None, {}
    skus, tok = [], ""
    while True:   # Compute Engine's catalog, about 35,000 SKUs
        d = get("https://cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus?" +
                urllib.parse.urlencode({"key": key, "currencyCode": "USD", "pageSize": 5000, "pageToken": tok}))
        skus += d.get("skus", []); tok = d.get("nextPageToken")
        if not tok:
            break

    def rates(s):
        pe = s["pricingInfo"][0]["pricingExpression"]
        return [(float(t["startUsageAmount"]), int(t["unitPrice"]["units"]) + t["unitPrice"]["nanos"] / 1e9) for t in pe["tieredRates"]]

    def find(region, prefix, suffix="", exclude=()):
        for s in skus:
            ds = s["description"]
            if (region in s["serviceRegions"] and s["category"]["usageType"] == "OnDemand" and ds.startswith(prefix)
                    and ds.endswith(suffix) and not any(x in ds for x in exclude)):
                return rates(s)
        return None

    unit = lambda r: max(p for _, p in r) if r else None
    out = {}
    for r in regions("gcp"):
        i = r["id"]
        core, ram = unit(find(i, "N2 Instance Core running in")), unit(find(i, "N2 Instance Ram running in"))
        vm = round(4 * core + 16 * ram, 6) if core and ram else None
        disk = unit(find(i, "Balanced PD Capacity", exclude=("Regional",)))
        eg = find(i, "Network Internet Data Transfer Out from", " to Americas")
        egress = tiered(eg, EGRESS_GB) if eg else None
        h100, a3c, a3r = (unit(find(i, "Nvidia H100 80GB GPU running in")), unit(find(i, "A3 Instance Core running in")),
                          unit(find(i, "A3 Instance Ram running in")))
        b200 = unit(find(i, "A4 Nvidia B200 (1 gpu slice) running in"))
        out[i] = {
            "vm": {"sku": "n2-standard-4", "hourly": vm} if vm else None, "disk_gb_month": disk, "egress_1tb": egress,
            "egress_basis": "premium tier, destination Americas", "general_monthly": basket(vm, disk, egress),
            # GPU SKUs are priced by pricing zone, which covers regions that do not offer the machine type.
            "gpu_availability": "not confirmed",
            "gpu": {
                # a3-highgpu-8g: 8 x H100 + 208 vCPU + 1,872 GB, priced as parts; A4 is sold per one-GPU slice.
                "h100": {"sku": "a3-highgpu-8g", "gpus": 8, "per_gpu_hour": round((8 * h100 + 208 * a3c + 1872 * a3r) / 8, 4)}
                        if h100 and a3c and a3r else None,
                "blackwell": {"sku": "a4-highgpu-8g (B200)", "gpus": 8, "per_gpu_hour": round(b200, 4)} if b200 else None},
        }
    return out, {
        "gcp-billing-catalog": src("Google Cloud Billing Catalog API: Compute Engine SKUs",
                                   "https://cloud.google.com/billing/docs/reference/rest/v1/services.skus/list",
                                   "On-demand N2 core and RAM (n2-standard-4 = 4 vCPU + 16 GB), Balanced persistent disk, premium-tier "
                                   "internet egress to the Americas (Google prices egress by destination), H100 GPU plus A3 core and RAM "
                                   "for a3-highgpu-8g, and the A4 B200 one-GPU slice, per region."),
    }


def src(title, url, note):
    return {"title": title, "url": url, "accessed": TODAY, "tier": "A", "note": note}


FETCH = {"aws": aws, "azure": azure, "oracle": oracle, "gcp": gcp}


def main():
    want = sys.argv[1:] or list(FETCH)
    try:
        doc = json.load(io.open(OUT, encoding="utf-8"))
    except FileNotFoundError:
        doc = {"schema": "prices-1", "providers": {}, "sources": {}}
    doc.update({"as_of": TODAY, "currency": "USD", "basket": {
        "general": "Per month: a 4 vCPU / 16 GiB Linux VM for 730 hours on demand, 500 GB of general-purpose SSD block "
                   "storage, and 1 TB (1,024 GB) of internet egress at tiered list rates with free allowances.",
        "gpu": "On-demand list price per GPU-hour: an 8 x H100 node, and a Blackwell node (B200, or GB200 where that is "
               "the provider's offering), divided by the GPUs in the node."}})
    for p in want:
        data, sources = FETCH[p]()
        if data is not None:
            doc["providers"][p] = data
            doc["sources"].update(sources)
    with io.open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    for p, rs in doc["providers"].items():
        g = [v["general_monthly"] for v in rs.values() if v["general_monthly"]]
        print("%-7s %3d regions, %3d priced, general basket $%s to $%s" % (p, len(rs), len(g), min(g) if g else "-", max(g) if g else "-"))


if __name__ == "__main__":
    main()
