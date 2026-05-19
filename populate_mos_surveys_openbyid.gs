/**
 * MOSアンケート 7個に質問を一括注入するスクリプト（openById版）
 *
 * 【使い方】
 * 1. https://script.google.com/ で新規プロジェクト作成
 * 2. このコード全部を Code.gs に貼り付け
 * 3. 上部メニューから populateAllSurveys を選択して「実行」
 * 4. 認証ダイアログ：FormAppスコープのみ要求（軽い）
 * 5. 実行ログに7個のフォームURL出力
 *
 * 【設計方針】
 * - FormApp.create() は使わない → drive.file スコープ要求を回避
 * - 既に作成済みのブランクフォーム7個を openById() で開いて編集するだけ
 * - 「今朝動いたコード」と同じパターン:setCollectEmail, setChoices(createChoice), etc.
 */

const SURVEYS = [
  {
    formId: '1JI2EwMHJgiT5QN0WdgbC19BNEk9kBxyZziY7RSnW7yc',
    title: 'MOS Excel365 YouTube演習ファイル配布前アンケート',
    description: '以下のアンケートにご協力ください。\nパソコンから回答いただくと、演習ファイルのダウンロードがスムーズです。\n正確な回答をお願いします。明らかにいい加減な回答の場合、演習ファイルの送付をお断りさせていただきます。',
    confirmation: 'ご協力ありがとうございました!ご入力いただいたメールアドレス宛に、演習ファイルのダウンロードURLをお送りします。',
    items: [
      { type: 'mc', title: 'メルマガ購読チェックは入っていますか?', required: true,
        choices: ['はい、確認しました'] },
      { type: 'mc', title: '「MOS Excel365の全範囲を91問、94分でマスターする」YouTube動画を何で知りましたか?', required: true,
        choices: ['YouTube内で検索', 'YouTubeのオススメに出てきた', 'じゃぱそんのSEO記事から飛んできた', 'Udemyで紹介された', '知人からの紹介', 'その他'] },
      { type: 'mc', title: 'MOSExcelを受験することは確定していますか?', required: true,
        choices: ['はい、受験は確定です', 'まだ迷っています'] },
      { type: 'mc', title: '受験確定の方に質問です。受験日は決まっていますか?', required: false,
        choices: ['決まっている', '未定'] },
      { type: 'mc', title: 'MOS365Excelの学習は・・', required: true,
        choices: ['これから', 'もう始めていて途中', 'もうすぐ試験'] },
      { type: 'mc', title: '近いものを選択してください（学習スタンス）', required: true,
        choices: ['多少お金をかけてでも、効率的に学んで、確実に合格したい', '落ちたり、時間がかかってもいいから、とにかくお金をかけずに合格したい'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        choices: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSExcel一般レベルに、3週間以内に900点以上で一発合格できるとしたら、いくらの価値がありますか?', required: true,
        choices: ['20万円以上', '~3万円', '~1万円', '3000円', '1円の価値もない'] },
      { type: 'mc', title: '受験本番の前に、模擬試験を受ける必要があると感じていますか?', required: true,
        choices: ['はい', 'いいえ'] },
      { type: 'cb', title: '既に買った教材があれば教えてください（複数選択可）', required: false,
        choices: ['FOM出版の対策テキスト', '日経BP', '西尾パソコン教室', 'Excel兄さん'], otherOption: true },
      { type: 'long', title: 'なぜその教材を買いましたか?', required: false },
      { type: 'long', title: '動画「MOSエクセルに興味がある?」を見た感想を教えてください', required: true },
      { type: 'long', title: '最後に一言、MOS合格に向けて意気込みをお願いします!', required: true },
    ]
  },
  {
    formId: '10d1g5s7fPd1jhZULs_aPUv6nfKVAobi-dtcbO2s8gLY',
    title: 'MOS Excel365 模擬試験配布前アンケート',
    description: '模擬試験を受け取るには、以下のアンケートに回答ください。\n（なるべく詳細に回答ください。いい加減な回答があった場合は、模擬試験の送付をお断りさせていただく場合があります）',
    confirmation: 'ご協力ありがとうございました!模擬試験のダウンロードURLをメールでお送りします。',
    items: [
      { type: 'mc', title: 'メルマガ登録(必須)にチェックを入れましたか?', required: true,
        choices: ['はい、チェックしました'] },
      { type: 'mc', title: 'どこから来ましたか?', required: true,
        choices: ['Kindle', 'Udemy講座', 'Teachable講座'] },
      { type: 'mc', title: '性別', required: true,
        choices: ['女性', '男性', '回答しない'] },
      { type: 'mc', title: '年齢', required: true,
        choices: ['10代', '20代', '30代', '40代', '50代', '60代', '~90代'] },
      { type: 'mc', title: '現在の状況（近いものを選択ください）', required: true,
        choices: ['学生', '社会人', '専業主婦', 'フリーター', '定年退職済み'] },
      { type: 'mc', title: 'じゃぱそんを知ったきっかけ', required: true,
        choices: ['SEO記事（ネット検索）', 'YouTube', 'Kindle', 'Udemy'] },
      { type: 'cb', title: 'MOSを知ったきっかけ（複数選択可）', required: true,
        choices: ['知り合いにオススメされた', '資格を探していた', '職場で取得を促された', 'ネットなどでたまたま目にした'] },
      { type: 'long', title: 'MOSを知ったきっかけについて詳しく教えてください（任意）', required: false },
    ]
  },
  {
    formId: '1mxzOkCiaEknMhrj2pmxYxXp6IpDPFmCgQZZQ5n_ywmA',
    title: 'MOS Excelエキスパート YouTube演習ファイル配布前アンケート（購入者専用）',
    description: '演習ファイルを受け取るには、アンケートに回答ください。（入力いただいたメールアドレス宛に、ダウンロードページのリンクをお送りします）',
    confirmation: 'ご協力ありがとうございました!演習ファイルのダウンロードURLをメールでお送りします。',
    items: [
      { type: 'mc', title: '「メルマガ登録」にチェックがついているか確認しましたか?', required: true,
        choices: ['はい、チェックしました'] },
      { type: 'mc', title: '「MOS Excel365エキスパートの全範囲を79問、84分でマスターする」YouTube動画を何で知りましたか?', required: true,
        choices: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '一般レベルをじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '一般レベルは合格済みですか?', required: false,
        choices: ['はい', 'いいえ'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        choices: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSExcelエキスパートレベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        choices: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円', '100円', '0円'] },
      { type: 'cb', title: '演習ファイルを購入した理由として、当てはまるものをすべて選択してください', required: true,
        choices: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '値段が安かった', '自分が望んでいたものに一番近いと感じた'], otherOption: true },
      { type: 'long', title: '購入した理由について詳しく教えてください', required: true },
      { type: 'mc', title: '受験本番の前に、模擬試験を受ける必要があると感じていますか?', required: true,
        choices: ['はい', 'いいえ'] },
      { type: 'long', title: '動画「MOS Excel365エキスパート(Expert)の難易度を例題付きで解説」を視た感想を教えてください', required: true },
    ]
  },
  {
    formId: '14NA95SgloC9SL5rWfrz3dr134pb1KEvDPU_wv0df_p4',
    title: 'MOS Excelエキスパート YouTube演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、以下のアンケートに回答ください。',
    confirmation: 'ご協力ありがとうございました!演習ファイルのダウンロードURLをメールでお送りします。',
    items: [
      { type: 'mc', title: '登録メールアドレス宛に演習ファイルをお送りします。確認しましたか?', required: true,
        choices: ['はい、確認しました'] },
      { type: 'mc', title: '「MOS Excel365エキスパートの全範囲を79問、84分でマスターする」YouTube動画を何で知りましたか?', required: true,
        choices: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '一般レベルをじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '一般レベルは合格済みですか?', required: false,
        choices: ['はい', 'いいえ'] },
      { type: 'mc', title: 'MOS365Excelエキスパートの学習は・・', required: true,
        choices: ['これから', 'もう始めていて途中', 'もうすぐ試験'] },
      { type: 'mc', title: '近いものを選択してください（学習スタンス）', required: true,
        choices: ['多少お金をかけてでも、効率的に学んで、確実に合格したい', '落ちたり、時間がかかってもいいから、とにかくお金をかけずに合格したい'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        choices: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSExcelエキスパートレベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        choices: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円', '100円', '0円'] },
      { type: 'mc', title: '不合格になった場合、受講料がタダになる講座に興味はありますか?', required: true,
        choices: ['ある', 'わからない'] },
      { type: 'mc', title: '受験本番の前に、模擬試験を受ける必要があると感じていますか?', required: true,
        choices: ['はい', 'いいえ'] },
      { type: 'long', title: '最後に一言、エキスパート合格に向けて意気込みをお願いします!', required: true },
    ]
  },
  {
    formId: '15ct3NrHGBeRDwTbiO-cVvTxbzrd-vM45otyhm6mKYo8',
    title: 'MOS Word365 YouTube演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、アンケートに回答ください。（入力いただいたメールアドレス宛に、ダウンロードページのリンクをお送りします）',
    confirmation: 'ご協力ありがとうございました!演習ファイルのダウンロードURLをメールでお送りします。',
    items: [
      { type: 'mc', title: '「メルマガ登録」にチェックがついているか確認しましたか?', required: true,
        choices: ['はい、チェックしました'] },
      { type: 'mc', title: '「MOSはExcelよりもWordを受けるべき?」YouTube動画を何で知りましたか?', required: true,
        choices: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '他の科目をじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        choices: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSWord一般レベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        choices: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円'] },
      { type: 'cb', title: '演習ファイルを購入した理由として、当てはまるものをすべて選択してください', required: true,
        choices: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '値段が安かった', '自分が望んでいたものに一番近いと感じた'], otherOption: true },
      { type: 'long', title: '購入した理由について詳しく教えてください', required: true },
      { type: 'long', title: '動画「MOSはExcelよりもWordを受けるべき?」を視た感想を教えてください', required: true },
    ]
  },
  {
    formId: '1mBTA0-fRKa0t8qV54d3tfadmDS4dBFDqKff1i6JHess',
    title: 'MOS Wordエキスパート YouTube演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、アンケートに回答ください。',
    confirmation: 'ご協力ありがとうございました!演習ファイルのダウンロードURLをメールでお送りします。',
    items: [
      { type: 'mc', title: '「メルマガ登録」にチェックがついているか確認しましたか?', required: true,
        choices: ['はい、チェックしました'] },
      { type: 'mc', title: '「MOSWordエキスパートは、一般レベルより簡単です」YouTube動画を何で知りましたか?', required: true,
        choices: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '他の科目をじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        choices: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSWordエキスパートレベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        choices: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円'] },
      { type: 'cb', title: '演習ファイルを購入した理由として、当てはまるものをすべて選択してください', required: true,
        choices: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '値段が安かった', '自分が望んでいたものに一番近いと感じた'], otherOption: true },
      { type: 'long', title: '購入した理由について詳しく教えてください', required: true },
      { type: 'long', title: '動画「MOSWordエキスパートは、一般レベルより簡単です」を視た感想を教えてください', required: true },
    ]
  },
  {
    formId: '1gYW-OZoQYOqXVz-dbIOX2Et6MHIDYlBdRrhQPxt27b0',
    title: 'MOS PowerPoint365 演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、以下のアンケートに回答ください。',
    confirmation: 'ご協力ありがとうございました!演習ファイルのダウンロードURLをメールでお送りします。',
    items: [
      { type: 'cb', title: '以下を一読の上、すべてにチェックをつけてください', required: true,
        choices: [
          'MOS PowerPointの試験に申込済みです',
          '60日以内に合否報告が必要であることを理解しました',
          '合否報告時に、任意の金額を支援できることを理解しました',
          '60日以内に合否報告がない場合、演習ファイルの制作・提供費として3,300円（税込）を支払う必要があることを理解しました'
        ] },
      { type: 'mc', title: '「MOS PowerPoint 365の全範囲を55問でマスターする講座」YouTube動画を何で知りましたか?', required: true,
        choices: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '他の科目をじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: 'MOSパワーポイントに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        choices: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円'] },
      { type: 'cb', title: '演習ファイルを受け取る理由として、当てはまるものをすべて選択してください', required: true,
        choices: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '無料で試せるから', '自分が望んでいたものに一番近いと感じた'] },
      { type: 'long', title: '理由について詳しく教えてください', required: true },
      { type: 'long', title: '動画「MOS PowerPointが一番意味ないです。概要と勉強法」を視た感想を教えてください', required: true },
    ]
  },
];

