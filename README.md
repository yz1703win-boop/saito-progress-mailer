# 進捗レポート自動送信ツール

毎朝 Google Sheets の制作シートを読み込み、進捗ダッシュボードをPNG化してメールで送信します。

---

## ファイル構成

```
saito-progress-mailer/
├── config.js               ← ★ 設定ファイル（最初にここを編集）
├── fetchSheetData.js       ← Google Sheets APIでデータ取得
├── calcSchedule.js         ← 営業日計算・スケジュール逆算
├── generateDashboard.js    ← HTMLダッシュボード生成
├── sendReport.js           ← 実行エントリーポイント
├── credentials.json        ← ★ Google APIキー（手順2で配置）
├── com.saito.progress-report.plist  ← macOS自動実行設定
├── logs/                   ← 実行ログ
└── package.json
```

---

## セットアップ手順

### 手順 1 — Gmailアプリパスワードの取得

1. [Googleアカウントのセキュリティページ](https://myaccount.google.com/security) を開く
2. **2段階認証** をオンにする（まだの場合）
3. **アプリパスワード** → アプリ「メール」、デバイス「Mac」で生成
4. 表示された **16文字のパスワード** をコピー

`config.js` の以下の箇所に貼り付け：
```js
appPassword: 'xxxx xxxx xxxx xxxx',  // スペースは除いてOK
```

---

### 手順 2 — Google Cloud APIキーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 新しいプロジェクトを作成（例: `saito-progress`）
3. 左メニュー → **APIとサービス** → **ライブラリ**
4. 「Google Sheets API」を検索して **有効化**
5. **認証情報** → **認証情報を作成** → **サービスアカウント**
   - 名前: `progress-reader`（任意）
   - ロール: **閲覧者（Viewer）**
6. 作成したサービスアカウントをクリック → **キー** タブ → **鍵を追加** → **JSON**
7. ダウンロードしたJSONファイルを `credentials.json` という名前でこのフォルダに配置

---

### 手順 3 — スプレッドシートをサービスアカウントに共有

1. `credentials.json` を開いて `"client_email"` の値をコピー
   （例: `progress-reader@saito-progress.iam.gserviceaccount.com`）
2. **制作シート** と **勤怠表** の両方を開き、**共有** → そのメールアドレスに「閲覧者」権限で共有

---

### 手順 4 — config.js の設定確認

```js
// config.js の seisaku.sheetName を実際のシート名（タブ名）に変更
sheetName: 'シート1',  // ← 制作シートのタブ名を確認して変更
```

スプレッドシートを開いて、データが入っているシートのタブ名を確認してください。

---

### 手順 5 — 動作テスト（手動実行）

```bash
cd /Users/ishi/Desktop/My-First-Project/saito-progress-mailer
node sendReport.js
```

以下のログが出れば成功：
```
===== 進捗レポート送信開始 =====
[1/4] Google Sheetsからデータ取得中...
  → タスク: XX件 / 休日: XX日
[2/4] HTMLダッシュボード生成中...
[3/4] スクリーンショット撮影中...
[4/4] メール送信中...
  ✅ メール送信完了
===== 完了 =====
```

---

### 手順 6 — 毎朝 7:30 の自動実行を設定

```bash
# plistをLaunchAgentsにコピー
cp /Users/ishi/Desktop/My-First-Project/saito-progress-mailer/com.saito.progress-report.plist \
   ~/Library/LaunchAgents/

# 登録して起動
launchctl load ~/Library/LaunchAgents/com.saito.progress-report.plist
```

解除したい場合：
```bash
launchctl unload ~/Library/LaunchAgents/com.saito.progress-report.plist
```

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|--------|------|------|
| `Error: invalid_grant` | サービスアカウントのキーが無効 | credentials.jsonを再作成 |
| `Error: Username and Password not accepted` | アプリパスワードが間違い | config.jsのappPasswordを確認 |
| `タスクが0件` | シート名や列番号がずれている | config.jsのsheetNameと列番号を確認 |
| PNGが白くなる | Puppeteerのフォント問題 | Rosetta/Chromiumを再インストール |

---

## ログ確認

```bash
# 最新の実行ログ
cat /Users/ishi/Desktop/My-First-Project/saito-progress-mailer/logs/stdout.log
cat /Users/ishi/Desktop/My-First-Project/saito-progress-mailer/logs/stderr.log
```

---

## 勤怠表の列設定（要確認）

`config.js` の `kinai.nameCol` に「藤原」という名前が入っている列番号（0-indexed）を設定してください。

勤怠表の構成が不明な場合は以下を実行して列を確認：
```bash
node -e "
const {google} = require('googleapis');
const cfg = require('./config');
async function main() {
  const auth = new google.auth.GoogleAuth({keyFile: cfg.sheets.credentialsPath, scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  const client = await auth.getClient();
  const sheets = google.sheets({version:'v4', auth:client});
  const res = await sheets.spreadsheets.values.get({spreadsheetId:cfg.sheets.kinai.spreadsheetId, range:'A1:Z10'});
  console.log(JSON.stringify(res.data.values, null, 2));
}
main();
"
```
