---
name: triathlon-update
description: >
  トライアスロン練習会スケジュールを更新する。「スケジュール更新して」「トライアスロン更新」「練習会の情報取ってきて」「イベント更新」など、トライアスロンのスケジュール・練習会・イベント情報の更新を求めるキーワードが出たら必ずこのスキルを使う。サイクルショップエンドウ・Triathlon LUMINA・横浜市トライアスロン協会の3サイトからChrome経由で直接ページを取得（高精度）し、差分マージして triathlon_events.json と schedule.html をワークスペース（C:\git\Triathlon）に保存する。Claude in Chrome 拡張が必要。GitHub への Push は手動で行う。
---

# トライアスロンスケジュール更新スキル

Chrome 経由で3サイトを直接スクレイピングし、イベントを差分マージして
`C:\git\Triathlon`（ワークスペースフォルダ）に保存する。
GitHub への Push は手動で行う。

---

## STEP 1: Chrome タブを確保

`tabs_context_mcp`（createIfEmpty: true）でタブIDを取得する。
取得したタブIDを以降のすべてのステップで使いまわす。

---

## STEP 2: 既存イベントを読み込む

Glob で `**/triathlon_events.json` を検索してワークスペースフォルダ内のパスを特定し、
Read ツールで内容を読み込む。ファイルがなければ `existing_events = []` とする。

---

## STEP 3: 3サイトのページ全文を取得

`navigate` → `get_page_text` の順で各サイトのテキストを取得する。
取得に失敗したサイトはスキップして残りを続ける。

| source 名 | URL |
|---|---|
| エンドウ練習会 | https://cycleshopendo.com/shop/post-25594.html |
| LUMINA | https://triathlon-lumina.com/category/item/entry/ |
| 横浜市TA | https://www.kn-tu.or.jp/yta/news/recruiting-participants |

---

## STEP 4: イベントを抽出

今日の日付を Bash で確認（`date +%Y/%m/%d`）してから、
各サイトのページテキストを読んでイベントを以下フォーマットで抽出する。

```json
{
  "title": "イベント名",
  "date": "YYYY/MM/DD",
  "time": "HH:MM または空文字",
  "weekday": "月火水木金土日のいずれか",
  "place": "開催場所",
  "url": "イベント個別URL（なければそのサイトのURL）",
  "source": "エンドウ練習会 または LUMINA または 横浜市TA",
  "accepted": 0,
  "limit": 0,
  "sort_key": "YYYY-MM-DDTHH:MM:00+09:00"
}
```

**抽出ルール（共通）**
- 年が明記されていない場合は今年と解釈（過去3ヶ月以上前になるなら来年）
- 日付が読み取れないイベントは除外
- 今日以降（未来）のイベントのみ抽出する（過去イベントは取得しない）
- 各ページに複数イベントが列挙されている場合はすべて抽出する

**LUMINAの抽出ルール（重要）**
- **「EVENT Information」セクションのみ**を対象とする（「RACE Information」は取得しない）
- EVENT Informationに含まれる長期プログラム（期間が1ヶ月以上にわたるもの）は除外する
  - 例: 「初回無料体験申込 2025/01/01 - 2030/12/28」「TRIランニング塾 〜2030」など
- 単発イベントまたは数日以内の合宿（3日以内程度）は含める
  - 例: OWS練習会、スイムクリニック、ブリックトレーニング、合宿（2〜3日）など

---

## STEP 5: 差分マージ・HTML 生成（Python）

Bash でPythonスクリプトを実行する。
`new_events`（STEP4）と `existing_events`（STEP2）をインラインで埋め込む。

