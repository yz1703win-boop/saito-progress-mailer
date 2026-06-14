// =====================================================
// HTMLダッシュボード生成モジュール
// 既存 index.html のデザインを継承し、タスクデータを動的注入
// =====================================================

const { calcFullSchedule, getTodayActions, fmt, fmtFull, fmtWithTime, addBD } = require('./calcSchedule');
const config = require('./config');

const CAT_COLORS = {
  'DM・印刷物': { bg:'#fef2f2', text:'#991b1b', border:'#fca5a5' },
  'オプトイン':  { bg:'#fff7ed', text:'#9a3412', border:'#fdba74' },
  'レター・BE': { bg:'#f5f3ff', text:'#5b21b6', border:'#c4b5fd' },
  '動画':        { bg:'#f0fdf4', text:'#065f46', border:'#6ee7b7' },
  'その他':      { bg:'#f1f5f9', text:'#475569', border:'#cbd5e1' },
};

const CAT_ORDER = ['DM・印刷物', 'オプトイン', 'レター・BE', '動画', 'その他'];

// ── 猫SVGイラスト ─────────────────────────────────
const CAT_SVG = `<svg viewBox="0 0 64 72" width="44" height="50" style="flex-shrink:0;">
  <ellipse cx="32" cy="64" rx="20" ry="9" fill="#f5f0ec"/>
  <path d="M14,58 Q20,52 32,54 Q44,52 50,58 Q44,65 32,67 Q20,65 14,58Z" fill="#fffdf8"/>
  <path d="M10,47 Q8,34 15,25 Q22,14 32,13 Q42,14 49,25 Q56,34 54,47 Q51,58 45,62 Q38,66 32,66 Q26,66 19,62 Q13,58 10,47Z" fill="#d0c5ae"/>
  <ellipse cx="21" cy="37" rx="9" ry="8" fill="#c97828" opacity="0.72"/>
  <path d="M9,47 Q13,41 21,45 Q19,53 13,53 Q9,51 9,47Z" fill="#c97828" opacity="0.58"/>
  <ellipse cx="43" cy="34" rx="7" ry="6" fill="#8a8a8a" opacity="0.4"/>
  <polygon points="11,34 3,11 23,26" fill="#d0c5ae"/>
  <polygon points="13,33 7,15 23,28" fill="#e8a0b0" opacity="0.5"/>
  <polygon points="53,34 61,11 41,26" fill="#d0c5ae"/>
  <polygon points="51,33 57,15 41,28" fill="#e8a0b0" opacity="0.5"/>
  <ellipse cx="23" cy="44" rx="7" ry="6.5" fill="#2e6e24"/>
  <ellipse cx="41" cy="44" rx="7" ry="6.5" fill="#2e6e24"/>
  <ellipse cx="23" cy="44" rx="2.5" ry="5.5" fill="#0d0d0d"/>
  <ellipse cx="41" cy="44" rx="2.5" ry="5.5" fill="#0d0d0d"/>
  <ellipse cx="25" cy="41" rx="1.8" ry="1.3" fill="white" opacity="0.9"/>
  <ellipse cx="43" cy="41" rx="1.8" ry="1.3" fill="white" opacity="0.9"/>
  <path d="M29.5,52 L32,55.5 L34.5,52 Q32,50 29.5,52Z" fill="#e06070"/>
  <path d="M29,56 Q32,60 35,56" stroke="#b04858" stroke-width="0.9" fill="none"/>
  <line x1="1" y1="50" x2="24" y2="52" stroke="#c0b8a4" stroke-width="0.6" opacity="0.75"/>
  <line x1="1" y1="54" x2="24" y2="55" stroke="#c0b8a4" stroke-width="0.6" opacity="0.75"/>
  <line x1="40" y1="52" x2="63" y2="50" stroke="#c0b8a4" stroke-width="0.6" opacity="0.75"/>
  <line x1="40" y1="55" x2="63" y2="54" stroke="#c0b8a4" stroke-width="0.6" opacity="0.75"/>
</svg>`;

// ── 緊急度スタイル ────────────────────────────────
function urgencyStyle(days) {
  if (days < 0)  return { border:'#dc2626', bg:'#fef2f2', badge:'#dc2626', badgeBg:'#fee2e2', label:'期限超過' };
  if (days === 0) return { border:'#dc2626', bg:'#fff1f2', badge:'#dc2626', badgeBg:'#fee2e2', label:'本日！' };
  if (days <= 3)  return { border:'#ef4444', bg:'#fff5f5', badge:'#ef4444', badgeBg:'#fee2e2', label:`残${days}日` };
  if (days <= 7)  return { border:'#f97316', bg:'#fff7f0', badge:'#f97316', badgeBg:'#ffedd5', label:`残${days}日` };
  if (days <= 14) return { border:'#f59e0b', bg:'#fffbf0', badge:'#b45309', badgeBg:'#fef3c7', label:`残${days}日` };
  return           { border:'#94a3b8', bg:'white',   badge:'#64748b', badgeBg:'#f1f5f9', label:`残${days}日` };
}

