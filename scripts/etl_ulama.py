#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import Any, Dict, List

try:
    from datasets import load_dataset
except Exception as e:
    print("ERROR: `datasets` library not found. Please install with: pip install datasets", file=sys.stderr)
    raise

KEYS_NAME = [
    "name", "fullname", "displayname", "searchname", "Name"
]
KEYS_NAME_AR = [
    "arabicname", "name_ar", "ArabicName"
]
KEYS_ORIGIN = [
    "origin", "birth_place", "birth_date_place", "country", "place_of_birth", "place"
]
KEYS_BIRTH_HIJRI = [
    "birth_date_hijri", "birth_hijri"
]
KEYS_DEATH_HIJRI = [
    "death_date_hijri", "death_hijri"
]
KEYS_BIRTH_GREG = [
    "birth_date_gregorian", "birth_date", "birth", "born"
]
KEYS_DEATH_GREG = [
    "death_date_gregorian", "death_date", "death", "died"
]
KEYS_WORKS = [
    "works", "books", "publications"
]
KEYS_BIO = [
    "bio", "info", "biography", "description"
]
KEYS_ID = [
    "id", "ID", "scholar_indx", "scholar_index", "index"
]


def pick(row: Dict[str, Any], keys: List[str], default: Any = None):
    for k in keys:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return default


def normalize_row(row: Dict[str, Any], idx: int) -> Dict[str, Any]:
    name = pick(row, KEYS_NAME, default=None)
    name_ar = pick(row, KEYS_NAME_AR, default=None)
    origin = pick(row, KEYS_ORIGIN, default=None)
    birth_hijri = pick(row, KEYS_BIRTH_HIJRI, default=None)
    death_hijri = pick(row, KEYS_DEATH_HIJRI, default=None)
    birth_gregorian = pick(row, KEYS_BIRTH_GREG, default=None)
    death_gregorian = pick(row, KEYS_DEATH_GREG, default=None)
    works = pick(row, KEYS_WORKS, default=None)
    bio = pick(row, KEYS_BIO, default=None)
    rid = pick(row, KEYS_ID, default=None)

    if works is None:
        works = []
    elif not isinstance(works, list):
        works = [works]

    norm = {
        "id": rid if rid is not None else idx,
        "name": name if name is not None else "(nama tidak tersedia)",
        "name_ar": name_ar if name_ar is not None else None,
        "origin": origin if origin is not None else None,
        "birth_hijri": birth_hijri,
        "death_hijri": death_hijri,
        "birth_gregorian": birth_gregorian,
        "death_gregorian": death_gregorian,
        "works": works,
        "bio": bio,
        "raw": row,  # simpan semua kolom mentah TANPA PENGECUALIAN
    }
    return norm


def dataset_to_list(ds_any: Any) -> List[Dict[str, Any]]:
    # ds_any bisa berupa DatasetDict (dengan split) atau Dataset tunggal
    items: List[Dict[str, Any]] = []
    if hasattr(ds_any, "items"):
        # kemungkinan DatasetDict
        for split_name, split in ds_any.items():
            for i in range(len(split)):
                items.append(dict(split[i]))
    else:
        # Dataset tunggal
        for i in range(len(ds_any)):
            items.append(dict(ds_any[i]))
    return items


def main():
    ap = argparse.ArgumentParser(description="ETL: Import Islamic Scholars dataset dari Hugging Face ke ulama.json")
    ap.add_argument("--dataset", required=True, help="Nama dataset di Hugging Face, mis. 'Mahadih534/Islamic-Scholars-data'")
    ap.add_argument("--out", required=True, help="Path output JSON, mis. 'src/data/ulama.json'")
    ap.add_argument("--split", default=None, help="Opsional: nama split tertentu jika diperlukan")
    args = ap.parse_args()

    print(f"Memuat dataset: {args.dataset}")
    try:
        ds_loaded = load_dataset(args.dataset, split=args.split) if args.split else load_dataset(args.dataset)
    except Exception as e:
        print(f"Gagal memuat dataset: {e}", file=sys.stderr)
        sys.exit(1)

    rows = dataset_to_list(ds_loaded)
    print(f"Jumlah baris terambil: {len(rows)}")

    normalized: List[Dict[str, Any]] = []
    for idx, row in enumerate(rows):
        normalized.append(normalize_row(row, idx))

    out_path = args.out
    out_dir = os.path.dirname(out_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print(f"Sukses menulis: {out_path}")


if __name__ == "__main__":
    main()