```python
import json, datetime, html as H, glob as G

JST = datetime.timezone(datetime.timedelta(hours=9))

new_events      = []  # ← STEP4 の全イベントをここに貼る
existing_events = []  # ← STEP2 の既存イベントをここに貼る

# ---------- 差分マージ ----------
def event_key(ev):
    return f"{ev.get('title','').strip()}|{ev.get('date','').strip()}"

def make_sort_key(date_str, time_str):
    try:
        y, m, d = map(int, date_str.replace('-', '/').split('/'))
        hh, mm  = map(int, time_str.split(':')) if time_str else (0, 0)
        return datetime.datetime(y, m, d, hh, mm, tzinfo=JST).isoformat()
    except Exception:
        return date_str

seen   = {event_key(e) for e in existing_events}
merged = list(existing_events)
added  = 0
for ev in new_events:
    if not ev.get('sort_key'):
        ev['sort_key'] = make_sort_key(ev.get('date', ''), ev.get('time', ''))
    k = event_key(ev)
    if k not in seen:
        seen.add(k)
        merged.append(ev)
        added += 1

now_iso = datetime.datetime.now(JST).isoformat()
now_str = datetime.datetime.now(JST).strftime("%Y年%m月%d日 %H:%M JST")
upcoming = sorted([e for e in merged if e.get('sort_key','') >= now_iso], key=lambda e: e['sort_key'])
past     = sorted([e for e in merged if e.get('sort_key','') <  now_iso], key=lambda e: e['sort_key'])

# ---------- HTML 生成 ----------
SOURCE_STYLES = {
    "エンドウ練習会": ("#fef9c3", "#854d0e", "エンドウ"),
    "LUMINA":        ("#fce7f3", "#9d174d", "LUMINA"),
    "横浜市TA":      ("#dcfce7", "#166534", "横浜市TA"),
}

def card(ev):
    bg, fg, lb = SOURCE_STYLES.get(ev.get('source',''), ("#f1f5f9","#334155", ev.get('source','')))
    t  = f'<span class="time">{ev["time"]}〜</span>'   if ev.get("time")    else ""
    wd = f'<span class="weekday">({ev["weekday"]})</span>' if ev.get("weekday") else ""
    return (
        f'<a class="card" href="{H.escape(ev.get("url","#"))}" target="_blank" rel="noopener">'
        f'<div class="card-header">'
        f'<div class="date-badge"><span class="date-main">{ev.get("date","")}</span>{wd}{t}</div>'
        f'<span class="badge" style="background:{bg};color:{fg}">{lb}</span>'
        f'</div>'
        f'<div class="card-body">'
        f'<h3 class="event-title">{H.escape(ev.get("title",""))}</h3>'
        f'<p class="event-place">📍 {H.escape(ev.get("place",""))}</p>'
        f'</div></a>'
    )

up_html = "\n".join(card(e) for e in upcoming)     if upcoming else '<p class="empty">今後の予定はありません</p>'
ps_html = "\n".join(card(e) for e in reversed(past[-12:])) if past     else '<p class="empty">過去のイベントはありません</p>'

CSS = """:root{--primary:#0ea5e9;--primary-dark:#0284c7;--bg:#f0f9ff;--card-bg:#fff;--text:#1e293b;--muted:#64748b;--border:#e2e8f0;--shadow:0 2px 8px rgba(0,0,0,.08)}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;background:var(--bg);color:var(--text)}header{background:linear-gradient(135deg,#0284c7,#0ea5e9,#38bdf8);color:#fff;padding:2.5rem 1.5rem 2rem;text-align:center;box-shadow:0 4px 12px rgba(14,165,233,.3)}header h1{font-size:1.8rem;font-weight:800}header p{margin-top:.5rem;font-size:.9rem;opacity:.85}.stats{display:flex;gap:1rem;justify-content:center;margin-top:1.2rem;flex-wrap:wrap}.stat-chip{background:rgba(255,255,255,.2);padding:.3rem .9rem;border-radius:999px;font-size:.85rem;font-weight:600}main{max-width:960px;margin:2rem auto;padding:0 1rem}.section-title{font-size:1.15rem;font-weight:700;color:var(--primary-dark);margin:2rem 0 1rem;padding-bottom:.4rem;border-bottom:2px solid var(--primary)}.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}.card{background:var(--card-bg);border-radius:12px;padding:1.1rem 1.2rem;box-shadow:var(--shadow);border:1px solid var(--border);text-decoration:none;color:inherit;display:block;transition:transform .15s,box-shadow .15s}.card:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.12);border-color:var(--primary)}.card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem}.date-badge{display:flex;flex-direction:column;gap:.1rem}.date-main{font-size:1rem;font-weight:700;color:var(--primary-dark)}.weekday,.time{font-size:.8rem;color:var(--muted)}.time{font-weight:600}.badge{font-size:.7rem;padding:.2rem .55rem;border-radius:999px;font-weight:700;white-space:nowrap}.event-title{font-size:.95rem;font-weight:700;line-height:1.4;margin-bottom:.5rem}.event-place{font-size:.82rem;color:var(--muted)}.past-section{opacity:.7}.empty{color:var(--muted);text-align:center;padding:2rem}footer{text-align:center;padding:2rem;font-size:.8rem;color:var(--muted);border-top:1px solid var(--border);margin-top:3rem}@media(max-width:480px){header h1{font-size:1.4rem}.cards-grid{grid-template-columns:1fr}}"""

html_content = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>🏊🚴🏃 トライアスロン練習会スケジュール</title>
<style>{CSS}</style>
</head>
<body>
<header>
  <h1>🏊 🚴 🏃 トライアスロン練習会</h1>
  <p>サイクルショップエンドウ / Triathlon LUMINA / 横浜市トライアスロン協会</p>
  <div class="stats">
    <span class="stat-chip">今後の予定: {len(upcoming)}件</span>
    <span class="stat-chip">更新: {now_str}</span>
  </div>
</header>
<main>
  <h2 class="section-title">📅 今後の練習会・イベント</h2>
  <div class="cards-grid">{up_html}</div>
  <h2 class="section-title past-section">📁 過去のイベント（直近12件）</h2>
  <div class="cards-grid past-section">{ps_html}</div>
</main>
<footer>
  <p>
    データソース:
    <a href="https://cycleshopendo.com/shop/post-25594.html" style="color:var(--primary)">エンドウ</a> /
    <a href="https://triathlon-lumina.com/category/item/entry/" style="color:var(--primary)">LUMINA</a> /
    <a href="https://www.kn-tu.or.jp/yta/news/recruiting-participants" style="color:var(--primary)">横浜市TA</a>
  </p>
  <p style="margin-top:.3rem">
    Claude スキルにより手動更新 |
    <a href="https://github.com/japason0502/Triathlon" style="color:var(--primary)">GitHub</a>
  </p>
</footer>
</body>
</html>"""

# ワークスペースフォルダ（C:\git\Triathlon のマウント先）に保存
mnt_dirs = G.glob('/sessions/*/mnt')
out_dir  = mnt_dirs[0] if mnt_dirs else '.'
with open(f'{out_dir}/schedule.html', 'w', encoding='utf-8') as f:
    f.write(html_content)
with open(f'{out_dir}/triathlon_events.json', 'w', encoding='utf-8') as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)

print(f"✅ 追加: {added}件 / 今後: {len(upcoming)}件 / 過去: {len(past)}件")
print(f"✅ 保存先: {out_dir}")
print(f"MERGED_JSON_LEN:{len(merged)}")
```

---


## STEP 6: 完了報告

以下をまとめて報告する:

- 各サイトから取得したイベント数
- 新規追加件数・今後 / 過去イベント件数
- 保存ファイル: `triathlon_events.json` と `schedule.html`（Triathlonフォルダ内）
- GitHub Pages: https://japason0502.github.io/Triathlon/ へのPushは手動で行うよう案内する

**エラー時の方針**
- サイト取得失敗 → スキップして残りを続ける

