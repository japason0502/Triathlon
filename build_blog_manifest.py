#!/usr/bin/env python3
"""
Scan blog/posts/*.html and blog/posts/*.md and write blog/posts.json (newest date first).
If .md exists, generate a matching .html on build.
Also writes sitemap.xml at the repo root so Google can crawl new posts.
Run after adding or editing a post, and in CI before deploy.
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup
from markdown import Markdown

ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / "blog" / "posts"
OUT = ROOT / "blog" / "posts.json"
SITEMAP_OUT = ROOT / "sitemap.xml"

# Override via env var in CI if you switch to a custom domain.
SITE_BASE_URL = os.environ.get(
    "SITE_BASE_URL", "https://japason0502.github.io/Triathlon/"
).rstrip("/") + "/"

MD_FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_front_matter(md_text: str) -> tuple[dict[str, str], str]:
    """
    Minimal front matter parser.
    Format:
    ---
    date: 2026-04-13
    title: タイトル
    description: 説明（任意）
    tags: お知らせ, サイト   (任意)
    ---
    """
    m = MD_FRONT_MATTER_RE.match(md_text)
    if not m:
        return {}, md_text

    raw = m.group(1)
    meta: dict[str, str] = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        meta[k.strip().lower()] = v.strip()
    body = md_text[m.end() :]
    return meta, body


def _md_to_post_html(*, slug: str, title: str, date: str, description: str, tags: list[str], body_html: str) -> str:
    tags_html = "".join(f'<span class="tag">{_escape_html(t)}</span>' for t in tags if t)
    tags_block = f'<div class="post-tags">{tags_html}</div>' if tags_html else ""
    desc_meta = _escape_html(description)
    title_meta = _escape_html(title)
    date_meta = _escape_html(date)
    canonical = _escape_html(f"{SITE_BASE_URL}blog/posts/{slug}.html")

    return (
        "<!DOCTYPE html>\n"
        '<html lang="ja">\n'
        "  <head>\n"
        '    <meta charset="UTF-8" />\n'
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        f'    <meta name="description" content="{desc_meta}" />\n'
        f'    <link rel="canonical" href="{canonical}" />\n'
        f'    <meta property="og:type" content="article" />\n'
        f'    <meta property="og:title" content="{title_meta}" />\n'
        f'    <meta property="og:description" content="{desc_meta}" />\n'
        f'    <meta property="og:url" content="{canonical}" />\n'
        f"    <title>{title_meta} | Triathlon</title>\n"
        '    <link rel="stylesheet" href="../../assets/css/base.css" />\n'
        '    <link rel="stylesheet" href="../../assets/css/blog.css" />\n'
        "  </head>\n"
        "  <body>\n"
        '    <header class="site-header">\n'
        "      <h1>🏊🚴🏃 Triathlon ブログ</h1>\n"
        "      <p>練習の記録・イベントメモ・リンク集</p>\n"
        '      <nav class="site-nav" aria-label="サイト内">\n'
        '        <a href="../../index.html">ホーム</a>\n'
        '        <a href="../../schedule.html">スケジュール</a>\n'
        '        <a href="../index.html">ブログ</a>\n'
        "      </nav>\n"
        "    </header>\n"
        "    <main>\n"
        '      <nav class="breadcrumb" aria-label="パンくず">\n'
        '        <a href="../../index.html">ホーム</a> › <a href="../index.html">ブログ</a> › 記事\n'
        "      </nav>\n"
        '      <article class="post">\n'
        '        <header class="post-header">\n'
        f'          <time datetime="{date_meta}">{date_meta}</time>\n'
        f"          <h1>{title_meta}</h1>\n"
        f"          {tags_block}\n"
        "        </header>\n"
        '        <div class="post-body">\n'
        f"{body_html}\n"
        "        </div>\n"
        '        <footer class="post-footer">\n'
        '          <a href="../index.html">← 記事一覧へ</a>\n'
        "        </footer>\n"
        "      </article>\n"
        "    </main>\n"
        '    <footer class="site-footer">\n'
        '      <p><a href="../../index.html">← ホームへ</a> · <a href="../../schedule.html">スケジュール</a></p>\n'
        "    </footer>\n"
        "  </body>\n"
        "</html>\n"
    )


def _escape_html(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_md_post(md_path: Path) -> Path | None:
    raw = md_path.read_text(encoding="utf-8")
    meta, body_md = _parse_front_matter(raw)

    title = meta.get("title", "").strip()
    date_str = meta.get("date", "").strip()
    description = meta.get("description", "").strip()
    tags_raw = meta.get("tags", "").strip()
    tags = [t.strip() for t in tags_raw.split(",")] if tags_raw else []

    if not title:
        print(f"skip (md no title): {md_path.name} (add front matter title:)", file=sys.stderr)
        return None
    if not date_str:
        print(f"skip (md no date): {md_path.name} (add front matter date: YYYY-MM-DD)", file=sys.stderr)
        return None

    md = Markdown(extensions=["extra", "fenced_code", "tables", "sane_lists"])
    body_html = md.convert(body_md)

    out_path = md_path.with_suffix(".html")
    out_path.write_text(
        _md_to_post_html(
            slug=md_path.stem,
            title=title,
            date=date_str,
            description=description,
            tags=tags,
            body_html=body_html,
        ),
        encoding="utf-8",
    )
    return out_path


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


def write_sitemap(posts: list[dict]) -> None:
    """
    Emit sitemap.xml at repo root. Google reads <lastmod> to detect updates.
    """
    today = date.today().isoformat()
    newest_post = posts[0]["date"] if posts else today

    urls: list[tuple[str, str]] = [
        (SITE_BASE_URL, newest_post),
        (f"{SITE_BASE_URL}schedule.html", today),
    ]
    for p in posts:
        urls.append((f"{SITE_BASE_URL}blog/posts/{p['slug']}.html", p["date"]))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{_escape_html(loc)}</loc>")
        lines.append(f"    <lastmod>{_escape_html(lastmod)}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")
    SITEMAP_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {SITEMAP_OUT} ({len(urls)} URLs)")


def main() -> int:
    if not POSTS_DIR.is_dir():
        print(f"not found: {POSTS_DIR}", file=sys.stderr)
        return 1

    posts: list[dict] = []
    # 先に Markdown を HTML に変換（同名 .html を生成）
    for md_path in sorted(POSTS_DIR.glob("*.md")):
        if md_path.name.startswith("."):
            continue
        built = build_md_post(md_path)
        if built:
            parsed = parse_post(built)
            if parsed:
                posts.append(parsed)

    # 既存の HTML も拾う（手書き HTML / 生成済み HTML）
    for path in sorted(POSTS_DIR.glob("*.html")):
        if path.name.startswith("."):
            continue
        # すでに md から生成した同名 HTML を二重で追加しない
        if any(p.get("slug") == path.stem for p in posts):
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

    write_sitemap(posts)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
