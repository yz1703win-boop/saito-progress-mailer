// =====================================================
// 設定ファイル — 機密情報は環境変数（GitHub Secrets）から読む
// =====================================================

module.exports = {
  // ── メール設定 ──────────────────────────────────────
  mail: {
    from:        'yz.1703.win@gmail.com',
    to:          'dondonikudon5@gmail.com',
    appPassword: process.env.GMAIL_APP_PASSWORD || 'sdaypurssmjvwmzi',
  },

  // ── Google Sheets 設定 ─────────────────────────────
  sheets: {
    apiKey: process.env.GOOGLE_API_KEY || 'AIzaSyCb2UnJNyU1OyIGA85Yj63PNd5xCFXAioo',

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

  // ── GitHub Pages デプロイ設定 ─────────────────────
  pages: {
    url: 'https://yz1703win-boop.github.io/saito-progress-mailer/',
  }
};