/**
 * メイン関数：すべてのフォームに質問を注入
 */
function populateAllSurveys() {
  const results = [];
  for (const survey of SURVEYS) {
    try {
      const url = populateOneSurvey(survey);
      results.push({ title: survey.title, ...url });
      Logger.log('✅ ' + survey.title);
    } catch (e) {
      Logger.log('❌ ' + survey.title + ' / ' + e.message);
      results.push({ title: survey.title, error: e.message });
    }
  }
  Logger.log('\n========== 完了 ==========');
  results.forEach((r, i) => {
    Logger.log(`\n[${i + 1}] ${r.title}`);
    if (r.error) Logger.log('  ERROR: ' + r.error);
    else {
      Logger.log('  公開URL: ' + r.publishedUrl);
      Logger.log('  編集URL: ' + r.editUrl);
    }
  });
}

/**
 * 1個のフォームに質問を注入
 */
function populateOneSurvey(survey) {
  const form = FormApp.openById(survey.formId);

  // 基本設定（今朝動いたパターンに準拠）
  form.setTitle(survey.title);
  form.setDescription(survey.description);
  form.setCollectEmail(true);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(survey.confirmation);

  // 質問追加
  for (const item of survey.items) {
    addItem(form, item);
  }

  return {
    publishedUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}

/**
 * 質問追加ヘルパー
 */
function addItem(form, item) {
  let q;
  switch (item.type) {
    case 'short':
      q = form.addTextItem();
      q.setTitle(item.title);
      break;
    case 'long':
      q = form.addParagraphTextItem();
      q.setTitle(item.title);
      break;
    case 'mc':
      q = form.addMultipleChoiceItem();
      q.setTitle(item.title);
      const mcChoices = item.choices.map(c => q.createChoice(c));
      q.setChoices(mcChoices);
      if (item.otherOption) q.showOtherOption(true);
      break;
    case 'cb':
      q = form.addCheckboxItem();
      q.setTitle(item.title);
      const cbChoices = item.choices.map(c => q.createChoice(c));
      q.setChoices(cbChoices);
      if (item.otherOption) q.showOtherOption(true);
      break;
  }
  q.setRequired(item.required === true);
}

/**
 * テスト用：1個目だけ実行
 */
function populateFirstOnly() {
  const result = populateOneSurvey(SURVEYS[0]);
  Logger.log('Title: ' + SURVEYS[0].title);
  Logger.log('Published URL: ' + result.publishedUrl);
  Logger.log('Edit URL: ' + result.editUrl);
}

/**
 * リトライ用：前回失敗したフォーム2〜6だけ実行（インデックス1〜5）
 * フォーム1と7は既に質問が入っているため除外する
 */
function populateFailedOnes() {
  const indices = [1, 2, 3, 4, 5]; // 0-indexed なので #2〜#6
  const results = [];
  for (const i of indices) {
    const survey = SURVEYS[i];
    try {
      const url = populateOneSurvey(survey);
      results.push({ title: survey.title, ...url });
      Logger.log('✅ ' + survey.title);
    } catch (e) {
      Logger.log('❌ ' + survey.title + ' / ' + e.message);
      results.push({ title: survey.title, error: e.message });
    }
  }
  Logger.log('\n========== リトライ完了 ==========');
  results.forEach((r, idx) => {
    Logger.log(`\n[${indices[idx] + 1}] ${r.title}`);
    if (r.error) Logger.log('  ERROR: ' + r.error);
    else {
      Logger.log('  公開URL: ' + r.publishedUrl);
      Logger.log('  編集URL: ' + r.editUrl);
    }
  });
}
