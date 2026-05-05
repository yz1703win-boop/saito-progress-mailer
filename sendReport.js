// =====================================================
// メインエントリーポイント
// Sheets取得 → HTML生成 → Surgeデプロイ → スクショ2枚 → メール送信
// =====================================================

// タイムゾーンを日本時間に固定（GitHub ActionsのサーバーはデフォルトがUTC）
process.env.TZ = 'Asia/Tokyo';

const puppeteer  = require('puppeteer');
const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');
const { execSync } = require('child_process');

const config                = require('./config');
const { fetchAllData }      = require('./fetchSheetData');
const { generateDashboard } = require('./generateDashboard');

// ── 日付フォーマット ─────────────────────────────
function todayLabel() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekday = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${y}/${m}/${day}（${weekday}）`;
}

// ── HTMLをファイル保存 ────────────────────────────
function saveTempHtml(htmlContent) {
  const tmpPath = path.join(__dirname, '_tmp_dashboard.html');
  fs.writeFileSync(tmpPath, htmlContent, 'utf8');
  return tmpPath;
}

// ── Surgeへデプロイ ───────────────────────────────
async function deployToSurge(htmlContent) {
  const deployDir = path.join(__dirname, '_surge_deploy');
  if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir);

  // HTMLを index.html として保存
  fs.writeFileSync(path.join(deployDir, 'index.html'), htmlContent, 'utf8');

  const domain = config.surge?.domain || 'saito-progress-dashboard.surge.sh';
  console.log(`  → Surgeデプロイ中: ${domain}`);

  try {
    execSync(`surge ${deployDir} ${domain} --token ${config.surge?.token || ''}`, {
      timeout: 60000,
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' },
    });
    return `https://${domain}`;
  } catch (err) {
    // tokenなしでも試みる（ログイン済みの場合）
    try {
      execSync(`surge ${deployDir} ${domain}`, {
        timeout: 60000,
        env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' },
      });
      return `https://${domain}`;
    } catch (err2) {
      console.warn('  ⚠️  Surgeデプロイ失敗（メール送信は続行）:', err2.message);
      return null;
    }
  }
}

// ── Puppeteerでスクリーンショット（Tab1 & Tab2）────
async function takeScreenshots(htmlContent) {
  const tmpPath = saveTempHtml(htmlContent);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // GitHub Actions用（メモリ不足対策）
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`file://${tmpPath}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // ── Tab1（進捗サマリー）────────────────────────
    const tab1Height = await page.evaluate(() => {
      const el = document.getElementById('tab1');
      return el ? el.scrollHeight + 100 : 900;
    });
    await page.setViewport({ width: 390, height: Math.min(tab1Height, 1800), deviceScaleFactor: 2 });
    await new Promise(r => setTimeout(r, 200));
    const tab1Png = await page.screenshot({ type: 'png', fullPage: true });

    // ── Tab2（ガントチャート）────────────────────
    // Tab2に切り替え
    await page.evaluate(() => {
      if (typeof showTab === 'function') showTab(2);
    });
    await new Promise(r => setTimeout(r, 500));

    // ガントチャートは横に長いので幅を広げてキャプチャ
    await page.setViewport({ width: 1400, height: 700, deviceScaleFactor: 1.5 });
    await new Promise(r => setTimeout(r, 300));

    // ガントをスクロールなしで全体表示
    await page.evaluate(() => {
      const wrap = document.getElementById('gantt-wrap');
      if (wrap) wrap.style.overflow = 'visible';
      const tab2 = document.getElementById('tab2');
      if (tab2) { tab2.style.overflow = 'visible'; tab2.style.height = 'auto'; }
      document.body.style.height = 'auto';
      document.body.style.overflow = 'visible';
    });
    await new Promise(r => setTimeout(r, 300));

    const ganttHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 1400, height: Math.min(ganttHeight + 50, 4000), deviceScaleFactor: 1.5 });
    await new Promise(r => setTimeout(r, 200));
    const tab2Png = await page.screenshot({ type: 'png', fullPage: true });

    return { tab1Png, tab2Png };
  } finally {
    await browser.close();
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

// ── メール送信 ────────────────────────────────────
async function sendEmail({ tab1Png, tab2Png, taskCount }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.mail.from,
      pass: config.mail.appPassword,
    },
  });

  const today = todayLabel();
  const subject = `【進捗レポート】${today} ／ ${config.dashboard.title}`;

  const surgeUrl = `https://${config.surge.domain}`;
  const surgeSection = `
  <div style="background:white;border-radius:10px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="font-size:11px;color:#64748b;margin-bottom:6px;">🔗 ダッシュボード URL</div>
    <a href="${surgeUrl}" style="font-size:14px;font-weight:700;color:#2563eb;word-break:break-all;">${surgeUrl}</a>
    <div style="font-size:10px;color:#94a3b8;margin-top:4px;">ガントチャートの詳細はこちらで確認できます</div>
  </div>`;

  const htmlBody = `
<div style="font-family:'Hiragino Kaku Gothic ProN',sans-serif;max-width:520px;margin:0 auto;background:#f0f4f8;padding:16px;border-radius:12px;">

  <div style="background:white;border-radius:10px;padding:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <h2 style="font-size:16px;color:#1e293b;margin:0 0 6px;">📊 進捗レポート</h2>
    <p style="font-size:13px;color:#64748b;margin:0;">${today}</p>
    <p style="font-size:13px;color:#64748b;margin:4px 0 0;">タスク総数: <strong>${taskCount}件</strong></p>
  </div>

  ${surgeSection}

  <div style="font-size:11px;font-weight:700;color:#1e293b;margin-bottom:6px;padding:0 2px;">📋 進捗サマリー</div>
  <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:12px;">
    <img src="cid:progress_summary" style="width:100%;display:block;" alt="進捗サマリー">
  </div>

  <div style="font-size:11px;font-weight:700;color:#1e293b;margin-bottom:6px;padding:0 2px;">📅 ガントチャート</div>
  <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:12px;">
    <img src="cid:gantt_chart" style="width:100%;display:block;" alt="ガントチャート">
  </div>

  <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:8px;">このメールは自動生成されました</p>
</div>`;

  const dateStr = new Date().toISOString().slice(0, 10);
  const info = await transporter.sendMail({
    from: `"進捗レポート Bot" <${config.mail.from}>`,
    to:   config.mail.to,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename:    `summary_${dateStr}.png`,
        content:     tab1Png,
        cid:         'progress_summary',
        contentType: 'image/png',
      },
      {
        filename:    `gantt_${dateStr}.png`,
        content:     tab2Png,
        cid:         'gantt_chart',
        contentType: 'image/png',
      },
    ],
  });

  console.log(`✅ メール送信完了: ${info.messageId}`);
  return info;
}