// ── タスクカードHTML ──────────────────────────────
function taskCardHtml(task, dateToShow, days) {
  const s  = urgencyStyle(days);
  const cc = CAT_COLORS[task.cat] || CAT_COLORS['その他'];
  return `<div style="display:flex;align-items:center;gap:10px;background:${s.bg};border-radius:12px;padding:8px 11px;box-shadow:0 1px 3px rgba(0,0,0,0.07);border-left:3px solid ${s.border};flex-shrink:0;">
    <span style="width:7px;height:7px;border-radius:50%;background:${task.dot};flex-shrink:0;"></span>
    <div style="flex:1;min-width:0;">
      <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(task.name)}</div>
      <span style="font-size:7px;background:${cc.bg};color:${cc.text};border:1px solid ${cc.border};border-radius:3px;padding:0 3px;">${escHtml(task.cat)}</span>
    </div>
    ${task.sub ? `<span style="font-size:9px;color:#64748b;flex-shrink:0;">${escHtml(task.sub)}</span>` : ''}
    <span style="font-size:11px;font-weight:700;color:${s.badge};flex-shrink:0;">${fmtWithTime(dateToShow, task.time)}</span>
    <span style="font-size:8px;font-weight:700;padding:2px 5px;border-radius:999px;background:${s.badgeBg};color:${s.badge};flex-shrink:0;">${s.label}</span>
  </div>`;
}

