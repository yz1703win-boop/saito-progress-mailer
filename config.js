// =====================================================
// 設定ファイル — 機密情報は環境変数（GitHub Secrets）から読む
// =====================================================

module.exports = {
  // ── メール設定 ──────────────────────────────────────
  mail: {
    from:        'yz.1703.win@gmail.com',
    to:          'dondonikudon5@gmail.com',
    appPassword: process.env.GMAIL_APP_PASSWORD,
  },

  // ── Google Sheets 設定 ─────────────────────────────
  sheets: {
    apiKey: process.env.GOOGLE_API_KEY,

    // 制作シート
    seisaku: {
      spreadsheetId: '1OTPqrSNUVIWA75SWac898KNUZWKQkn10pgQHNxawgVA',
      sheetName: 'タスク・スケジュール',
      startRow: 10,
      cols: {
        taskName:    10,  // K列 タスク名
        mkSubmit:    23,  // X列 クリエイターへの入稿日
        draftDate:   55,  // BD列 初稿
        status:       9,  // J列 制作の有無（✕はスキップ）
        promoType:    2,  // C列 体験会フラグ（FALSEはスキップ）
        category:    -1,
        assignee:    -1,
        type:        -1,
        // 明示的スケジュール列（シートに実際の日付が入っている場合）
        draftSubmit:  31,  // AF列 初稿提出日
        draftFb:      34,  // AI列 初稿FB日
        rev2Submit:   37,  // AL列 ２稿提出日
        rev2Fb:       40,  // AO列 ２稿FB日
        rev3Submit:   43,  // AR列 ３稿提出日
        rev3Fb:       46,  // AU列 ３稿FB日
        rev4Submit:   49,  // AX列 ４稿提出日
        delivery:     51,  // AZ列 納品日
        publicActual: 54,  // BC列 公開/発注日
      }
    },

    // 勤怠表
    kinai: {
      spreadsheetId: '189rMPs49uZlyQDuUAoOhkDsnQTbhk2fO8Cqviu46YAE',
      targetName: '藤原',
      nameCol: 0,
    }
  },

  // ── ダッシュボード設定 ─────────────────────────────
  dashboard: {
    title: '齋藤慶太先生 体験会プロモーション',
    ganttEndDate: new Date(2026, 6, 10),
  },

  // ── 追加ソース：琉球キネシ 管理シート ─────────────
  ryukyu: {
    spreadsheetId: '1LMF_k-4TW5NAsOLDoOQGG6pSewD_mSGZrvpdsdIWZyQ',
    sheetName: '各種タスク進捗',
    startRow: 2,   // 1行目はヘッダー
    cols: {
      taskName: 0, // A列 タスク名
      deadline: 1, // B列 期限（入稿日として扱う）
      time:     2, // C列 時間（例: 10:00, 終日）
    }
  },

  // ── GitHub Pages デプロイ設定 ─────────────────────
  pages: {
    url: 'https://yz1703win-boop.github.io/saito-progress-mailer/',
  }
};
