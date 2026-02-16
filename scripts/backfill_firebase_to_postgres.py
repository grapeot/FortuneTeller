"""Backfill share documents from Firebase Firestore to PostgreSQL share storage."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Iterable, List


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server.firebase import firestore_retry, get_db, init_firestore  # noqa: E402
from server.storage import PostgresShareStorage  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill Firestore shares into Postgres")
    parser.add_argument(
        "--database-url",
        default=None,
        help="Postgres URL override. Defaults to SHARE_DATABASE_URL.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite records that already exist in Postgres.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of Firestore document refs to process per batch.",
    )
    parser.add_argument(
        "--sleep-between-batches",
        type=float,
        default=0.2,
        help="Seconds to sleep between batches to reduce burst load.",
    )
    parser.add_argument(
        "--max-docs",
        type=int,
        default=0,
        help="Optional cap for total documents to process (0 means no cap).",
    )
    return parser.parse_args()


def _batched(items: Iterable, size: int) -> Iterable[List]:
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def main() -> int:
    args = parse_args()

    database_url = args.database_url
    if not database_url:
        from os import getenv

        database_url = getenv("SHARE_DATABASE_URL", "").strip()
    if not database_url:
        print("ERROR: SHARE_DATABASE_URL is required")
        return 1

    db = get_db()
    if db is None:
        init_firestore()
        db = get_db()
    if not db:
        print("ERROR: Firestore is not configured. Check Firebase credentials.")
        return 1

    target = PostgresShareStorage(database_url)

    total = 0
    created = 0
    skipped = 0
    updated = 0
    failed = 0

    refs_iter = db.collection("fortunes").list_documents(page_size=args.batch_size)
    for ref_batch in _batched(refs_iter, args.batch_size):
        for ref in ref_batch:
            if args.max_docs > 0 and total >= args.max_docs:
                break

            total += 1
            share_id = ref.id

            try:
                doc = firestore_retry(ref.get, max_retries=6, base_delay=1.0)
                if not doc.exists:
                    skipped += 1
                    continue

                payload = doc.to_dict() or {}
                existing = target.get_share(share_id)

                if existing is None:
                    target.create_share(share_id, payload)
                    created += 1
                elif args.overwrite:
                    target.update_share(share_id, payload)
                    updated += 1
                else:
                    skipped += 1
            except Exception as exc:
                failed += 1
                print(f"WARN: failed share_id={share_id}: {exc}", flush=True)

        print(
            "Progress:",
            f"total={total}",
            f"created={created}",
            f"updated={updated}",
            f"skipped={skipped}",
            f"failed={failed}",
            flush=True,
        )

        if args.max_docs > 0 and total >= args.max_docs:
            break

        if args.sleep_between_batches > 0:
            time.sleep(args.sleep_between_batches)

    print(
        "Backfill complete:",
        f"total={total}",
        f"created={created}",
        f"updated={updated}",
        f"skipped={skipped}",
        f"failed={failed}",
        flush=True,
    )

    return 0 if failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
