/**
 * MOSExcel-Kindle購入者アンケート Google Form 自動生成スクリプト
 *
 * 使い方:
 *   1. https://script.google.com/ にアクセスして「新しいプロジェクト」を作成
 *   2. このファイルの中身を全部コピーして Code.gs に貼り付け
 *   3. 上部メニューから createSurveyForm を選んで「実行」ボタンをクリック
 *   4. 初回はGoogleアカウントの認可が必要（画面の指示に従ってOK）
 *   5. 実行ログにフォームのURLが出るので、それを開いて確認
 *
 * 元アンケート（Mailchimp版）と同じ設問構成:
 *   - メールアドレス収集
 *   - メルマガ登録チェック（必須）
 *   - 本を知ったきっかけ（単一選択 + その他）
 *   - PrimeReading / KindleUnlimited 該当（単一選択）
 *   - 購入理由（複数選択 + その他）
 *   - 購入理由の自由記述
 *   - じゃぱそんの本を選んだ理由（複数選択）
 *   - じゃぱそんを選んだ理由の自由記述
 */

function createSurveyForm() {
  // ===== フォームの基本設定 =====
  var form = FormApp.create('MOSExcel-Kindle購入者アンケート');

  form.setDescription(
    '1分でアンケートにご協力ください。\n' +
    '(必要としている人に届けるための貴重な情報となります。' +
    '丁寧な回答、本当に助かります。いつもありがとうございます!)\n\n' +
    'ダウンロード用のURLは、メールでお送りします。' +
    'メールアドレス入力の上、メルマガ登録にチェックをつけてください。'
  );

  // メールアドレスを収集する設定
  form.setCollectEmail(true);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);

  // ===== Q1: メルマガ登録チェック（必須） =====
  form.addCheckboxItem()
    .setTitle('メルマガ登録(チェック必須)')
    .setHelpText('↑メルマガ登録にチェックしましたか?忘れるとメールが送れず、資料をダウンロードできません')
    .setChoiceValues(['はい、チェックしました'])
    .setRequired(true);

  // ===== Q2: 本を知ったきっかけ（単一選択 + その他） =====
  var q2 = form.addMultipleChoiceItem();
  q2.setTitle('何でこの本を知りましたか?')
    .setChoices([
      q2.createChoice('Kindle(Amazon)内で検索した'),
      q2.createChoice('Udemy'),
      q2.createChoice('YouTube'),
      q2.createChoice('メルマガ'),
      q2.createChoice('知り合いに勧められた')
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ===== Q3: PrimeReading / KindleUnlimited 該当 =====
  var q3 = form.addMultipleChoiceItem();
  q3.setTitle('当てはまるものを選択ください')
    .setChoices([
      q3.createChoice('PrimeReading'),
      q3.createChoice('KindleUnlimited'),
      q3.createChoice('上記いずれでもない')
    ])
    .setRequired(true);

  // ===== Q4: 購入理由（複数選択 + その他） =====
  var q4 = form.addCheckboxItem();
  q4.setTitle('購入理由として当てはまるものすべてにチェックをつけてください。')
    .setChoices([
      q4.createChoice('MOSExcelの本を探していた'),
      q4.createChoice('YouTube動画の補足資料として'),
      q4.createChoice('模擬試験を受けるため'),
      q4.createChoice('他社の教材では学習が難しかった')
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ===== Q5: 購入理由の自由記述 =====
  form.addParagraphTextItem()
    .setTitle('購入理由について詳しく教えてください')
    .setRequired(true);

  // ===== Q6: じゃぱそんの本を選んだ理由（複数選択） =====
  var q6 = form.addCheckboxItem();
  q6.setTitle('他にも教材がある中で、じゃぱそんの本を選んだ理由として当てはまるものをすべて選択してください。')
    .setChoices([
      q6.createChoice('レビュー'),
      q6.createChoice('効率的に学習できそう'),
      q6.createChoice('他の科目をじゃぱそんの教材で学習した'),
      q6.createChoice('じゃぱそんのYouTubeを見てわかりやすそうだった'),
      q6.createChoice('他によさそうなものがなかった')
    ])
    .setRequired(true);

  // ===== Q7: じゃぱそんを選んだ理由の自由記述 =====
  form.addParagraphTextItem()
    .setTitle('じゃぱそんの本を選んだ理由について、詳しく教えてください。')
    .setRequired(true);

  // ===== 確認メッセージ =====
  form.setConfirmationMessage(
    'ご協力ありがとうございました!\n' +
    'ご入力いただいたメールアドレス宛に、ダウンロードURLをお送りします。'
  );

  // ===== 完成したURLをログに出力 =====
  var publishedUrl = form.getPublishedUrl();
  var editUrl = form.getEditUrl();

  Logger.log('=== フォーム作成完了 ===');
  Logger.log('回答用URL  : ' + publishedUrl);
  Logger.log('編集用URL  : ' + editUrl);

  return {
    publishedUrl: publishedUrl,
    editUrl: editUrl
  };
}
