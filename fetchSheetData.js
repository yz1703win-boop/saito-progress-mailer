// =====================================================
// Google Sheetsからデータを取得するモジュール
// APIキー認証（シートが「全員閲覧可」の場合に使用）
// =====================================================

const { google } = require('googleapis');
const config     = require('./config');
const { subBD }  = require('./calcSchedule');

// ── Google Sheets クライアント作成 ───────────────
function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: config.sheets.apiKey });
}

// ── 列インデックス → 列名変換（例: 0→A, 25→Z, 26→AA）────
function colName(idx) {
  let name = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

// ── 日付文字列をDateオブジェクトに変換 ────────────
function parseDate(val) {
  if (!val) return null;
  // "2026/5/8", "2026-05-08", "5/8", "5月8日" など複数形式に対応
  const str = String(val).trim();
  let m;

  // YYYY/MM/DD or YYYY-MM-DD
  m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);

  // MM/DD (年なし → 今年か来年を自動判定)
  m = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const now = new Date();
    const y = now.getFullYear();
    const d = new Date(y, +m[1]-1, +m[2]);
    if (d < now) d.setFullYear(y + 1);
    return d;
  }

  // M月D日
  m = str.match(/^(\d{1,2})月(\d{1,2})日?$/);
  if (m) {
    const now = new Date();
    const y = now.getFullYear();
    const d = new Date(y, +m[1]-1, +m[2]);
    if (d < now) d.setFullYear(y + 1);
    return d;
  }

  // Googleシートのシリアル値（数値）
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000) {
    // Excelのシリアル値変換: 1900/1/1 = 1
    return new Date(Math.round((num - 25569) * 86400 * 1000));
  }

  return null;
}

// ── カテゴリ自動推定（タスク名から判定）────────────
function guessCategory(name) {
  if (!name) return 'その他';
  const n = name;
  if (n.includes('DM') || n.includes('チラシ') || n.includes('印刷')) return 'DM・印刷物';
  if (n.includes('動画') || n.includes('mp4') || n.includes('映像') || n.includes('切り抜き')) return '動画';
  if (n.includes('オプトイン') || n.includes('バナー') || n.includes('OGP')) return 'オプトイン';
  if (n.includes('レター') || n.includes('ページ') || n.includes('セール') || n.includes('LINE') || n.includes('ティザー')) return 'レター・BE';
  return 'その他';
}

// ── タイプ推定（動画 or デザイン）────────────────
function guessType(name) {
  if (!name) return 'dsn';
  const n = name;
  if (n.includes('動画') || n.includes('mp4') || n.includes('映像') || n.includes('切り抜き')) return 'vid';
  return 'dsn';
}

// ── カテゴリ別ドットカラー ───────────────────────
const DOT_COLORS = {
  'DM・印刷物': '#ef4444',
  'オプトイン':  '#f97316',
  'レター・BE': '#8b5cf6',
  '動画':        '#10b981',
  'その他':      '#94a3b8',
};

// ── 制作シートからタスク一覧を取得 ────────────────
async function fetchTasks() {
  const sheets = getSheetsClient();
  const cfg = config.sheets.seisaku;

  // A列から最大列まで取得（体験会フラグ=C列も含む）
  const maxCol = Math.max(cfg.cols.taskName, cfg.cols.mkSubmit, cfg.cols.draftDate,
    cfg.cols.status, cfg.cols.promoType, cfg.cols.category, cfg.cols.assignee, cfg.cols.type) + 1;
  const endCol = colName(maxCol);
  const range = `${cfg.sheetName}!A${cfg.startRow}:${endCol}1000`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range,
  });

  const rows = res.data.values || [];
  const tasks = [];

  rows.forEach((row, i) => {
    const name = row[cfg.cols.taskName] ? String(row[cfg.cols.taskName]).trim() : null;
    if (!name) return;

    // 体験会=FALSEの行はスキップ（このプロモーション対象外）
    if (cfg.cols.promoType >= 0) {
      const promoVal = String(row[cfg.cols.promoType] || '').trim().toUpperCase();
      if (promoVal === 'FALSE' || promoVal === '') return;
    }

    // 制作の有無が✕の行はスキップ
    if (cfg.cols.status >= 0) {
      const statusVal = String(row[cfg.cols.status] || '').trim();
      if (statusVal === '✕' || statusVal === '×' || statusVal.toLowerCase() === 'x') return;
    }

    // X列 = クリエイターへの入稿日 = mkSubmit（直接読む）
    const mkSubmit  = parseDate(row[cfg.cols.mkSubmit]);
    const draftDate = parseDate(row[cfg.cols.draftDate]);
    if (!mkSubmit) return; // 入稿日がない行はスキップ

    // publicDate = draftDate から FB サイクルを経た最終公開日を推算
    // draftDate があれば: draftDate + 7BD（FB3サイクル）
    // なければ: mkSubmit + 10BD（初稿3BD + FBサイクル7BD）
    const effectiveDraft = draftDate || addBD(mkSubmit, 3);
    const publicDate = addBD(effectiveDraft, 7);

    const category = cfg.cols.category >= 0 && row[cfg.cols.category]
      ? String(row[cfg.cols.category]).trim()
      : guessCategory(name);

    const assignee = cfg.cols.assignee >= 0 && row[cfg.cols.assignee]
      ? String(row[cfg.cols.assignee]).trim()
      : '';

    const type = cfg.cols.type >= 0 && row[cfg.cols.type]
      ? (String(row[cfg.cols.type]).includes('動画') ? 'vid' : 'dsn')
      : guessType(name);

    tasks.push({
      id:        i + 1,
      name,
      sub:       assignee,
      type,
      cat:       category,
      dot:       DOT_COLORS[category] || '#94a3b8',
      mkSubmit,
      draftDate: effectiveDraft,
      publicDate,
    });
  });

  return tasks;
}

