#!/usr/bin/env python3
"""
トライアスロン練習会スケジュール取得 & HTML生成スクリプト
GitHub Actions で定期実行し、index.html を自動更新します。

対応ソース:
  - connpass API (構造化APIなのでAI不要)
  - サイクルショップエンドウ (AI解析)
  - Triathlon LUMINA / イベントインフォメーション (AI解析)

必要な環境変数:
  ANTHROPIC_API_KEY  ... Claude APIキー（GitHub Actions Secretsに登録）
"""

import json
import os
import re
import sys
import urllib.request
import urllib.parse
import datetime
import html as html_module

# ── 外部ライブラリ ──────────────────────────────────────
try:
    from bs4 import BeautifulSoup
except ImportError:
    print("[ERROR] beautifulsoup4 が必要です: pip install beautifulsoup4", file=sys.stderr)
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("[ERROR] anthropic が必要です: pip install anthropic", file=sys.stderr)
    sys.exit(1)

# ═══════════════════════════════════════════════════════
# 設定
# ═══════════════════════════════════════════════════════
CONNPASS_KEYWORDS = ["トライアスロン", "triathlon"]
CONNPASS_COUNT    = 50
OUTPUT_FILE       = "index.html"
AI_MODEL          = "claude-haiku-4-5-20251001"   # 安くて速い

JST = datetime.timezone(datetime.timedelta(hours=9))

# AI解析対象サイト（追加するときはここに書くだけ）
AI_SCRAPE_TARGETS = [
    {
        "name":  "エンドウ練習会",
        "url":   "https://cycleshopendo.com/shop/post-25594.html",
        "hint":  "サイクルショップエンドウのトライアスロン練習会スケジュールページ。"
                 "年間の練習会の日程が記載されている。場所は主に湘南エリア（神奈川県）。",
    },
    {
        "name":  "LUMINA",
        "url":   "https://triathlon-lumina.com/category/item/entry/",
        "hint":  "Triathlon LUMINAのイベントインフォメーションカテゴリ。"
                 "記事タイトル・公開日・URLの一覧が並んでいる。"
                 "各記事は個別のトライアスロン大会や練習会のエントリー情報。",
    },
]
# ═══════════════════════════════════════════════════════


# ──────────────────────────────────────────────────────
# 共通ユーティリティ
# ──────────────────────────────────────────────────────

def _fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ja,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=20) as res:
        charset = res.headers.get_content_charset() or "utf-8"
        return res.read().decode(charset, errors="ignore")


def _html_to_text(html: str) -> str:
    """HTMLからナビゲーション・広告等を除いたメインテキストを抽出する"""
    soup = BeautifulSoup(html, "html.parser")
    # ノイズ除去
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
        tag.decompose()
    # メインコンテンツ候補
    main = (
        soup.find("main")
        or soup.find(class_=re.compile(r"\b(entry|post|article|content|main)\b", re.I))
        or soup.find("article")
        or soup.body
    )
    return (main or soup).get_text("\n", strip=True)


def _make_sort_key(date_str: str, time_str: str) -> str:
    """'YYYY/MM/DD' + 'HH:MM' → ISO8601ソートキー"""
    try:
        y, m, d = map(int, date_str.split("/"))
        if time_str:
            hh, mm = map(int, time_str.split(":"))
        else:
            hh = mm = 0
        return datetime.datetime(y, m, d, hh, mm, tzinfo=JST).isoformat()
    except Exception:
        return date_str  # フォールバック


# ──────────────────────────────────────────────────────
# AI解析エンジン
# ──────────────────────────────────────────────────────

_ai_client = None

def _get_ai_client():
    global _ai_client
    if _ai_client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            print("[ERROR] 環境変数 ANTHROPIC_API_KEY が設定されていません", file=sys.stderr)
            sys.exit(1)
        _ai_client = anthropic.Anthropic(api_key=api_key)
    return _ai_client


