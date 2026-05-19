// =============================
// 設定（ここだけ変更してください）
// =============================
const SPREADSHEET_ID = '1KQ6SzXqRaTp4xxpNEXagvoRAeVTwIAvj1TNyrf3t0Dc';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Google AI Studio で取得
const NOTIFICATION_EMAIL = 'your@gmail.com';  // 通知先メールアドレス

// =============================
// 定数
// =============================
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// スプレッドシートの列インデックス（0始まり）
const COL = {
  TIMESTAMP: 0,
  QUESTION:  3,  // 誤植･質問内容
  SUBJECT:   4,  // 対象科目
  TYPE:      6,  // 誤植/質問
  HANDLED:   7,  // 対応✓
  MEMO:      9,  // メモ（回答の根拠）
};

// =============================
// エントリーポイント
// =============================
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('じゃぱそん FAQ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// フロントエンドから呼ばれる
function processMessage(userMessage) {
  try {
    const faqData = loadFAQ();
    const result  = askGemini(userMessage, faqData);

    if (result.isNew) {
      addRowToSheet(userMessage, result.subject);
      sendNotification(userMessage);
    }

    return { ok: true, answer: result.answer, isNew: result.isNew };
  } catch (e) {
    console.error(e);
    return { ok: false, answer: 'エラーが発生しました。しばらくしてから再試行してください。' };
  }
}

// =============================
// スプレッドシート読み込み
// =============================
function loadFAQ() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const rows  = sheet.getDataRange().getValues();
  const faqs  = [];

  for (let i = 1; i < rows.length; i++) {
    const row      = rows[i];
    const question = String(row[COL.QUESTION] || '').trim();
    if (!question) continue;

    faqs.push({
      question: question,
      subject:  String(row[COL.SUBJECT]  || ''),
      memo:     String(row[COL.MEMO]     || ''),
      handled:  String(row[COL.HANDLED]  || ''),
    });
  }
  return faqs;
}

// =============================
// Gemini 呼び出し
// =============================
function askGemini(userMessage, faqs) {
  const context = faqs.map((f, i) => {
    const ans = f.memo    ? `対応メモ: ${f.memo}`
              : f.handled ? '（対応済み・詳細メモなし）'
              :             '（対応中）';
    return `[${i + 1}] 科目:${f.subject || '不明'}\n質問: ${f.question}\n${ans}`;
  }).join('\n\n');

  const prompt = `あなたはMOS試験問題集「じゃぱそん」の公式FAQチャットボットです。
書籍の誤植・操作手順の質問・ファイルのダウンロードに関する問い合わせに対応します。

## 過去の問い合わせ履歴（回答の根拠として使用）
${context}

## 回答ルール
- 過去の履歴に類似の問い合わせがあれば、対応メモをもとに丁寧に回答する
- 類似の問い合わせが見当たらない新しい内容の場合は、担当者に転送する旨を伝える
- 回答は日本語で、簡潔かつ親切に
- 必ず以下のJSON形式のみで返すこと（他のテキストは一切不要）

{"answer":"回答文","isNew":true or false,"subject":"対象科目（不明なら空文字）"}

## ユーザーの質問
${userMessage}`;

  const res = UrlFetchApp.fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
    muteHttpExceptions: true,
  });

  const body = JSON.parse(res.getContentText());
  if (!body.candidates) throw new Error('Gemini応答なし: ' + res.getContentText());

  const raw   = body.candidates[0].content.parts[0].text;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { answer: raw.trim(), isNew: false, subject: '' };

  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return { answer: raw.trim(), isNew: false, subject: '' };
  }
}

// =============================
// 新規行追加
// =============================
function addRowToSheet(question, subject) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  sheet.appendRow([
    new Date(),           // タイムスタンプ
    '',                   // メールアドレス
    '',                   // 問題番号
    question,             // 誤植･質問内容
    subject || '',        // 対象科目
    '',                   // メールアドレス2
    '質問',               // 誤植/質問
    '',                   // 対応
    '',                   // 御礼
    'チャットボット経由', // メモ
    '',                   // Enへの反映
  ]);
}

// =============================
// メール通知
// =============================
function sendNotification(question) {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
  MailApp.sendEmail(
    NOTIFICATION_EMAIL,
    '【FAQBot】新しい問い合わせが届きました',
    `チャットボットに未対応の新規問い合わせが届き、スプレッドシートに追記しました。\n\n` +
    `■ 質問内容\n${question}\n\n` +
    `■ スプレッドシート\n${sheetUrl}`
  );
}
