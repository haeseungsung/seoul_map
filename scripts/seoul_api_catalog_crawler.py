#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Seoul Open Data Plaza - API catalog crawler (v2)

- Fetch full service list with pagination (<=1000 rows per call)
- Optionally fetch IO params per service (SearchOpenAPIIOValueService)
- Save to CSV + JSONL

Usage:
  export SEOUL_API_KEY="YOUR_KEY"
  python seoul_api_catalog_crawler.py --outdir out --format json

  # with IO params (can be slow)
  python seoul_api_catalog_crawler.py --outdir out --with-io --io-sample-n 200
"""

import argparse
import csv
import json
import os
import re
import sys
import time
try:
    from urllib.parse import quote
except ImportError:
    from urllib import quote

try:
    import requests
except ImportError:
    print("ERROR: requests library not found. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)


BASE = "http://openapi.seoul.go.kr:8088"
MAX_PER_CALL = 1000  # Seoul OpenAPI max rows per call


def _detect_service_root(payload):
    """
    Seoul OpenAPI JSON usually looks like:
      { "SomeServiceName": { "list_total_count":..., "RESULT":..., "row":[...] } }
    """
    for k, v in payload.items():
        if isinstance(v, dict) and ("row" in v or "RESULT" in v or "list_total_count" in v):
            return k
    if "row" in payload or "RESULT" in payload:
        return None
    return None


def _parse_result(payload):
    root = _detect_service_root(payload)
    data = payload[root] if root else payload

    total = data.get("list_total_count")
    result = data.get("RESULT") or {}
    code = result.get("CODE")
    message = result.get("MESSAGE")

    rows = data.get("row") or []
    if isinstance(rows, dict):
        rows = [rows]

    return {
        'total': total,
        'code': code,
        'message': message,
        'rows': rows
    }


def _get_json(url, timeout=30, retries=3, sleep=0.6):
    last_err = None
    for i in range(retries):
        try:
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last_err = e
            time.sleep(sleep * (i + 1))
    raise RuntimeError("GET failed after {} retries: {}\n{}".format(retries, url, last_err))


def build_catalog_url(api_key, fmt, start, end, inf_id="", keyword=""):
    """
    Catalog list sample:
      .../SearchCatalogService/1/5/
      .../SearchCatalogService/1/5/OA-xxxx/
      .../SearchCatalogService/1/5//통계/
    """
    parts = [BASE, quote(api_key), fmt, "SearchCatalogService", str(start), str(end)]
    if inf_id or keyword:
        parts.append(quote(inf_id) if inf_id else "")
    if keyword:
        parts.append(quote(keyword))
    return "/".join(parts) + "/"


def build_io_url(api_key, fmt, start, end, service_id):
    """
    IO params sample:
      http://openAPI.seoul.go.kr:8088/(인증키)/xml/SearchOpenAPIIOValueService/1/5/OA-110/
    """
    return "{}/{}/{}/SearchOpenAPIIOValueService/{}/{}/{}/".format(
        BASE, quote(api_key), fmt, start, end, quote(service_id))


def fetch_full_catalog(api_key, fmt="json", sleep=0.25):
    all_rows = []
    start = 1
    total = None

    while True:
        end = start + MAX_PER_CALL - 1
        url = build_catalog_url(api_key, fmt, start, end)

        payload = _get_json(url)
        parsed = _parse_result(payload)

        if parsed['code'] and parsed['code'] != "INFO-000":
            raise RuntimeError("API error: {} {} (url={})".format(
                parsed['code'], parsed['message'], url))

        if total is None:
            total = parsed['total']

        rows = parsed['rows']
        if not rows:
            break

        all_rows.extend(rows)

        if total is not None and len(all_rows) >= int(total):
            break

        start = end + 1
        time.sleep(sleep)

    return all_rows


def fetch_io_params_for_service(api_key, service_id, fmt="json", sleep=0.2):
    """
    IO params might be small; still use paging to be safe.
    """
    all_rows = []
    start = 1
    total = None

    while True:
        end = start + 200 - 1
        url = build_io_url(api_key, fmt, start, end, service_id)

        payload = _get_json(url)
        parsed = _parse_result(payload)

        if parsed['code'] and parsed['code'] != "INFO-000":
            # Some services may not have IO info exposed; skip gracefully
            return []

        if total is None:
            total = parsed['total']

        rows = parsed['rows']
        if not rows:
            break

        all_rows.extend(rows)

        if total is not None and len(all_rows) >= int(total):
            break

        start = end + 1
        time.sleep(sleep)

    return all_rows


def save_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def save_csv(path, rows):
    # collect union of keys
    keys = sorted(set(k for r in rows for k in r.keys()))
    with open(path, "w", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in keys})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=os.getenv("SEOUL_API_KEY", "").strip(),
                    help="Seoul OpenAPI key (or env SEOUL_API_KEY)")
    ap.add_argument("--outdir", default="out", help="Output directory")
    ap.add_argument("--format", default="json", choices=["json"],
                    help="Seoul OpenAPI response format (json recommended)")
    ap.add_argument("--with-io", action="store_true",
                    help="Also fetch IO params per service id")
    ap.add_argument("--io-sample-n", type=int, default=0,
                    help="Limit IO fetch to first N services (0 = all)")
    ap.add_argument("--sleep", type=float, default=0.25,
                    help="Sleep seconds between calls")
    args = ap.parse_args()

    if not args.key:
        print("ERROR: API key missing. Set --key or export SEOUL_API_KEY.", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(args.outdir):
        os.makedirs(args.outdir)

    print("Fetching full catalog (SearchCatalogService) ...")
    catalog = fetch_full_catalog(args.key, fmt=args.format, sleep=args.sleep)
    print("Catalog rows: {}".format(len(catalog)))

    catalog_jsonl = os.path.join(args.outdir, "seoul_catalog.jsonl")
    catalog_csv = os.path.join(args.outdir, "seoul_catalog.csv")
    save_jsonl(catalog_jsonl, catalog)
    save_csv(catalog_csv, catalog)
    print("Saved: {}".format(catalog_jsonl))
    print("Saved: {}".format(catalog_csv))

    if args.with_io:
        oa_re = re.compile(r"OA-\d+")
        service_ids = []
        for r in catalog:
            for v in r.values():
                if isinstance(v, str):
                    m = oa_re.search(v)
                    if m:
                        service_ids.append(m.group(0))
                        break

        # de-dup preserve order
        seen = set()
        uniq_ids = []
        for sid in service_ids:
            if sid not in seen:
                seen.add(sid)
                uniq_ids.append(sid)

        if args.io_sample_n and args.io_sample_n > 0:
            uniq_ids = uniq_ids[:args.io_sample_n]

        print("Fetching IO params for {} services (SearchOpenAPIIOValueService) ...".format(len(uniq_ids)))
        io_rows = []
        for i, sid in enumerate(uniq_ids, 1):
            params = fetch_io_params_for_service(args.key, sid, fmt=args.format, sleep=args.sleep)
            for p in params:
                p["_service_id"] = sid
            io_rows.extend(params)
            if i % 50 == 0:
                print("  ... {}/{} done".format(i, len(uniq_ids)))

        io_jsonl = os.path.join(args.outdir, "seoul_io_params.jsonl")
        io_csv = os.path.join(args.outdir, "seoul_io_params.csv")
        save_jsonl(io_jsonl, io_rows)
        save_csv(io_csv, io_rows)
        print("Saved: {}".format(io_jsonl))
        print("Saved: {}".format(io_csv))

    print("Done.")


if __name__ == "__main__":
    main()