// ── ガントチャートHTML生成 ────────────────────────
function buildGanttHtml(tasks, extraHolidays, today) {
  const GANTT_START = new Date(today); GANTT_START.setDate(GANTT_START.getDate() - 14);
  const GANTT_END   = new Date(config.dashboard.ganttEndDate);
  const CELL_W = 20;

  function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }
  function ganttIdx(date) {
    const d2 = new Date(date); d2.setHours(0,0,0,0);
    return Math.round((d2 - GANTT_START) / 86400000);
  }
  const TODAY_IDX  = ganttIdx(today);
  const TOTAL_DAYS = ganttIdx(GANTT_END) + 1;

  const PH = {
    // マーケ行フェーズ（初/FB/修/FB/修/FB/終/提）
    mk_init:  { lbl:'初', bg:'#7c3aed' },  // 初稿作成
    mk_fb1:   { lbl:'FB', bg:'#db2777' },  // 初稿FB
    mk_rev2:  { lbl:'修', bg:'#9333ea' },  // 修正稿1
    mk_fb2:   { lbl:'FB', bg:'#db2777' },  // 2稿FB
    mk_rev3:  { lbl:'修', bg:'#9333ea' },  // 修正稿2
    mk_fb3:   { lbl:'FB', bg:'#db2777' },  // 最終FB
    mk_final: { lbl:'終', bg:'#6d28d9' },  // 最終調整
    mk_sub:   { lbl:'提', bg:'#4c1d95', border:'#f9a8d4' }, // クリエイター提出
    // クリエイター行フェーズ
    init:   { lbl:'初', bg:'#2563eb' },
    fb1:    { lbl:'FB', bg:'#4338ca' },
    rev2:   { lbl:'2',  bg:'#0284c7' },
    fb2:    { lbl:'FB', bg:'#6d28d9' },
    rev3:   { lbl:'3',  bg:'#047857' },
    fb3:    { lbl:'FB', bg:'#b45309' },
    final:  { lbl:'終', bg:'#c2410c' },
    submit: { lbl:'入', bg:'#b91c1c' },
  };

  function markRange(ph, start, end, key) {
    let s = ganttIdx(start), e = ganttIdx(end);
    for (let i = Math.max(s, 0); i <= Math.min(e, TOTAL_DAYS - 1); i++) {
      if (!ph[i]) ph[i] = key;
    }
  }
  function markDay(ph, idx, key) {
    if (idx >= 0 && idx < TOTAL_DAYS) ph[idx] = key;
  }

  function calcPhases(task) {
    const mrk = {}, prd = {};
    const sched = calcFullSchedule(task, extraHolidays);

    // ── マーケ行（初/FB/修/FB/修/FB/終/提）────────
    markRange(mrk, sched.mkWorkStart, sched.mkWorkEnd, 'mk_init');  // 初稿（3BD）
    markDay(mrk, ganttIdx(sched.mkFb1),        'mk_fb1');   // 初稿FB
    markDay(mrk, ganttIdx(sched.mkRev2),        'mk_rev2');  // 修正稿1
    markDay(mrk, ganttIdx(sched.mkFb2),         'mk_fb2');   // 2稿FB
    markDay(mrk, ganttIdx(sched.mkRev3),        'mk_rev3');  // 修正稿2
    markDay(mrk, ganttIdx(sched.mkFb3),         'mk_fb3');   // 最終FB
    markRange(mrk, sched.mkFinalStart, new Date(sched.mkSubmit.getTime() - 86400000), 'mk_final'); // 最終調整
    markDay(mrk, ganttIdx(sched.mkSubmit),      'mk_sub');   // 提出

    // ── クリエイター行 ────────────────────────────
    const ed = task.explicitDates;
    if (ed && ed.draftSubmit) {
      // シートに実際の稿日程がある場合はそれを使用
      const nextDay = d => new Date(d.getTime() + 86400000);
      markRange(prd, task.mkSubmit, ed.draftSubmit, 'init');             // 初稿制作
      if (ed.draftFb)    markDay(prd, ganttIdx(ed.draftFb), 'fb1');      // 初稿FB
      if (ed.draftFb && ed.rev2Submit)
        markRange(prd, nextDay(ed.draftFb), ed.rev2Submit, 'rev2');      // ２稿制作
      if (ed.rev2Fb)     markDay(prd, ganttIdx(ed.rev2Fb), 'fb2');       // ２稿FB
      if (ed.rev2Fb && ed.rev3Submit)
        markRange(prd, nextDay(ed.rev2Fb), ed.rev3Submit, 'rev3');       // ３稿制作
      if (ed.rev3Fb)     markDay(prd, ganttIdx(ed.rev3Fb), 'fb3');       // ３稿FB
      // ４稿以降は 'final' で表示
      const finalEnd = ed.rev4Submit || ed.delivery;
      const finalStart = ed.rev3Fb ? nextDay(ed.rev3Fb) : (ed.rev3Submit ? nextDay(ed.rev3Submit) : null);
      if (finalStart && finalEnd && finalStart <= finalEnd)
        markRange(prd, finalStart, finalEnd, 'final');
      // 公開/納品日
      const submitDate = ed.publicActual || ed.delivery || ed.rev4Submit;
      if (submitDate) markDay(prd, ganttIdx(submitDate), 'submit');
    } else {
      // 既存の計算スケジュール
      markRange(prd, sched.draftStart, sched.draftEnd, 'init');
      markDay(prd, ganttIdx(sched.prdFb1),  'fb1');
      markDay(prd, ganttIdx(sched.prdRev2), 'rev2');
      markDay(prd, ganttIdx(sched.prdFb2),  'fb2');
      markDay(prd, ganttIdx(sched.prdRev3), 'rev3');
      markDay(prd, ganttIdx(sched.prdFb3),  'fb3');
      if (sched.prdFinalStart <= sched.prdFinalEnd) {
        markRange(prd, sched.prdFinalStart, sched.prdFinalEnd, 'final');
      }
      markDay(prd, ganttIdx(sched.publicDate), 'submit');
    }

    return { mrk, prd, sched };
  }

  // ── 月ヘッダー ──
  // <thead>タグ自体にposition:stickyを指定するのが最も確実（各<th>指定は環境依存）
  const ROW_H = 14; // 各ヘッダー行の高さ(px)
  let html = '<table style="border-collapse:collapse;table-layout:fixed;" id="gantt-table"><thead style="position:sticky;top:0;z-index:12;"><tr>';
  html += `<th style="position:sticky;left:0;z-index:13;background:#f1f5f9;min-width:90px;max-width:90px;padding:0 4px;text-align:left;border:1px solid #e2e8f0;border-right:2px solid #cbd5e1;font-size:8px;color:#64748b;height:${ROW_H}px;" rowspan="2">タスク</th>`;

  let cur = new Date(GANTT_START), prevM = -1, mSpan = 0, mCells = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const m = cur.getMonth();
    if (m !== prevM) { if (mSpan > 0) mCells.push([`${prevM+1}月`, mSpan]); prevM = m; mSpan = 1; }
    else mSpan++;
    cur.setDate(cur.getDate() + 1);
  }
  mCells.push([`${prevM+1}月`, mSpan]);
  mCells.forEach(([lbl, span]) => {
    html += `<th colspan="${span}" style="width:${CELL_W}px;min-width:${CELL_W}px;background:#dbeafe;color:#1d4ed8;font-size:8px;font-weight:700;height:${ROW_H}px;border:1px solid #e2e8f0;text-align:center;">${lbl}</th>`;
  });
  html += '</tr><tr>';

  cur = new Date(GANTT_START);
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const isWE = isWeekend(cur), isT = i === TODAY_IDX;
    const bg = isT ? 'rgba(37,99,235,0.15)' : isWE ? '#f8fafc' : 'white';
    const color = isT ? '#1d4ed8' : '#475569';
    const fw = isT ? '700' : '400';
    html += `<th style="width:${CELL_W}px;min-width:${CELL_W}px;height:${ROW_H}px;font-size:7px;border:1px solid #e2e8f0;text-align:center;background:${bg};color:${color};font-weight:${fw};">${cur.getDate()}</th>`;
    cur.setDate(cur.getDate() + 1);
  }
  html += '</tr></thead><tbody>';

  // ── タスク行 ──
  const popupDataList = [];
  CAT_ORDER.forEach(cat => {
    const catTasks = tasks.filter(t => t.cat === cat);
    if (catTasks.length === 0) return;

    const cc = CAT_COLORS[cat] || CAT_COLORS['その他'];
    html += `<tr><td style="position:sticky;left:0;z-index:10;background:${cc.bg};color:${cc.text};border:1px solid #e2e8f0;border-right:2px solid ${cc.border};padding:2px 6px;font-size:8px;font-weight:700;text-align:left;">${escHtml(cat)}</td>`;
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d2 = new Date(GANTT_START.getTime() + i * 86400000);
      const isWE = isWeekend(d2), isT = i === TODAY_IDX;
      const bg = isT ? 'rgba(37,99,235,0.05)' : isWE ? '#f8fafc' : cc.bg;
      html += `<td style="width:${CELL_W}px;min-width:${CELL_W}px;height:13px;border:1px solid #e2e8f0;background:${bg};"></td>`;
    }
    html += '</tr>';

    catTasks.forEach((task, ti) => {
      const { mrk, prd, sched } = calcPhases(task);
      const popupIdx = popupDataList.length;
      const ccPopup = CAT_COLORS[task.cat] || CAT_COLORS['その他'];
      popupDataList.push({
        name: task.name,
        sub: task.sub || '',
        cat: task.cat,
        dot: task.dot,
        mkSubmit: sched.mkSubmit ? fmt(sched.mkSubmit) : '',
        publicDate: (task.explicitDates && task.explicitDates.publicActual)
          ? fmt(task.explicitDates.publicActual)
          : (task.explicitDates && task.explicitDates.delivery)
            ? fmt(task.explicitDates.delivery)
            : (sched.publicDate ? fmt(sched.publicDate) : ''),
        catBg: ccPopup.bg,
        catText: ccPopup.text,
        catBorder: ccPopup.border,
      });
      // タスク毎に背景色を交互に変えて視認性アップ
      const rowBg     = ti % 2 === 0 ? '#ffffff' : '#eef4ff';
      const rowBgCell = ti % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(238,244,255,0.6)';
      const prdLabel = task.type === 'vid' ? '動画' : 'デザイン';
      const prdColor = task.type === 'vid' ? '#065f46' : '#1d4ed8';
      const prdBg    = task.type === 'vid' ? '#f0fdf4' : '#eff6ff';

      // マーケ行
      html += `<tr style="background:${rowBg};">
        <td style="position:sticky;left:0;z-index:10;background:${rowBg};min-height:42px;vertical-align:middle;border:1px solid #e2e8f0;border-right:2px solid #cbd5e1;border-top:2px solid #cbd5e1;padding:0 4px;cursor:pointer;-webkit-tap-highlight-color:rgba(37,99,235,0.08);" rowspan="2" onclick="showGanttPopup(${popupIdx})">
          <div style="display:flex;align-items:flex-start;gap:3px;padding:2px 0;">
            <span style="width:3px;min-height:34px;border-radius:2px;background:${task.dot};flex-shrink:0;align-self:stretch;"></span>
            <div style="min-width:0;flex:1;">
              <div style="font-size:7.5px;font-weight:700;color:#1e293b;overflow-wrap:break-word;word-break:break-all;line-height:1.4;">${escHtml(task.name)}</div>
              <div style="font-size:6.5px;color:#94a3b8;margin-bottom:1px;overflow-wrap:break-word;word-break:break-all;">${escHtml(task.sub || '')}${task.time ? ` · ${escHtml(task.time)}` : ''}</div>
              <div style="display:flex;gap:2px;flex-wrap:wrap;">
                <span style="font-size:6px;background:#ede9fe;color:#6d28d9;border-radius:2px;padding:0 3px;line-height:1.5;">マーケ</span>
                <span style="font-size:6px;background:${prdBg};color:${prdColor};border-radius:2px;padding:0 3px;line-height:1.5;">${prdLabel}</span>
              </div>
            </div>
          </div>
        </td>`;
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const d2 = new Date(GANTT_START.getTime() + i * 86400000);
        const isWE = isWeekend(d2), isT = i === TODAY_IDX;
        const ph = mrk[i];
        const bg = ph ? PH[ph].bg : isWE ? '#e8f0fa' : isT ? 'rgba(37,99,235,0.08)' : rowBgCell;
        const content = ph ? `<span style="font-size:5.5px;color:rgba(255,255,255,0.95);">${PH[ph].lbl}</span>` : '';
        html += `<td style="width:${CELL_W}px;min-width:${CELL_W}px;height:21px;border:1px solid #e2e8f0;background:${bg};text-align:center;vertical-align:middle;">${content}</td>`;
      }
      html += '</tr><tr style="background:' + rowBg + ';">';
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const d2 = new Date(GANTT_START.getTime() + i * 86400000);
        const isWE = isWeekend(d2), isT = i === TODAY_IDX;
        const ph = prd[i];
        const bg = ph ? PH[ph].bg : isWE ? '#e8f0fa' : isT ? 'rgba(37,99,235,0.08)' : rowBgCell;
        const content = ph ? `<span style="font-size:5.5px;color:rgba(255,255,255,0.95);">${PH[ph].lbl}</span>` : '';
        html += `<td style="width:${CELL_W}px;min-width:${CELL_W}px;height:21px;border:1px solid #e2e8f0;border-bottom:2px solid #cbd5e1;background:${bg};text-align:center;vertical-align:middle;">${content}</td>`;
      }
      html += '</tr>';
    });
  });

  html += '</tbody></table>';
  return { html, popupDataList };
}

