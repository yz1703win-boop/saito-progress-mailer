// =====================================================
// 営業日計算・スケジュール逆算モジュール
// =====================================================

// ── 祝日リスト（日本・2026年）────────────────────
const JP_HOLIDAYS_2026 = [
  '2026-01-01', // 元日
  '2026-01-12', // 成人の日
  '2026-02-11', // 建国記念の日
  '2026-02-23', // 天皇誕生日
  '2026-03-20', // 春分の日
  '2026-04-29', // 昭和の日
  '2026-05-03', // 憲法記念日
  '2026-05-04', // みどりの日
  '2026-05-05', // こどもの日
  '2026-05-06', // 振替休日
  '2026-07-20', // 海の日
  '2026-08-11', // 山の日
  '2026-09-21', // 敬老の日
  '2026-09-23', // 秋分の日
  '2026-10-12', // スポーツの日
  '2026-11-03', // 文化の日
  '2026-11-23', // 勤労感謝の日
].map(s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
});

// ── 営業日判定 ────────────────────────────────────
// extraHolidays: 勤怠表から取得した追加休日（Date[]）
function isBusinessDay(date, extraHolidays = []) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // 土日

  const ts = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (JP_HOLIDAYS_2026.includes(ts)) return false; // 祝日

  if (extraHolidays.some(h => {
    const ht = new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime();
    return ht === ts;
  })) return false;

  return true;
}

// ── n営業日後 ─────────────────────────────────────
function addBD(date, n, extraHolidays = []) {
  let d2 = new Date(date);
  d2.setHours(0, 0, 0, 0);
  let i = 0;
  while (i < n) {
    d2.setDate(d2.getDate() + 1);
    if (isBusinessDay(d2, extraHolidays)) i++;
  }
  return d2;
}

// ── n営業日前 ─────────────────────────────────────
function subBD(date, n, extraHolidays = []) {
  let d2 = new Date(date);
  d2.setHours(0, 0, 0, 0);
  let i = 0;
  while (i < n) {
    d2.setDate(d2.getDate() - 1);
    if (isBusinessDay(d2, extraHolidays)) i++;
  }
  return d2;
}

// ── 1.5営業日前（最終調整用）────────────────────
// 1.5BDは「1営業日前の午後」なので 実質2営業日前として扱う
function subBD1_5(date, extraHolidays = []) {
  return subBD(date, 2, extraHolidays);
}

// ── タスクの全スケジュールを計算 ─────────────────
// マーケ制作ルール（mkSubmitから逆算）:
//   1.5BD → 最終調整(終) → FB3 → 修正稿2(修) → FB2 → 修正稿1(修) → FB1 → 初稿3BD(初)
//
// クリエイタールール（mkSubmitから順算）:
//   初稿(3BD) → 初稿FB(1BD) → 2稿(1BD) → 2稿FB(1BD) → 3稿(1BD) → 3稿FB(1BD) → 最終調整 → 入稿
function calcFullSchedule(task, extraHolidays = []) {
  const sub = task.mkSubmit;   // X列: クリエイターへの入稿日
  const drf = task.draftDate;  // BD列: クリエイターからの初稿日
  const pub = task.publicDate; // 推算公開日

  // ── マーケ行（mkSubmitから逆算）────────────────
  // 最後のFBからクリエイター入稿まで1.5BD（= 2BD として計算）
  const mkFinalStart = subBD(sub, 2, extraHolidays);      // 最終調整開始（終）
  const mkFb3        = subBD(mkFinalStart, 1, extraHolidays); // 3稿FB（FB）
  const mkRev3       = subBD(mkFb3, 1, extraHolidays);    // 修正稿2（修）
  const mkFb2        = subBD(mkRev3, 1, extraHolidays);   // 2稿FB（FB）
  const mkRev2       = subBD(mkFb2, 1, extraHolidays);    // 修正稿1（修）
  const mkFb1        = subBD(mkRev2, 1, extraHolidays);   // 初稿FB（FB）
  const mkWorkEnd    = subBD(mkFb1, 1, extraHolidays);    // 初稿最終日（初の最終日）
  const mkWorkStart  = subBD(mkFb1, 3, extraHolidays);    // 初稿開始日（3BD）

  // ── クリエイター行（mkSubmitから順算）──────────
  const prdFb1  = addBD(drf, 1, extraHolidays);
  const prdRev2 = addBD(prdFb1, 1, extraHolidays);
  const prdFb2  = addBD(prdRev2, 1, extraHolidays);
  const prdRev3 = addBD(prdFb2, 1, extraHolidays);
  const prdFb3  = addBD(prdRev3, 1, extraHolidays);
  const prdFinalStart = addBD(prdFb3, 1, extraHolidays);
  const prdFinalEnd   = new Date(pub.getTime() - 86400000);

  return {
    // マーケ行
    mkWorkStart,   // 初稿開始
    mkWorkEnd,     // 初稿終了（FB前日）
    mkFb1,         // 初稿FB
    mkRev2,        // 修正稿1
    mkFb2,         // 2稿FB
    mkRev3,        // 修正稿2
    mkFb3,         // 3稿FB（最後）
    mkFinalStart,  // 最終調整開始
    mkSubmit: sub, // クリエイターへの入稿

    // クリエイター行
    draftStart: sub,
    draftEnd:   drf,
    prdFb1,
    prdRev2,
    prdFb2,
    prdRev3,
    prdFb3,
    prdFinalStart,
    prdFinalEnd,
    publicDate: pub,
  };
}

// ── 今日やるべきタスクを判定 ────────────────────
function getTodayActions(tasks, extraHolidays = []) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const actions = [];

  tasks.forEach(task => {
    const sched = calcFullSchedule(task, extraHolidays);

    const checkDate = (date, label) => {
      if (!date) return;
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      if (d.getTime() === todayTs) actions.push({ task, label, date });
    };

    checkDate(sched.mkWorkStart,  '初稿作成スタート');
    checkDate(sched.mkFb1,        '初稿FB（上長に回す）');
    checkDate(sched.mkRev2,       '修正稿1 提出');
    checkDate(sched.mkFb2,        '2稿FB（上長に回す）');
    checkDate(sched.mkRev3,       '修正稿2 提出');
    checkDate(sched.mkFb3,        '最終FB（上長に回す）');
    checkDate(sched.mkFinalStart, '最終稿 仕上げ');
    checkDate(sched.mkSubmit,     'クリエイターへ提出');
    checkDate(sched.prdFb1,       '初稿FB締切');
    checkDate(sched.prdFb2,       '2稿FB締切');
    checkDate(sched.prdFb3,       '3稿FB締切');
  });

  return actions;
}

// ── 日付フォーマット ─────────────────────────────
function fmt(date) {
  if (!date) return '';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function fmtFull(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

module.exports = {
  isBusinessDay,
  addBD,
  subBD,
  subBD1_5,
  calcFullSchedule,
  getTodayActions,
  fmt,
  fmtFull,
};
