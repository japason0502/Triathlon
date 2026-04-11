#!/usr/bin/env python3
"""
Scan blog/posts/*.html and write blog/posts.json (newest date first).
Run after adding or editing a post, and in CI before deploy.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / "blog" / "posts"
OUT = ROOT / "blog" / "posts.json"


def parse_post(path: Path) -> dict | None:
    raw = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(raw, "html.parser")

    time_el = soup.select_one("article.post .post-header time[datetime]")
    if not time_el or not time_el.get("datetime"):
        print(f"skip (no time): {path.name}", file=sys.stderr)
        return None
    date_str = time_el["datetime"].strip()

    h1 = soup.select_one("article.post .post-header h1")
    title_el = soup.find("title")
    title = (h1.get_text(strip=True) if h1 else None) or (
        title_el.get_text(strip=True).split("|")[0].strip() if title_el else ""
    )
    if not title:
        print(f"skip (no title): {path.name}", file=sys.stderr)
        return None

    meta = soup.find("meta", attrs={"name": "description"})
    description = (meta.get("content") or "").strip() if meta else ""

    slug = path.stem
    rel = f"posts/{path.name}"

    return {
        "slug": slug,
        "path": rel,
        "date": date_str,
        "title": title,
        "description": description,
    }


def main() -> int:
    if not POSTS_DIR.is_dir():
        print(f"not found: {POSTS_DIR}", file=sys.stderr)
        return 1

    posts: list[dict] = []
    for path in sorted(POSTS_DIR.glob("*.html")):
        if path.name.startswith("."):
            continue
        parsed = parse_post(path)
        if parsed:
            posts.append(parsed)

    # ISO date strings sort correctly for YYYY-MM-DD
    posts.sort(key=lambda p: p["date"], reverse=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"posts": posts}
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} ({len(posts)} posts)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
