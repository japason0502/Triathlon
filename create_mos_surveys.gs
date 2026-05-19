/**
 * MOS関連アンケート 7個を一括でGoogleフォーム化するApps Script
 *
 * 【使い方】
 * 1. https://script.google.com にアクセス → 新規プロジェクト作成
 * 2. このコード全部を貼り付け
 * 3. 「createAllSurveys」関数を選択して実行
 * 4. 初回はGoogle認証ダイアログが出るので承認
 * 5. 実行ログ（表示 → ログ）に7つのフォームURLが出力される
 * 6. 回答は全て指定スプシ（DEST_SHEET_ID）に新規シートとして自動連結
 *
 * 【元データ】
 * MailChimp Survey 7件（list-manage.com/survey?id=...）からの移植
 */

// 回答収集先スプシ（MOSExcel-Kindle購入者アンケート（回答））
const DEST_SHEET_ID = '11xyOsJQUQYX9Bg1JwjUU5vxjhKpdhgxWrqkxpr_KN0Y';

// フォーム定義
const SURVEYS = [
  // ========== #1: Excel YouTube演習ファイル受取前 ==========
  {
    title: 'MOS Excel365 YouTube演習ファイル配布前アンケート',
    description: '以下のアンケートにご協力ください。\n\nパソコンから回答いただくと、演習ファイルのダウンロードがスムーズです。\n\n正確な回答をお願いします。明らかにいい加減な回答の場合、演習ファイルの送付をお断りさせていただきます。',
    items: [
      { type: 'email', title: 'メールアドレス', required: true, helpText: 'メルマガ購読のチェックボックスも忘れずにチェックください。' },
      { type: 'mc', title: '「メルマガ購読」にチェックが入っているかをご確認ください', required: true, options: ['はい、確認しました'] },
      { type: 'mc', title: '「MOS Excel365の全範囲を91問、94分でマスターする」YouTube動画を何で知りましたか?', required: true,
        options: ['YouTube内で検索', 'YouTubeのオススメに出てきた', 'じゃぱそんのSEO記事から飛んできた', 'Udemyで紹介された', '知人からの紹介', 'その他'] },
      { type: 'mc', title: 'MOSExcelを受験することは確定していますか?', required: true, options: ['はい、受験は確定です', 'まだ迷っています'] },
      { type: 'mc', title: '受験確定の方に質問です。受験日は決まっていますか?', required: false, options: ['決まっている', '未定'] },
      { type: 'mc', title: 'MOS365Excelの学習は・・', required: true, options: ['これから', 'もう始めていて途中', 'もうすぐ試験'] },
      { type: 'mc', title: '近いものを選択してください（学習スタンス）', required: true,
        options: ['多少お金をかけてでも、効率的に学んで、確実に合格したい', '落ちたり、時間がかかってもいいから、とにかくお金をかけずに合格したい'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        options: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSExcel一般レベルに、今から3週間以内に900点以上で一発合格できるとしたら、いくらの価値がありますか?', required: true,
        options: ['20万円以上', '~3万円', '~1万円', '3000円', '1円の価値もない'] },
      { type: 'mc', title: '受験本番の前に、模擬試験を受ける必要があると感じていますか?', required: true, options: ['はい', 'いいえ'] },
      { type: 'cb', title: '既に買った教材があれば教えてください（複数選択可）', required: false,
        options: ['FOM出版の対策テキスト', '日経BP', '西尾パソコン教室', 'Excel兄さん'] },
      { type: 'long', title: 'なぜその教材を買いましたか?', required: false },
      { type: 'long', title: '動画「MOSエクセルに興味がある?」を見た感想を教えてください', required: true },
      { type: 'long', title: '最後に一言、MOS合格に向けて意気込みをお願いします!', required: true },
    ]
  },
  // ========== #3: Excel 模擬試験配布前 ==========
  {
    title: 'MOS Excel365 模擬試験配布前アンケート',
    description: '模擬試験を受け取るには、以下のアンケートに回答ください。\n（なるべく詳細に回答ください。いい加減な回答があった場合は、模擬試験の送付をお断りさせていただく場合があります）',
    items: [
      { type: 'email', title: 'メールアドレス', required: true },
      { type: 'mc', title: '登録いただいたメールアドレス宛に模擬試験をお送りします。確認しましたか?', required: true,
        options: ['はい、確認しました'] },
      { type: 'mc', title: 'どこから来ましたか?', required: true, options: ['Kindle', 'Udemy講座', 'Teachable講座'] },
      { type: 'mc', title: '性別', required: true, options: ['女性', '男性', '回答しない'] },
      { type: 'mc', title: '年齢', required: true, options: ['10代', '20代', '30代', '40代', '50代', '60代', '~90代'] },
      { type: 'mc', title: '現在の状況（近いものを選択ください）', required: true,
        options: ['学生', '社会人', '専業主婦', 'フリーター', '定年退職済み'] },
      { type: 'mc', title: 'じゃぱそんを知ったきっかけ', required: true,
        options: ['SEO記事（ネット検索）', 'YouTube', 'Kindle', 'Udemy'] },
      { type: 'cb', title: 'MOSを知ったきっかけ（近いものにチェック・複数選択可）', required: true,
        options: ['知り合いにオススメされた', '資格を探していた', '職場で取得を促された', 'ネットなどでたまたま目にした'] },
      { type: 'long', title: 'MOSを知ったきっかけについて詳しく教えてください（任意）', required: false },
    ]
  },
  // ========== #5: ExcelEx 演習ファイル（購入者専用） ==========
  {
    title: 'MOS Excelエキスパート YouTube演習ファイル配布前アンケート（購入者専用）',
    description: '演習ファイルを受け取るには、アンケートに回答ください。（入力いただいたメールアドレス宛に、ダウンロードページのリンクをお送りします）',
    items: [
      { type: 'email', title: '購入時の（Teachableに登録した）メールアドレスを入力してください', required: true },
      { type: 'mc', title: '「メルマガ登録」にチェックがついているか確認しましたか?', required: true, options: ['はい、チェックしました'] },
      { type: 'mc', title: '「MOS Excel365エキスパートの全範囲を79問、84分でマスターする」YouTube動画を何で知りましたか?', required: true,
        options: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '一般レベルをじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '一般レベルは合格済みですか?', required: false, options: ['はい', 'いいえ'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        options: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSExcelエキスパートレベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        options: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円', '100円', '0円'] },
      { type: 'cb', title: '演習ファイルを購入した理由として、当てはまるものをすべて選択してください', required: true,
        options: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '値段が安かった', '自分が望んでいたものに一番近いと感じた'] },
      { type: 'long', title: '購入した理由について詳しく教えてください', required: true },
      { type: 'mc', title: '受験本番の前に、模擬試験を受ける必要があると感じていますか?', required: true, options: ['はい', 'いいえ'] },
      { type: 'long', title: '動画「MOS Excel365エキスパート(Expert)の難易度を例題付きで解説」を視た感想を教えてください', required: true },
    ]
  },
  // ========== #6: ExcelEx YouTube演習ファイル ==========
  {
    title: 'MOS Excelエキスパート YouTube演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、以下のアンケートに回答ください。',
    items: [
      { type: 'email', title: 'メールアドレス', required: true },
      { type: 'mc', title: '登録いただいたメールアドレス宛に演習ファイルをお送りします。確認しましたか?', required: true, options: ['はい、確認しました'] },
      { type: 'mc', title: '「MOS Excel365エキスパートの全範囲を79問、84分でマスターする」YouTube動画を何で知りましたか?', required: true,
        options: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '一般レベルをじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '一般レベルは合格済みですか?', required: false, options: ['はい', 'いいえ'] },
      { type: 'mc', title: 'MOS365Excelエキスパートの学習は・・', required: true, options: ['これから', 'もう始めていて途中', 'もうすぐ試験'] },
      { type: 'mc', title: '近いものを選択してください（学習スタンス）', required: true,
        options: ['多少お金をかけてでも、効率的に学んで、確実に合格したい', '落ちたり、時間がかかってもいいから、とにかくお金をかけずに合格したい'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        options: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSExcelエキスパートレベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        options: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円', '100円', '0円'] },
      { type: 'mc', title: '不合格になった場合、受講料がタダになる講座に興味はありますか?', required: true, options: ['ある', 'わからない'] },
      { type: 'mc', title: '受験本番の前に、模擬試験を受ける必要があると感じていますか?', required: true, options: ['はい', 'いいえ'] },
      { type: 'long', title: '最後に一言、エキスパート合格に向けて意気込みをお願いします!', required: true },
    ]
  },
  // ========== #7: Word 演習ファイル ==========
  {
    title: 'MOS Word365 YouTube演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、アンケートに回答ください。（入力いただいたメールアドレス宛に、ダウンロードページのリンクをお送りします）',
    items: [
      { type: 'email', title: '購入時の（Teachableに登録した）メールアドレスを入力してください', required: true },
      { type: 'mc', title: '「メルマガ登録」にチェックがついているか確認しましたか?', required: true, options: ['はい、チェックしました'] },
      { type: 'mc', title: '「MOSはExcelよりもWordを受けるべき?」YouTube動画を何で知りましたか?', required: true,
        options: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '他の科目をじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        options: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSWord一般レベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        options: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円'] },
      { type: 'cb', title: '演習ファイルを購入した理由として、当てはまるものをすべて選択してください', required: true,
        options: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '値段が安かった', '自分が望んでいたものに一番近いと感じた'] },
      { type: 'long', title: '購入した理由について詳しく教えてください', required: true },
      { type: 'long', title: '動画「MOSはExcelよりもWordを受けるべき?」を視た感想を教えてください', required: true },
    ]
  },
  // ========== #8: WordEx 演習ファイル ==========
  {
    title: 'MOS Wordエキスパート YouTube演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、アンケートに回答ください。',
    items: [
      { type: 'email', title: '購入時の（Teachableに登録した）メールアドレスを入力してください', required: true },
      { type: 'mc', title: '「メルマガ登録」にチェックがついているか確認しましたか?', required: true, options: ['はい、チェックしました'] },
      { type: 'mc', title: '「MOSWordエキスパートは、一般レベルより簡単です」YouTube動画を何で知りましたか?', required: true,
        options: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '他の科目をじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: '近いものを選択してください（自信）', required: true,
        options: ['正直落ちるかもしれず不安', 'まぁまず間違いなく、一発合格できると思う'] },
      { type: 'mc', title: 'MOSWordエキスパートレベルに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        options: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円'] },
      { type: 'cb', title: '演習ファイルを購入した理由として、当てはまるものをすべて選択してください', required: true,
        options: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '値段が安かった', '自分が望んでいたものに一番近いと感じた'] },
      { type: 'long', title: '購入した理由について詳しく教えてください', required: true },
      { type: 'long', title: '動画「MOSWordエキスパートは、一般レベルより簡単です」を視た感想を教えてください', required: true },
    ]
  },
  // ========== #11: PowerPoint ==========
  {
    title: 'MOS PowerPoint365 演習ファイル配布前アンケート',
    description: '演習ファイルを受け取るには、以下のアンケートに回答ください。',
    items: [
      { type: 'email', title: '先ほどと同じメールアドレスを入力してください（異なる場合、演習ファイルをお送りできません）', required: true },
      { type: 'cb', title: '以下を一読の上、すべてにチェックをつけてください', required: true,
        options: [
          'MOS PowerPointの試験に申込済みです',
          '60日以内に合否報告が必要であることを理解しました',
          '合否報告時に、任意の金額を支援できることを理解しました',
          '60日以内に合否報告がない場合、演習ファイルの制作・提供費として3,300円（税込）を支払う必要があることを理解しました'
        ] },
      { type: 'mc', title: '「MOS PowerPoint 365の全範囲を55問でマスターする講座」YouTube動画を何で知りましたか?', required: true,
        options: ['YouTube内で検索', 'YouTubeのオススメに出てきた', '他の科目をじゃぱそんのYouTube動画で勉強した', 'じゃぱそんのSEO記事から飛んできた', '知人からの紹介', 'その他'] },
      { type: 'mc', title: 'MOSパワーポイントに、1ヶ月以内に一発合格できるとしたら、いくらの価値がありますか?', required: true,
        options: ['20万円以上', '~5万円', '~3万円', '~1万円', '5000円', '1000円'] },
      { type: 'cb', title: '演習ファイルを受け取る理由として、当てはまるものをすべて選択してください', required: true,
        options: ['効率的に学習できそうだった', 'YouTubeがわかりやすかった', '他の科目をじゃぱそんの教材で学習した', '無料で試せるから', '自分が望んでいたものに一番近いと感じた'] },
      { type: 'long', title: '理由について詳しく教えてください', required: true },
      { type: 'long', title: '動画「MOS PowerPointが一番意味ないです。概要と勉強法」を視た感想を教えてください', required: true },
    ]
  },
];