// ── 勤怠表から「藤原」の休日リストを取得 ───────────
async function fetchHolidays() {
  const sheets = getSheetsClient();
  const cfg = config.sheets.kinai;

  try {
    // スプレッドシートのシート一覧を取得して当月シートを探す
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId: cfg.spreadsheetId,
    });
    const sheetList = metaRes.data.sheets.map(s => s.properties.title);

    // 当月に対応するシート名を探す（例: "26年5月", "2026年5月", "5月"）
    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const year2 = String(year).slice(2); // "2026" → "26"

    const candidates = [
      `${year2}年${month}月`,             // "26年5月" ← この勤怠表の形式
      `最新${year2}年${month}月`,          // "最新26年5月"
      `NEW${year2}年${month}月`,           // "NEW26年5月"
      `${year}年${month}月`,               // "2026年5月"
      `${month}月`,                        // "5月"
      String(month).padStart(2, '0'),      // "05"
    ];
    const targetSheet = sheetList.find(s => candidates.some(c => s.trim() === c.trim()))
      || sheetList.find(s => candidates.some(c => s.includes(c.trim())))
      || sheetList[0];

    // シート全体を取得
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheetId,
      range: `${targetSheet}!A1:Z200`,
    });

    const rows = dataRes.data.values || [];
    const holidays = [];

    // 「藤原」の行または列を探して休暇日を収集
    rows.forEach(row => {
      // 行内に「藤原」があれば、その行の日付セルを走査
      const nameIdx = row.findIndex(cell => String(cell || '').includes(cfg.targetName));
      if (nameIdx >= 0) {
        row.forEach((cell, ci) => {
          if (ci === nameIdx) return;
          const d = parseDate(cell);
          if (d) holidays.push(d);
        });
      }
    });

    // 列内に「藤原」があれば、その列の日付行を走査
    if (holidays.length === 0) {
      rows.forEach((row, ri) => {
        const cell = row[cfg.nameCol] || '';
        if (String(cell).includes(cfg.targetName)) {
          row.forEach((c, ci) => {
            if (ci === cfg.nameCol) return;
            const d = parseDate(c);
            if (d) holidays.push(d);
          });
        }
      });
    }

    return holidays;
  } catch (e) {
    console.warn('勤怠表の取得に失敗しました（休日なしで継続）:', e.message);
    return [];
  }
}

// ── 琉球キネシ 管理シートからタスクを取得 ──────────
async function fetchRyukyuTasks() {
  if (!config.ryukyu) return [];
  const sheets = getSheetsClient();
  const cfg = config.ryukyu;

  const range = `${cfg.sheetName}!A${cfg.startRow}:D500`;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheetId,
      range,
    });
    const rows = res.data.values || [];
    const tasks = [];

    rows.forEach((row, i) => {
      const name = row[cfg.cols.taskName] ? String(row[cfg.cols.taskName]).trim() : null;
      if (!name) return;

      const deadline = parseDate(row[cfg.cols.deadline]);
      if (!deadline) return; // 期限がない行はスキップ

      const cat = guessCategory(name);
      const type = guessType(name);

      tasks.push({
        id:        `ryukyu_${i + 1}`,
        name,
        sub:       '琉球キネシ',
        type,
        cat,
        dot:       DOT_COLORS[cat] || '#94a3b8',
        mkSubmit:  deadline,
        draftDate: deadline,
        publicDate: deadline,
        source:    'ryukyu',
      });
    });

    console.log(`  → 琉球キネシ: ${tasks.length}件取得`);
    return tasks;
  } catch (e) {
    console.warn('  ⚠️  琉球キネシシート取得失敗（スキップ）:', e.message);
    return [];
  }
}

// ── メイン取得関数 ────────────────────────────────
async function fetchAllData() {
  const [tasks, ryukyuTasks, holidays] = await Promise.all([
    fetchTasks(),
    fetchRyukyuTasks(),
    fetchHolidays(),
  ]);
  const allTasks = [...tasks, ...ryukyuTasks];
  return { tasks: allTasks, holidays };
}

// 依存モジュールで使う addBD の仮宣言（循環参照回避）
function addBD(date, n) {
  let d2 = new Date(date);
  let i = 0;
  while (i < n) {
    d2.setDate(d2.getDate() + 1);
    if (d2.getDay() !== 0 && d2.getDay() !== 6) i++;
  }
  return d2;
}

module.exports = { fetchAllData, parseDate };