// ── HTMLエスケープ ────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── メインHTML生成 ────────────────────────────────
function generateDashboard(tasks, holidays = []) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const twoWeekEnd  = new Date(today); twoWeekEnd.setDate(twoWeekEnd.getDate() + 14);
  const threeDayEnd = new Date(today); threeDayEnd.setDate(threeDayEnd.getDate() + 7);

  function daysUntil(date) {
    return Math.ceil((date - today) / 86400000);
  }

  // 2週間以内に入稿を迎えるタスク（mkSubmit基準）
  const twoW = tasks
    .filter(t => t.mkSubmit && daysUntil(t.mkSubmit) <= 14)
    .sort((a, b) => a.mkSubmit - b.mkSubmit);

  // 7日以内に初稿が上がるタスク（draftDate基準）
  const threeD = tasks
    .filter(t => t.draftDate && daysUntil(t.draftDate) <= 7 && daysUntil(t.draftDate) >= 0)
    .sort((a, b) => a.draftDate - b.draftDate);

  // 今日のアクション
  const todayActions = getTodayActions(tasks, holidays);

  // 猫コメント生成
  let catTitle = '🐱 今日の優先アクション';
  let catMsg;
  if (todayActions.length > 0) {
    const lines = todayActions.slice(0, 4).map(a =>
      `✦ 【${escHtml(a.label)}】${escHtml(a.task.name)}`
    ).join('<br>');
    catMsg = `<span style="color:#dc2626;font-weight:700;">今日${todayActions.length}件！</span>着手が必要にゃ！<br>${lines}`;
  } else if (twoW.filter(t => daysUntil(t.mkSubmit) <= 7).length > 0) {
    const urgents = twoW.filter(t => daysUntil(t.mkSubmit) <= 7);
    const lines = urgents.slice(0, 3).map(t =>
      `✦ ${escHtml(t.name)}（${fmtWithTime(t.mkSubmit, t.time)}入稿）`
    ).join('<br>');
    catMsg = `<span style="color:#d97706;font-weight:700;">急ぎ${urgents.length}件！</span>原稿作成・上長FBを済ませて提出にゃ！<br>${lines}`;
  } else {
    const next = [...tasks].sort((a, b) => a.mkSubmit - b.mkSubmit).find(t => daysUntil(t.mkSubmit) > 0);
    catTitle = '🐱 次の入稿に向けて準備を！';
    catMsg = `今は余裕があるにゃ！でも<span style="color:#d97706;font-weight:700;">${next ? fmtWithTime(next.mkSubmit, next.time) + 'の' + escHtml(next.name) : '次のタスク'}</span>に向けて原稿準備を進めておくと安心にゃ！`;
  }

  // 2週間リストHTML
  let twoWeekListHtml;
  if (twoW.length === 0) {
    const next = [...tasks].sort((a, b) => a.mkSubmit - b.mkSubmit)[0];
    twoWeekListHtml = `<div style="display:flex;align-items:center;gap:9px;background:white;border:1px dashed #cbd5e1;border-radius:11px;padding:10px 12px;">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      <div>
        <div style="font-size:11px;font-weight:600;color:#64748b;">現在該当なし</div>
        <div style="font-size:9px;color:#94a3b8;">次の入稿: ${next ? fmtWithTime(next.mkSubmit, next.time) + '（' + escHtml(next.name) + '）' : 'なし'}</div>
      </div></div>`;
  } else {
    twoWeekListHtml = twoW.map(t => taskCardHtml(t, t.mkSubmit, daysUntil(t.mkSubmit))).join('');
  }

  // 3日以内初稿リストHTML
  let threeDayListHtml;
  if (threeD.length === 0) {
    threeDayListHtml = `<div style="display:flex;align-items:center;gap:9px;background:#f0fdf4;border:1px dashed #86efac;border-radius:10px;padding:9px 12px;">
      <div style="width:24px;height:24px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#16a34a" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;color:#15803d;">該当なし</div>
        <div style="font-size:9px;color:#4ade80;">7日以内に初稿提出予定ゼロ</div>
      </div></div>`;
  } else {
    threeDayListHtml = threeD.map(t => `<div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border-radius:12px;padding:8px 11px;box-shadow:0 1px 3px rgba(0,0,0,0.07);border-left:3px solid #16a34a;margin-bottom:4px;">
      <span style="width:7px;height:7px;border-radius:50%;background:${t.dot};flex-shrink:0;"></span>
      <span style="flex:1;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(t.name)}</span>
      ${t.sub ? `<span style="font-size:9px;color:#64748b;">${escHtml(t.sub)}</span>` : ''}
      <span style="font-size:11px;font-weight:700;color:#16a34a;margin:0 4px;">${fmtWithTime(t.draftDate, t.time)}</span>
      <span style="font-size:8px;font-weight:700;padding:2px 5px;border-radius:999px;background:#dcfce7;color:#16a34a;border:1px solid #86efac;">残${daysUntil(t.draftDate)}日</span>
    </div>`).join('');
  }

  // ガントチャート
  const { html: ganttHtml, popupDataList } = buildGanttHtml(tasks, holidays, today);

  // 今日のガントインデックス（スクロール位置用）
  const GANTT_START_FOR_JS = new Date(today); GANTT_START_FOR_JS.setDate(GANTT_START_FOR_JS.getDate() - 14);
  const todayIdxForJs = Math.round((today - GANTT_START_FOR_JS) / 86400000);
  const todayDateStr = fmtFull(today).replace(/\//g, '-');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>進捗レポート｜${escHtml(config.dashboard.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: 'Noto Sans JP', sans-serif;
      background: #f0f4f8;
      color: #1e293b;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .tab-panel { display: none; flex: 1; flex-direction: column; overflow: hidden; }
    .tab-panel.active { display: flex; }
    .gantt-wrap { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; }
    .bubble-ptr {
      position: absolute; left: -7px; top: 50%; transform: translateY(-50%);
      border: 7px solid transparent; border-right-color: #e2e8f0;
    }
    .bubble-ptr::after {
      content: ''; position: absolute; left: 2px; top: -6px;
      border: 6px solid transparent; border-right-color: white;
    }
    #png-canvas-wrap { overflow: auto; flex: 1; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</head>
<body>

<!-- ════════ HEADER ════════ -->
<header style="background:white;border-bottom:1px solid #e2e8f0;padding:9px 14px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
  <div style="display:flex;align-items:center;gap:9px;min-width:0;">
    <div style="width:30px;height:30px;border-radius:7px;background:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
    </div>
    <div style="min-width:0;">
      <div style="font-size:9px;color:#94a3b8;">プロジェクト進捗レポート</div>
      <div style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">${escHtml(config.dashboard.title)}</div>
    </div>
  </div>
  <div style="text-align:right;flex-shrink:0;">
    <div style="font-size:9px;color:#94a3b8;">生成日</div>
    <div style="font-size:11px;font-weight:600;color:#334155;">${fmtFull(today)}</div>
  </div>
</header>

<!-- ════════ TAB NAV ════════ -->
<div style="background:white;border-bottom:2px solid #e2e8f0;display:flex;flex-shrink:0;">
  <button id="btn1" onclick="showTab(1)" style="flex:1;padding:8px 4px;font-size:10px;font-weight:600;color:#2563eb;background:none;border:none;border-bottom:2px solid #2563eb;margin-bottom:-2px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
    進捗サマリー
  </button>
  <button id="btn2" onclick="showTab(2)" style="flex:1;padding:8px 4px;font-size:10px;font-weight:600;color:#94a3b8;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ガントチャート
  </button>
  <button id="btn3" onclick="showTab(3)" style="flex:1;padding:8px 4px;font-size:10px;font-weight:600;color:#94a3b8;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;">
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 20M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
    PNG保存
  </button>
</div>

<!-- ══════════════ TAB 1 ══════════════ -->
<div id="tab1" class="tab-panel active" style="background:#f0f4f8;overflow-y:auto;-webkit-overflow-scrolling:touch;">
  <div style="padding:9px 13px;display:flex;flex-direction:column;gap:7px;">

  <!-- 2週間以内 -->
  <section>
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#d97706" stroke-width="2.3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <span style="font-size:11px;font-weight:700;color:#1e293b;">2週間以内に入稿を迎えるタスク</span>
      <span style="margin-left:auto;font-size:9px;color:#94a3b8;flex-shrink:0;">〜 ${fmt(twoWeekEnd)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;">${twoWeekListHtml}</div>
  </section>

  <div style="height:1px;background:#e2e8f0;"></div>

  <!-- 3日以内初稿 -->
  <section>
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#16a34a" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      </div>
      <span style="font-size:11px;font-weight:700;color:#1e293b;">7日以内に初稿が上がるタスク</span>
      <span style="margin-left:auto;font-size:9px;color:#94a3b8;flex-shrink:0;">〜 ${fmt(threeDayEnd)}</span>
    </div>
    <div>${threeDayListHtml}</div>
  </section>

  <div style="height:1px;background:#e2e8f0;"></div>

  <!-- 猫コメント -->
  <div style="display:flex;align-items:center;gap:9px;padding:7px 10px;background:white;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    ${CAT_SVG}
    <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 9px;position:relative;">
      <div class="bubble-ptr"></div>
      <div style="font-size:9px;color:#d97706;font-weight:700;margin-bottom:3px;">${catTitle}</div>
      <div style="font-size:9px;color:#334155;line-height:1.6;">${catMsg}</div>
    </div>
  </div>

  </div>
</div>

<!-- ══════════════ TAB 2 ══════════════ -->
<div id="tab2" class="tab-panel" style="background:#f0f4f8;">
  <div style="flex-shrink:0;padding:5px 10px;border-bottom:1px solid #e2e8f0;background:white;display:flex;flex-wrap:wrap;gap:5px;align-items:center;">
    <span style="font-size:8px;color:#7c3aed;font-weight:700;">マーケ行：</span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#7c3aed;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">初（初稿3BD）</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#db2777;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">FB（上長FB）</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#9333ea;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">修（修正稿）</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#6d28d9;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">終（最終調整）</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#4c1d95;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">提（提出）</span></span>
    <span style="font-size:8px;color:#2563eb;margin-left:4px;font-weight:700;">制作行：</span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#2563eb;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">初稿</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#4338ca;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">初稿FB</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#0284c7;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">2稿</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#6d28d9;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">2稿FB</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#047857;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">3稿</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#b45309;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">3稿FB</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#c2410c;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">最終調整</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:#b91c1c;display:inline-block;"></span><span style="font-size:7.5px;color:#475569;">入稿</span></span>
    <span style="display:flex;align-items:center;gap:2px;"><span style="width:9px;height:9px;border-radius:2px;background:rgba(37,99,235,0.2);border:1px solid #93c5fd;display:inline-block;"></span><span style="font-size:7.5px;color:#2563eb;">今日</span></span>
  </div>
  <div class="gantt-wrap" id="gantt-wrap" style="overflow:auto;flex:1;">
    ${ganttHtml}
  </div>
  <div style="flex-shrink:0;padding:4px 12px;border-top:1px solid #e2e8f0;background:white;">
    <span style="font-size:7.5px;color:#94a3b8;">制作ルール：マーケ原稿作成(3BD)→ 上長FB(1BD)→ デザイナー/動画へ提出 → 初稿(3BD)→ 初稿FB(1BD)→ 修正稿(1BD)→ FB(1BD)→ 3稿FB終了 → 最終調整(1.5BD)→ 入稿/公開</span>
  </div>
</div>

<!-- ════════ GANTT POPUP ════════ -->
<div id="gantt-overlay" onclick="closeGanttPopup()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9998;"></div>
<div id="gantt-popup" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:white;border-radius:20px 20px 0 0;padding:16px 16px 32px;box-shadow:0 -4px 24px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
  <div style="width:36px;height:4px;border-radius:2px;background:#e2e8f0;margin:0 auto 14px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
    <div id="popup-header" style="flex:1;min-width:0;padding-right:8px;"></div>
    <button onclick="closeGanttPopup()" style="flex-shrink:0;width:28px;height:28px;background:#f1f5f9;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#64748b" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  </div>
  <div id="popup-body"></div>
</div>

<!-- ══════════════ TAB 3 ══════════════ -->
<div id="tab3" class="tab-panel" style="background:#f0f4f8;">
  <div style="flex-shrink:0;padding:10px 14px;background:white;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:11px;font-weight:700;">進捗サマリー 画像</div>
      <div style="font-size:9px;color:#94a3b8;">スマホ保存・シェア用PNG</div>
    </div>
    <button onclick="downloadPng()" style="background:#2563eb;color:white;border:none;border-radius:8px;padding:7px 14px;font-size:10px;font-weight:700;cursor:pointer;">保存</button>
  </div>
  <div id="png-canvas-wrap">
    <div id="png-loading" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:30px;color:#94a3b8;">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="animation:spin 1s linear infinite;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      <span style="font-size:10px;">読み込み中…</span>
    </div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script>
const GANTT_TASKS = ${JSON.stringify(popupDataList)};

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function showGanttPopup(idx){
  const t = GANTT_TASKS[idx];
  document.getElementById('popup-header').innerHTML =
    '<div style="display:flex;align-items:flex-start;gap:8px;">' +
      '<span style="width:10px;height:10px;border-radius:50%;background:'+t.dot+';flex-shrink:0;margin-top:3px;"></span>' +
      '<div style="min-width:0;">' +
        '<div style="font-size:15px;font-weight:700;color:#1e293b;line-height:1.4;overflow-wrap:break-word;">' + esc(t.name) + '</div>' +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;">' +
          '<span style="font-size:9px;padding:1px 8px;border-radius:999px;background:'+t.catBg+';color:'+t.catText+';border:1px solid '+t.catBorder+';">' + esc(t.cat) + '</span>' +
          (t.sub ? '<span style="font-size:9px;color:#64748b;padding-top:1px;">' + esc(t.sub) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  document.getElementById('popup-body').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      '<div style="background:#fef3c7;border-radius:12px;padding:12px 14px;">' +
        '<div style="font-size:9px;color:#92400e;font-weight:700;margin-bottom:5px;">📅 入稿日</div>' +
        '<div style="font-size:15px;font-weight:800;color:#92400e;">' + (t.mkSubmit || '—') + '</div>' +
      '</div>' +
      '<div style="background:#dbeafe;border-radius:12px;padding:12px 14px;">' +
        '<div style="font-size:9px;color:#1d4ed8;font-weight:700;margin-bottom:5px;">🚀 納品/公開日</div>' +
        '<div style="font-size:15px;font-weight:800;color:#1d4ed8;">' + (t.publicDate || '—') + '</div>' +
      '</div>' +
    '</div>';
  document.getElementById('gantt-overlay').style.display = 'block';
  document.getElementById('gantt-popup').style.display = 'block';
}

function closeGanttPopup(){
  document.getElementById('gantt-overlay').style.display = 'none';
  document.getElementById('gantt-popup').style.display = 'none';
}

function showTab(n){
  [1,2,3].forEach(i=>{
    document.getElementById('tab'+i).classList.toggle('active',i===n);
    const btn=document.getElementById('btn'+i);
    btn.style.color=i===n?'#2563eb':'#94a3b8';
    btn.style.borderBottomColor=i===n?'#2563eb':'transparent';
  });
  if(n===3) buildPng();
  if(n===2){
    const wrap=document.getElementById('gantt-wrap');
    wrap.scrollLeft=90+${todayIdxForJs}*20-wrap.clientWidth/2;
  }
}

let pngBuilt=false;
function buildPng(){
  if(pngBuilt) return; pngBuilt=true;
  const loading=document.getElementById('png-loading');
  loading.style.display='flex';
  html2canvas(document.getElementById('tab1'),{scale:2,backgroundColor:'#f0f4f8',useCORS:true}).then(canvas=>{
    loading.style.display='none';
    canvas.style.cssText='max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);';
    document.getElementById('png-canvas-wrap').appendChild(canvas);
  }).catch(()=>{document.getElementById('png-loading').innerHTML='<span style="font-size:10px;color:#ef4444;">生成失敗</span>';});
}

function downloadPng(){
  const canvas=document.querySelector('#png-canvas-wrap canvas');
  if(!canvas){alert('先にPNGタブを開いてください');return;}
  const a=document.createElement('a');
  a.download='progress_${todayDateStr}.png';
  a.href=canvas.toDataURL('image/png');
  a.click();
}

// 初期スクロール位置（Tab2）
setTimeout(()=>{
  const wrap=document.getElementById('gantt-wrap');
  if(wrap) wrap.scrollLeft=90+${todayIdxForJs}*20-wrap.clientWidth/2;
},100);
</script>
</body>
</html>`;
}

module.exports = { generateDashboard };