/**
 * メイン関数：すべてのアンケートをGoogleフォームとして作成
 */
function createAllSurveys() {
  const results = [];

  for (const survey of SURVEYS) {
    try {
      const url = createOneSurvey(survey);
      results.push({ title: survey.title, ...url });
      Logger.log('✅ 作成成功: ' + survey.title);
    } catch (e) {
      Logger.log('❌ 作成失敗: ' + survey.title + ' / ' + e.message);
      results.push({ title: survey.title, error: e.message });
    }
  }

  // 結果サマリー表示
  Logger.log('\n========== 作成結果 ==========');
  results.forEach((r, i) => {
    Logger.log(`\n[${i + 1}] ${r.title}`);
    if (r.error) {
      Logger.log('  ERROR: ' + r.error);
    } else {
      Logger.log('  公開URL: ' + r.publishedUrl);
      Logger.log('  編集URL: ' + r.editUrl);
    }
  });
  Logger.log('\n回答シート: https://docs.google.com/spreadsheets/d/' + DEST_SHEET_ID);
}

/**
 * 単一アンケートを作成し、回答先スプシに連結
 */
function createOneSurvey(survey) {
  const form = FormApp.create(survey.title);
  form.setDescription(survey.description);
  form.setCollectEmail(false); // メールはitemsで明示的に取る方針
  form.setProgressBar(true);

  for (const item of survey.items) {
    addItem(form, item);
  }

  // 回答送信先を指定スプシに設定
  form.setDestination(FormApp.DestinationType.SPREADSHEET, DEST_SHEET_ID);

  return {
    publishedUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}

/**
 * 質問タイプ別にFormItemを追加するヘルパー
 */
function addItem(form, item) {
  let q;
  switch (item.type) {
    case 'email':
      q = form.addTextItem();
      q.setTitle(item.title);
      if (item.helpText) q.setHelpText(item.helpText);
      // メールアドレス検証
      const validation = FormApp.createTextValidation()
        .requireTextIsEmail()
        .setHelpText('正しいメールアドレスを入力してください')
        .build();
      q.setValidation(validation);
      break;
    case 'short':
      q = form.addTextItem();
      q.setTitle(item.title);
      if (item.helpText) q.setHelpText(item.helpText);
      break;
    case 'long':
      q = form.addParagraphTextItem();
      q.setTitle(item.title);
      if (item.helpText) q.setHelpText(item.helpText);
      break;
    case 'mc': // multiple choice (radio)
      q = form.addMultipleChoiceItem();
      q.setTitle(item.title);
      if (item.helpText) q.setHelpText(item.helpText);
      q.setChoiceValues(item.options);
      break;
    case 'cb': // checkbox (multi-select)
      q = form.addCheckboxItem();
      q.setTitle(item.title);
      if (item.helpText) q.setHelpText(item.helpText);
      q.setChoiceValues(item.options);
      break;
    case 'list': // dropdown
      q = form.addListItem();
      q.setTitle(item.title);
      if (item.helpText) q.setHelpText(item.helpText);
      q.setChoiceValues(item.options);
      break;
    default:
      throw new Error('Unknown item type: ' + item.type);
  }
  q.setRequired(item.required === true);
}

/**
 * テスト：1個目だけ作成
 */
function createFirstOnly() {
  const survey = SURVEYS[0];
  const result = createOneSurvey(survey);
  Logger.log('Title: ' + survey.title);
  Logger.log('Published URL: ' + result.publishedUrl);
  Logger.log('Edit URL: ' + result.editUrl);
}

/**
 * 既に作成したフォームを全削除（やり直し用）
 * 注意: タイトルが完全一致のフォームのみ対象
 */
function deleteCreatedForms() {
  const titles = SURVEYS.map(s => s.title);
  let deleted = 0;
  const files = DriveApp.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === 'application/vnd.google-apps.form' && titles.includes(file.getName())) {
      file.setTrashed(true);
      Logger.log('🗑️ 削除: ' + file.getName());
      deleted++;
    }
  }
  Logger.log(`削除完了: ${deleted}件`);
}
