// =====================================================
// 接続テストスクリプト（APIキー設定後に実行）
// 実行: node setup_auth.js
// =====================================================

const { google } = require('googleapis');
const config     = require('./config');

async function main() {
  console.log('スプレッドシートへの接続テストを開始します...\n');

  const sheets = google.sheets({ version: 'v4', auth: config.sheets.apiKey });

  // 制作シートのテスト
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheets.seisaku.spreadsheetId,
      range: 'A1:L3',
    });
    console.log('✅ 制作シート: アクセス成功！');
    if (res.data.values) {
      console.log('  先頭データ:', JSON.stringify(res.data.values[0]?.slice(0, 5)));
    }
  } catch (err) {
    console.error('❌ 制作シート: アクセス失敗 -', err.message);
  }

  // 勤怠表のテスト
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: config.sheets.kinai.spreadsheetId,
    });
    const sheetNames = res.data.sheets.map(s => s.properties.title);
    console.log('\n✅ 勤怠表: アクセス成功！');
    console.log('  シート名一覧:', sheetNames.join(', '));
  } catch (err) {
    console.error('❌ 勤怠表: アクセス失敗 -', err.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('両方✅なら: node sendReport.js で本番実行できます！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('エラー:', err.message);
});