// ── メイン処理 ────────────────────────────────────
async function main() {
  console.log('===== 進捗レポート送信開始 =====');
  console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}`);

  // 1. Google Sheetsからデータ取得
  console.log('\n[1/5] Google Sheetsからデータ取得中...');
  let tasks, holidays;
  try {
    ({ tasks, holidays } = await fetchAllData());
    console.log(`  → タスク: ${tasks.length}件（✕除外済み） / 休日: ${holidays.length}日`);
  } catch (err) {
    console.error('  ❌ データ取得失敗:', err.message);
    process.exit(1);
  }

  if (tasks.length === 0) {
    console.warn('  ⚠️  タスクが0件です。スプレッドシートの設定を確認してください。');
    process.exit(0);
  }

  // 2. HTMLダッシュボード生成
  console.log('\n[2/5] HTMLダッシュボード生成中...');
  const html = generateDashboard(tasks, holidays);
  console.log('  → 生成完了');

  // 3. Surgeへデプロイ
  console.log('\n[3/5] Surgeへデプロイ中...');
  const surgeUrl = await deployToSurge(html);
  if (surgeUrl) console.log(`  → デプロイ完了: ${surgeUrl}`);

  // 4. スクリーンショット（Tab1 + Tab2）
  console.log('\n[4/5] スクリーンショット撮影中（サマリー + ガント）...');
  let screenshots;
  try {
    screenshots = await takeScreenshots(html);
    console.log(`  → サマリーPNG: ${Math.round(screenshots.tab1Png.length / 1024)}KB`);
    console.log(`  → ガントPNG:   ${Math.round(screenshots.tab2Png.length / 1024)}KB`);
  } catch (err) {
    console.error('  ❌ スクリーンショット失敗:', err.message);
    process.exit(1);
  }

  // 5. メール送信
  console.log('\n[5/5] メール送信中...');
  try {
    await sendEmail({ ...screenshots, taskCount: tasks.length });
    console.log(`  → 送信先: ${config.mail.to}`);
  } catch (err) {
    console.error('  ❌ メール送信失敗:', err.message);
    process.exit(1);
  }

  console.log('\n===== 完了 =====\n');
}

main().catch(err => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