def ai_extract_events(page_text: str, source_name: str, page_url: str, hint: str = "") -> list:
    """
    Claude APIを使い、ページテキストからイベント情報をJSON配列で抽出する。
    返り値: 共通形式の辞書リスト
    """
    now_year = datetime.datetime.now(JST).year

    prompt = f"""あなたはトライアスロン練習会・大会のスケジュール情報を抽出する専門家です。

【ページ情報】
URL: {page_url}
ソース名: {source_name}
補足: {hint}
現在の年: {now_year}年

【タスク】
以下のページテキストから、イベント・練習会・大会の情報をすべて抽出し、
JSON配列として返してください。

各要素のフィールド:
- "title": イベント名・練習会名（文字列）
- "date": 開催日 YYYY/MM/DD 形式（不明なら ""）
- "time": 開始時刻 HH:MM 形式（不明なら ""）
- "weekday": 曜日（月/火/水/木/金/土/日 のいずれか、不明なら ""）
- "place": 開催場所（不明なら ""）
- "url": イベント固有URL（なければページURLをそのまま使う）

【ルール】
- 年が書かれていない日付は {now_year}年と解釈する（ただし現在より3ヶ月以上前の日付になる場合は{now_year+1}年）
- 記事一覧ページの場合は各記事を1件として扱う
- イベントが見つからない場合は [] を返す
- JSONのみ返す（説明文・コードブロック記号は不要）

【ページテキスト】
{page_text[:10000]}
"""

    try:
        client = _get_ai_client()
        msg = client.messages.create(
            model=AI_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # コードブロックが含まれていても対応
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
        items = json.loads(raw)
    except Exception as e:
        print(f"[WARNING] AI解析エラー ({source_name}): {e}", file=sys.stderr)
        return []

    events = []
    for item in items:
        date_str = item.get("date", "")
        time_str = item.get("time", "")
        title    = item.get("title", "").strip()
        if not title or not date_str:
            continue
        # 曜日を補完
        weekday = item.get("weekday", "")
        if not weekday and date_str:
            try:
                y, m, d = map(int, date_str.split("/"))
                weekday = ["月","火","水","木","金","土","日"][datetime.date(y,m,d).weekday()]
            except Exception:
                pass

        events.append({
            "title":    title,
            "date":     date_str,
            "time":     time_str,
            "weekday":  weekday,
            "place":    item.get("place", "") or "詳細はリンク先を確認",
            "url":      item.get("url", "") or page_url,
            "source":   source_name,
            "accepted": 0,
            "limit":    0,
            "sort_key": _make_sort_key(date_str, time_str),
        })

    return events


def fetch_ai_site_events(target: dict) -> list:
    """HTML取得 → テキスト化 → AI解析 の一連の流れ"""
    name = target["name"]
    url  = target["url"]
    hint = target.get("hint", "")
    try:
        html = _fetch_html(url)
    except Exception as e:
        print(f"[WARNING] {name} 取得エラー: {e}", file=sys.stderr)
        return []
    text = _html_to_text(html)
    events = ai_extract_events(text, name, url, hint)
    print(f"  {name}: {len(events)}件取得")
    return events


# ──────────────────────────────────────────────────────
# ① connpass（APIなのでAI不要）
# ──────────────────────────────────────────────────────

def fetch_connpass_events(keyword: str, count: int = 20) -> list:
    base_url = "https://connpass.com/api/v1/event/"
    params   = urllib.parse.urlencode({"keyword": keyword, "count": count, "order": 2})
    try:
        req = urllib.request.Request(f"{base_url}?{params}", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8")).get("events", [])
    except Exception as e:
        print(f"[WARNING] connpass取得エラー ({keyword}): {e}", file=sys.stderr)
        return []


def parse_connpass_event(ev: dict) -> dict:
    started_at = ev.get("started_at", "")
    try:
        dt      = datetime.datetime.fromisoformat(started_at.replace("Z","+00:00")).astimezone(JST)
        date_str = dt.strftime("%Y/%m/%d")
        time_str = dt.strftime("%H:%M")
        weekday  = ["月","火","水","木","金","土","日"][dt.weekday()]
        sort_key = dt.isoformat()
    except Exception:
        date_str = started_at[:10] if started_at else "未定"
        time_str = weekday = ""
        sort_key = started_at
    return {
        "title":    ev.get("title",""),
        "date":     date_str,
        "time":     time_str,
        "weekday":  weekday,
        "place":    ev.get("place") or ev.get("address") or "オンライン/未定",
        "url":      ev.get("event_url","#"),
        "source":   "connpass",
        "accepted": ev.get("accepted", 0),
        "limit":    ev.get("limit", 0),
        "sort_key": sort_key,
    }


# ──────────────────────────────────────────────────────
# 全ソース集約
# ──────────────────────────────────────────────────────

def fetch_all_events() -> tuple:
    all_events = []
    seen_urls  = set()

    def add(evs):
        for ev in evs:
            if ev["url"] not in seen_urls:
                seen_urls.add(ev["url"])
                all_events.append(ev)

    # connpass
    print("connpassからイベントを取得中...")
    for kw in CONNPASS_KEYWORDS:
        print(f"  キーワード: {kw}")
        add([parse_connpass_event(e) for e in fetch_connpass_events(kw, CONNPASS_COUNT)])

    # AI解析サイト
    for target in AI_SCRAPE_TARGETS:
        print(f"{target['name']}からイベントを取得中（AI解析）...")
        add(fetch_ai_site_events(target))

    all_events.sort(key=lambda e: e["sort_key"])
    now      = datetime.datetime.now(JST)
    upcoming = [e for e in all_events if e["sort_key"] >= now.isoformat()]
    past     = [e for e in all_events if e["sort_key"] <  now.isoformat()]

    print(f"\n取得完了: 今後 {len(upcoming)}件 / 過去 {len(past)}件")
    return upcoming, past


# ──────────────────────────────────────────────────────
# HTML生成
# ──────────────────────────────────────────────────────

SOURCE_STYLES = {
    "connpass":    ("#dbeafe", "#1d4ed8", "connpass"),
    "エンドウ練習会": ("#fef9c3", "#854d0e", "エンドウ"),
    "LUMINA":      ("#fce7f3", "#9d174d", "LUMINA"),
}


def render_event_card(ev: dict) -> str:
    title = html_module.escape(ev["title"])
    place = html_module.escape(ev["place"])
    bg, fg, label = SOURCE_STYLES.get(ev["source"], ("#f1f5f9","#334155", ev["source"]))
    source_badge  = f'<span class="badge" style="background:{bg};color:{fg}">{label}</span>'

    capacity_html = ""
    if ev.get("limit") and ev["limit"] > 0:
        pct   = min(100, int(ev["accepted"] / ev["limit"] * 100))
        color = "#ef4444" if pct >= 80 else "#f59e0b" if pct >= 50 else "#22c55e"
        full  = " 満員" if pct >= 100 else ""
        capacity_html = f"""
        <div class="capacity">
          <div class="capacity-bar"><div class="capacity-fill" style="width:{pct}%;background:{color}"></div></div>
          <span class="capacity-text">{ev['accepted']}/{ev['limit']}人{full}</span>
        </div>"""

    return f"""
    <a class="card" href="{html_module.escape(ev['url'])}" target="_blank" rel="noopener">
      <div class="card-header">
        <div class="date-badge">
          <span class="date-main">{ev['date']}</span>
          {f'<span class="weekday">({ev["weekday"]})</span>' if ev["weekday"] else ""}
          {f'<span class="time">{ev["time"]}〜</span>'       if ev["time"]    else ""}
        </div>
        {source_badge}
      </div>
      <div class="card-body">
        <h3 class="event-title">{title}</h3>
        <p class="event-place">📍 {place}</p>
        {capacity_html}
      </div>
    </a>"""


def generate_html(upcoming: list, past: list) -> str:
    now_str = datetime.datetime.now(JST).strftime("%Y年%m月%d日 %H:%M JST")
    up_cards   = "\n".join(render_event_card(e) for e in upcoming) \
                 if upcoming else '<p class="empty">現在、今後の練習会情報はありません。</p>'
    past_cards = "\n".join(render_event_card(e) for e in reversed(past[-12:])) \
                 if past    else '<p class="empty">過去のイベントはありません。</p>'

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏊🚴🏃 トライアスロン練習会スケジュール</title>
<style>
  :root{{--primary:#0ea5e9;--primary-dark:#0284c7;--bg:#f0f9ff;--card-bg:#fff;--text:#1e293b;--text-muted:#64748b;--border:#e2e8f0;--shadow:0 2px 8px rgba(0,0,0,.08)}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;background:var(--bg);color:var(--text)}}
  header{{background:linear-gradient(135deg,#0284c7,#0ea5e9,#38bdf8);color:#fff;padding:2.5rem 1.5rem 2rem;text-align:center;box-shadow:0 4px 12px rgba(14,165,233,.3)}}
  header h1{{font-size:1.8rem;font-weight:800}}
  header p{{margin-top:.5rem;font-size:.9rem;opacity:.85}}
  .stats{{display:flex;gap:1rem;justify-content:center;margin-top:1.2rem;flex-wrap:wrap}}
  .stat-chip{{background:rgba(255,255,255,.2);padding:.3rem .9rem;border-radius:999px;font-size:.85rem;font-weight:600}}
  main{{max-width:960px;margin:2rem auto;padding:0 1rem}}
  .section-title{{font-size:1.15rem;font-weight:700;color:var(--primary-dark);margin:2rem 0 1rem;padding-bottom:.4rem;border-bottom:2px solid var(--primary);display:flex;align-items:center;gap:.5rem}}
  .cards-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}}
  .card{{background:var(--card-bg);border-radius:12px;padding:1.1rem 1.2rem;box-shadow:var(--shadow);border:1px solid var(--border);text-decoration:none;color:inherit;display:block;transition:transform .15s,box-shadow .15s}}
  .card:hover{{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.12);border-color:var(--primary)}}
  .card-header{{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem}}
  .date-badge{{display:flex;flex-direction:column;gap:.1rem}}
  .date-main{{font-size:1rem;font-weight:700;color:var(--primary-dark)}}
  .weekday,.time{{font-size:.8rem;color:var(--text-muted)}}
  .time{{font-weight:600}}
  .badge{{font-size:.7rem;padding:.2rem .55rem;border-radius:999px;font-weight:700;white-space:nowrap}}
  .event-title{{font-size:.95rem;font-weight:700;line-height:1.4;margin-bottom:.5rem}}
  .event-place{{font-size:.82rem;color:var(--text-muted)}}
  .capacity{{margin-top:.6rem;display:flex;align-items:center;gap:.5rem}}
  .capacity-bar{{flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden}}
  .capacity-fill{{height:100%;border-radius:3px}}
  .capacity-text{{font-size:.75rem;color:var(--text-muted);white-space:nowrap}}
  .past-section{{opacity:.7}}
  .empty{{color:var(--text-muted);text-align:center;padding:2rem;font-size:.95rem}}
  footer{{text-align:center;padding:2rem;font-size:.8rem;color:var(--text-muted);border-top:1px solid var(--border);margin-top:3rem}}
  @media(max-width:480px){{header h1{{font-size:1.4rem}}.cards-grid{{grid-template-columns:1fr}}}}
</style>
</head>
<body>
<header>
  <h1>🏊 🚴 🏃 トライアスロン練習会</h1>
  <p>connpass / サイクルショップエンドウ / Triathlon LUMINA から自動取得（AI解析）</p>
  <div class="stats">
    <span class="stat-chip">今後の予定: {len(upcoming)}件</span>
    <span class="stat-chip">更新: {now_str}</span>
  </div>
</header>
<main>
  <h2 class="section-title">📅 今後の練習会・イベント</h2>
  <div class="cards-grid">{up_cards}</div>
  <h2 class="section-title past-section">📁 過去のイベント（直近12件）</h2>
  <div class="cards-grid past-section">{past_cards}</div>
</main>
<footer>
  <p>
    データソース:
    <a href="https://connpass.com" target="_blank" rel="noopener" style="color:var(--primary)">connpass</a> /
    <a href="https://cycleshopendo.com/shop/post-25594.html" target="_blank" rel="noopener" style="color:var(--primary)">サイクルショップエンドウ</a> /
    <a href="https://triathlon-lumina.com/category/item/entry/" target="_blank" rel="noopener" style="color:var(--primary)">Triathlon LUMINA</a>
  </p>
  <p style="margin-top:.3rem">GitHub Actions により毎日自動更新（Claude AI解析）</p>
</footer>
</body>
</html>"""


# ──────────────────────────────────────────────────────
# エントリーポイント
# ──────────────────────────────────────────────────────

def main():
    upcoming, past = fetch_all_events()
    html_content   = generate_html(upcoming, past)
    output_path    = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUTPUT_FILE)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"\n✅ HTMLファイルを生成しました: {output_path}")


if __name__ == "__main__":
    main()
