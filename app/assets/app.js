/* ============================================================
   PlanNote · 主界面
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 图标 ---------------- */
  const I = {
    day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3.2"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/><circle cx="12" cy="15.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
    week: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3.2"/><path d="M8 2.5v4M16 2.5v4M3 10h18M9.5 10v11M14.5 10v11"/></svg>',
    month: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3.2"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01M16.5 17.5h.01"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h10M18 17h2"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="17" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 19h16"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 19h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0012.5 3H6a2.5 2.5 0 00-2.5 2.5V12"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 3.4-1.2 4.8-2.4 6C8.3 9.4 7 10.8 7 13.2A5 5 0 0017 13.4c0-2.6-1.4-4.2-2.6-5.5C13.1 6.5 12.4 4.6 12 2z" opacity=".9"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h4l1.5 3h7L17 13h4"/><path d="M5.5 5.5h13l2.5 7.5v3.5a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5V13l2.5-7.5z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>',
    chevD: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  };

  const NAV = [
    { id: 'day', label: '日计划', icon: 'day' },
    { id: 'week', label: '周视图', icon: 'week' },
    { id: 'month', label: '月视图', icon: 'month' },
    { id: 'stats', label: '统计', icon: 'stats' },
    { id: 'report', label: 'AI 周报', icon: 'report' },
  ];

  const PRIO_LABEL = { 1: '很简单', 2: '简单', 3: '中等', 4: '困难', 5: '很困难' };
  const PRIO_COLOR = { 1: '#A8B0A8', 2: '#B0B8A8', 3: '#C4A888', 4: '#C49898', 5: '#A898B8' };

  const state = {
    view: 'day',
    date: todayStr(),
    categories: [],
    plans: [],
    settings: {},
    report: null,
    reportWeek: null,
    reportLoading: false,
    quickCat: null,
  };

  /* ---------------- 小工具 ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtMD(dateStr) {
    const [, m, d] = dateStr.split('-');
    return `${+m}月${+d}日`;
  }
  function dow(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return WEEK_CN[new Date(y, m - 1, d).getDay()];
  }
  function catOf(id) {
    return state.categories.find(c => c.id === id) || { name: '未分类', color: '#A8A0A8' };
  }
  function stars(p) {
    return '<span class="stars">' + '★'.repeat(Math.max(1, Math.min(5, p || 3))) + '</span>';
  }

  function toast(msg, ms = 2000) {
    const wrap = $('#toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 220);
    }, ms);
  }

  /* ---------------- 数据刷新 ---------------- */
  async function refresh() {
    const [cats, plans, settings] = await Promise.all([getCategories(), getPlans(), getSettings()]);
    state.categories = cats;
    state.plans = plans;
    state.settings = settings;
    if (!state.quickCat || !cats.some(c => c.id === state.quickCat)) {
      state.quickCat = localStorage.getItem('pn.quickCat') || cats[0]?.id;
    }
    applyTheme(settings.theme);
    render();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#26222C' : '#F2EFEC');
  }

  /* ---------------- 渲染入口 ---------------- */
  function render() {
    renderNav();
    renderTopbar();
    renderContent();
  }

  function renderNav() {
    const sIco = $('#settings-ico');
    if (sIco) sIco.innerHTML = I.settings;
    $('#nav').innerHTML = NAV.map(n => `
      <button class="nav-item ${state.view === n.id ? 'active' : ''}" data-action="nav" data-view="${n.id}" title="${n.label}">
        <span class="ico">${I[n.icon]}</span><span class="nav-label">${n.label}</span>
      </button>`).join('');
  }

  function renderTopbar() {
    const tb = $('#topbar');
    let title = '';
    let actions = '';

    if (state.view === 'day') {
      title = `<div class="topbar-kicker">DAY PLAN</div><div class="topbar-h">${fmtMD(state.date)} · ${dow(state.date)}</div>`;
      actions = `
        <button class="icon-btn" data-action="prev" title="前一天">${I.left}</button>
        <button class="btn ghost sm" data-action="today">今天</button>
        <button class="icon-btn" data-action="next" title="后一天">${I.right}</button>`;
    } else if (state.view === 'week') {
      const { start, end } = weekRangeOf(state.date, state.settings.weekStart || 1);
      title = `<div class="topbar-kicker">WEEK VIEW</div><div class="topbar-h">${fmtMD(start)} — ${fmtMD(end)}</div>`;
      actions = `
        <button class="icon-btn" data-action="prev" title="上一周">${I.left}</button>
        <button class="btn ghost sm" data-action="today">本周</button>
        <button class="icon-btn" data-action="next" title="下一周">${I.right}</button>`;
    } else if (state.view === 'month') {
      const [y, m] = state.date.split('-').map(Number);
      title = `<div class="topbar-kicker">MONTH VIEW</div><div class="topbar-h">${y} 年 ${m} 月</div>`;
      actions = `
        <button class="icon-btn" data-action="prev" title="上个月">${I.left}</button>
        <button class="btn ghost sm" data-action="today">本月</button>
        <button class="icon-btn" data-action="next" title="下个月">${I.right}</button>`;
    } else if (state.view === 'stats') {
      title = `<div class="topbar-kicker">INSIGHTS</div><div class="topbar-h">统计</div>`;
    } else if (state.view === 'report') {
      title = `<div class="topbar-kicker">AI REPORT</div><div class="topbar-h">周报</div>`;
      actions = `
        <button class="icon-btn" data-action="prev" title="上一周">${I.left}</button>
        <button class="btn ghost sm" data-action="today">本周</button>
        <button class="icon-btn" data-action="next" title="下一周">${I.right}</button>`;
    }

    const newBtn = ['day', 'week', 'month'].includes(state.view)
      ? `<button class="btn primary" data-action="new">${I.plus}新建</button>` : '';

    tb.innerHTML = `<div class="topbar-title">${title}</div>${actions}${newBtn}`;
  }

  function renderContent() {
    const c = $('#content');
    const map = {
      day: viewDay, week: viewWeek, month: viewMonth, stats: viewStats, report: viewReport,
    };
    c.innerHTML = `<div class="content-inner">${map[state.view]()}</div>`;
    c.scrollTop = 0;
  }

  /* ---------------- 日视图 ---------------- */
  function viewDay() {
    const plans = state.plans.filter(p => p.plan_date === state.date).sort(sortPlans);
    const done = plans.filter(p => p.status === 'completed').length;
    const streak = computeStreak(state.plans);

    const list = plans.length ? `
      <div class="task-list">
        ${plans.map(taskHtml).join('')}
      </div>
      <div class="progress-block">
        <div class="progress-row"><span>今日完成</span><span><b>${done}</b> / ${plans.length}</span></div>
        <div class="track"><div class="fill" style="width:${plans.length ? (done / plans.length) * 100 : 0}%"></div></div>
      </div>` : `
      <div class="empty">
        <div class="empty-ico">${I.inbox}</div>
        <div class="empty-title">这一天还是空白的</div>
        <div class="empty-sub">在上面写一句要做的事，回车就好</div>
      </div>`;

    return `
      <div class="day-head">
        <div class="day-date">
          <span class="day-num">${String(+state.date.split('-')[2]).padStart(2, '0')}</span>
          <div class="day-meta">
            <b>${dow(state.date)}</b>
            <span>${state.date.split('-')[0]} 年 ${+state.date.split('-')[1]} 月</span>
          </div>
        </div>
        ${streak > 0 ? `<span class="streak">${I.flame}连续 ${streak} 天</span>` : ''}
        <div class="day-spacer"></div>
      </div>

      <div class="quick-add">
        <input id="quick-input" type="text" placeholder="今天要做点什么？回车添加…" autocomplete="off">
        <button class="btn primary" data-action="quick-add">${I.plus}添加</button>
      </div>

      ${list}`;
  }

  function taskHtml(p) {
    const cat = catOf(p.category_id);
    const time = p.start_time
      ? `<span class="time-tag">${escapeHtml(p.start_time)}${p.end_time ? '–' + escapeHtml(p.end_time) : ''}</span><span class="sep">·</span>`
      : '';
    return `
      <div class="task ${p.status === 'completed' ? 'done' : ''}" data-id="${p.id}">
        <button class="task-check" data-action="toggle" data-id="${p.id}" aria-label="完成">
          ${I.check}
        </button>
        <div class="task-main" data-action="edit" data-id="${p.id}" style="cursor:pointer">
          <div class="task-title">${escapeHtml(p.title)}</div>
          ${p.description ? `<div class="task-desc">${escapeHtml(p.description)}</div>` : ''}
          <div class="task-meta">
            ${time}
            <span class="task-cat"><span class="dot" style="--c:${cat.color}"></span>${escapeHtml(cat.name)}</span>
            <span class="sep">·</span>${stars(p.priority)}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit" data-id="${p.id}" title="编辑">${I.edit}</button>
          <button class="icon-btn" data-action="del" data-id="${p.id}" title="删除">${I.trash}</button>
        </div>
      </div>`;
  }

  /* ---------------- 周视图 ---------------- */
  function viewWeek() {
    const { dates } = weekRangeOf(state.date, state.settings.weekStart || 1);
    const today = todayStr();
    const weekPlans = state.plans.filter(p => dates.includes(p.plan_date));
    const weekTotal = weekPlans.length;
    const weekDone = weekPlans.filter(p => p.status === 'completed').length;
    return `<div class="week-wrap"><div class="week-grid">${dates.map(d => {
      const list = state.plans.filter(p => p.plan_date === d).sort(sortPlans);
      const done = list.filter(p => p.status === 'completed').length;
      const shown = list.slice(0, 4);
      return `
        <div class="week-col ${d === today ? 'today' : ''}">
          <div class="week-col-head" data-action="go-day" data-date="${d}">
            <span class="week-dow">${dow(d)}</span>
            <span class="week-day">${+d.split('-')[2]}</span>
            <span class="week-count">${list.length ? done + '/' + list.length : '—'}</span>
          </div>
          ${shown.map(p => {
            const cat = catOf(p.category_id);
            return `<div class="mini-task ${p.status === 'completed' ? 'done' : ''}" style="--c:${cat.color}" data-action="edit" data-id="${p.id}">${escapeHtml(p.title)}</div>`;
          }).join('')}
          ${list.length > 4 ? `<div class="week-more">+${list.length - 4} 项</div>` : ''}
          ${!list.length ? '<div class="week-empty">—</div>' : ''}
        </div>`;
    }).join('')}</div>
      <div class="week-foot">
        本周 <b>${weekTotal}</b> 项 · 完成 <b>${weekDone}</b> 项 · 完成率 <b>${weekTotal ? Math.round(weekDone / weekTotal * 100) : 0}%</b>
      </div>
    </div>`;
  }

  /* ---------------- 月视图 ---------------- */
  function viewMonth() {
    const [y, m] = state.date.split('-').map(Number);
    const cells = monthGrid(y, m, state.settings.weekStart || 1);
    const today = todayStr();
    const dows = (state.settings.weekStart || 1) === 1
      ? ['一', '二', '三', '四', '五', '六', '日']
      : ['日', '一', '二', '三', '四', '五', '六'];

    const head = dows.map(d => `<div class="month-dow">${d}</div>`).join('');
    const body = cells.map(cell => {
      const list = state.plans.filter(p => p.plan_date === cell.date);
      const dots = list.slice(0, 4).map(p => {
        const cat = catOf(p.category_id);
        return `<i style="--c:${cat.color}"></i>`;
      }).join('');
      const first = list[0];
      return `
        <div class="month-cell ${cell.dim ? 'dim' : ''} ${cell.date === today ? 'today' : ''} ${list.length ? 'has' : ''}"
             data-action="go-day" data-date="${cell.date}">
          <span class="month-num">${+cell.date.split('-')[2]}</span>
          ${list.length > 4 ? `<span class="month-badge">${list.length}</span>` : ''}
          ${first ? `<div class="month-mini">${escapeHtml(first.title)}${list.length > 1 ? ` +${list.length - 1}` : ''}</div>` : ''}
          <div class="month-dots">${dots}</div>
        </div>`;
    }).join('');

    return `<div class="month-grid">${head}${body}</div>`;
  }

  /* ---------------- 统计 ---------------- */
  function viewStats() {
    const today = todayStr();
    const { start, end } = weekRangeOf(today, state.settings.weekStart || 1);
    const weekPlans = state.plans.filter(p => p.plan_date >= start && p.plan_date <= end);
    const weekDone = weekPlans.filter(p => p.status === 'completed').length;
    const weekRate = weekPlans.length ? Math.round(weekDone / weekPlans.length * 100) : 0;
    const streak = computeStreak(state.plans);
    const total = state.plans.length;

    // 最近 7 天柱状
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const dayStats = days.map(d => {
      const l = state.plans.filter(p => p.plan_date === d);
      return { d, total: l.length, done: l.filter(p => p.status === 'completed').length };
    });
    const max = Math.max(1, ...dayStats.map(s => s.total));

    // 分类分布（近 30 天）
    const from30 = addDays(today, -29);
    const recent = state.plans.filter(p => p.plan_date >= from30);
    const catMap = {};
    for (const p of recent) {
      catMap[p.category_id] = catMap[p.category_id] || { total: 0, done: 0 };
      catMap[p.category_id].total++;
      if (p.status === 'completed') catMap[p.category_id].done++;
    }
    const catRows = Object.entries(catMap)
      .map(([id, v]) => ({ ...catOf(id), id, ...v }))
      .sort((a, b) => b.total - a.total);
    const catMax = Math.max(1, ...catRows.map(r => r.total));

    const empty = !recent.length;

    return `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">本周完成率</div>
          <div class="stat-value">${weekRate}<small>%</small></div>
          <div class="stat-hint">${weekDone} / ${weekPlans.length} 项</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">连续打卡</div>
          <div class="stat-value">${streak}<small>天</small></div>
          <div class="stat-hint">${streak >= 7 ? '养成中，别断' : '每天做成一件事就 +1'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">本周记录</div>
          <div class="stat-value">${weekPlans.length}<small>项</small></div>
          <div class="stat-hint">含未完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">累计记录</div>
          <div class="stat-value">${total}<small>项</small></div>
          <div class="stat-hint">从第一次记录算起</div>
        </div>
      </div>

      <div class="card pad" style="margin-bottom:16px">
        <div class="sec-h"><h3>最近 7 天</h3><span class="hint">柱高 = 当天计划数，实心 = 已完成</span></div>
        <div class="bars">
          ${dayStats.map(s => `
            <div class="bar-col ${s.d === today ? 'today' : ''}">
              <span class="bar-val">${s.total ? s.done + '/' + s.total : '—'}</span>
              <div class="bar-stack">
                ${s.total ? `<div class="bar-total" style="height:${Math.max(7, Math.round((s.total / max) * 100))}%">
                  <div class="bar-done" style="height:${Math.round((s.done / s.total) * 100)}%"></div>
                </div>` : ''}
              </div>
              <span class="bar-label">${+s.d.split('-')[2]}日</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="card pad">
        <div class="sec-h"><h3>精力分配</h3><span class="hint">近 30 天</span></div>
        ${empty ? '<div class="empty" style="padding:32px 0"><div class="empty-sub">还没有足够的数据</div></div>'
          : catRows.map(r => `
            <div class="dist-row">
              <div class="dist-name"><span class="dot" style="--c:${r.color}"></span>${escapeHtml(r.name)}</div>
              <div class="dist-track"><div class="dist-fill" style="width:${(r.total / catMax) * 100}%;--c:${r.color}"></div></div>
              <div class="dist-val">${r.total} 项 · ${Math.round(r.done / r.total * 100)}%</div>
            </div>`).join('')}
      </div>`;
  }

  /* ---------------- AI 周报 ---------------- */
  function viewReport() {
    const weekStart = weekStartOf(state.date, state.settings.weekStart || 1);
    const { end } = weekRangeOf(state.date, state.settings.weekStart || 1);
    const mode = state.settings.aiMode || 'demo';
    const modeText = { demo: '演示模式 · 本地生成', proxy: '代理模式 · 真 AI', key: '自带 Key · 真 AI' }[mode];

    const has = state.report && state.report.weekStart === weekStart;

    let body;
    if (state.reportLoading) {
      body = `<div class="card pad"><div class="empty" style="padding:52px 0">
        <div class="empty-ico">${I.spark}</div>
        <div class="empty-title">正在读你这一周的记录…</div>
        <div class="empty-sub">大概几秒钟</div>
      </div></div>`;
    } else if (has) {
      body = `<div class="card pad report-card">
        <div class="report-body">${renderMarkdown(state.report.text)}</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
        <button class="btn soft" data-action="copy-report">${I.copy}复制全文</button>
        <button class="btn ghost" data-action="download-report">${I.download}下载 .md</button>
        <button class="btn ghost" data-action="gen-report">${I.spark}重新生成</button>
      </div>`;
    } else {
      const count = state.plans.filter(p => p.plan_date >= weekStart && p.plan_date <= end).length;
      body = `<div class="card pad report-card"><div class="empty" style="padding:52px 0">
        <div class="empty-ico">${I.report}</div>
        <div class="empty-title">${count ? `这一周有 ${count} 条记录` : '这一周还没有记录'}</div>
        <div class="empty-sub">${count ? '点下面的按钮，把它梳理成一份周报' : '先去记几件事，回来再生成'}</div>
        <button class="btn primary" data-action="gen-report" style="margin-top:18px">${I.spark}生成周报</button>
      </div></div>`;
    }

    return `
      <div class="report-toolbar">
        <span class="mode-pill ${mode !== 'demo' ? 'live' : ''}">${modeText}</span>
        <span style="font-size:12.5px;color:var(--muted)">${fmtMD(weekStart)} — ${fmtMD(end)}</span>
        ${mode === 'demo' ? `<button class="btn ghost sm" data-action="settings" style="margin-left:auto">接入真 AI</button>` : ''}
      </div>
      ${body}`;
  }

  /* ---------------- 计划编辑弹窗 ---------------- */
  function openPlanModal(planId, presetDate) {
    const plan = planId ? state.plans.find(p => p.id === planId) : null;
    const p = plan || makePlan({ plan_date: presetDate || state.date, category_id: state.quickCat || state.categories[0]?.id });
    const isNew = !plan;

    const cats = state.categories.map(c => `
      <button type="button" class="chip ${c.id === p.category_id ? 'on' : ''}" data-cat="${c.id}">
        <span class="dot" style="--c:${c.color}"></span>${escapeHtml(c.name)}
      </button>`).join('');

    const prios = [1, 2, 3, 4, 5].map(n => `
      <button type="button" class="prio ${n === p.priority ? 'on' : ''}"
        data-prio="${n}" style="--pc:${PRIO_COLOR[n]};--pl:${PRIO_COLOR[n]}22">
        ${'★'.repeat(n)}<div class="prio-name">${PRIO_LABEL[n]}</div>
      </button>`).join('');

    openModal(`
      <div class="modal-head">
        <div class="modal-title">${isNew ? '新建计划' : '编辑计划'}</div>
        <button class="icon-btn" data-action="close-modal">${I.x}</button>
      </div>
      <form id="plan-form">
        <div class="modal-body">
          <div class="field-row">
            <label class="label">要做什么</label>
            <input class="field" name="title" value="${escapeHtml(p.title)}" placeholder="例如：写完周报初稿" autocomplete="off" required>
          </div>
          <div class="field-row">
            <label class="label">备注（可选）</label>
            <textarea class="field" name="description" placeholder="补充细节、卡点、备注…">${escapeHtml(p.description)}</textarea>
          </div>
          <div class="field-2 field-row">
            <div>
              <label class="label">日期</label>
              <input class="field" type="date" name="plan_date" value="${p.plan_date}" required>
            </div>
            <div>
              <label class="label">时间段（可选）</label>
              <div style="display:flex;align-items:center;gap:6px">
                <input class="field" type="time" name="start_time" value="${p.start_time || ''}">
                <span style="color:var(--muted)">–</span>
                <input class="field" type="time" name="end_time" value="${p.end_time || ''}">
              </div>
            </div>
          </div>
          <div class="field-row">
            <label class="label">分类</label>
            <div class="cat-row" id="cat-row">${cats}</div>
          </div>
          <div class="field-row" style="margin-bottom:0">
            <label class="label">难度</label>
            <div class="prio-row" id="prio-row">${prios}</div>
          </div>
        </div>
        <div class="modal-foot">
          ${isNew ? '' : `<button type="button" class="btn danger" data-action="del-plan" data-id="${p.id}" style="margin-right:auto">删除</button>`}
          <button type="button" class="btn ghost" data-action="close-modal">取消</button>
          <button type="submit" class="btn primary">${isNew ? '添加' : '保存'}</button>
        </div>
      </form>
    `, (root) => {
      const form = $('#plan-form', root);
      let catId = p.category_id;
      let prio = p.priority;

      $('#cat-row', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        catId = b.dataset.cat;
        $$('#cat-row .chip', root).forEach(el => el.classList.toggle('on', el === b));
      });
      $('#prio-row', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-prio]');
        if (!b) return;
        prio = +b.dataset.prio;
        $$('#prio-row .prio', root).forEach(el => el.classList.toggle('on', el === b));
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const title = String(fd.get('title') || '').trim();
        if (!title) return;
        const data = {
          ...p,
          title,
          description: String(fd.get('description') || '').trim(),
          plan_date: String(fd.get('plan_date')),
          start_time: fd.get('start_time') || null,
          end_time: fd.get('end_time') || null,
          category_id: catId,
          priority: prio,
          updated_at: new Date().toISOString(),
        };
        await savePlan(data);
        closeModal();
        await refresh();
        toast(isNew ? '已添加' : '已保存');
      });

      setTimeout(() => $('#plan-form input[name="title"]')?.focus(), 60);
    });
  }

  /* ---------------- 设置弹窗 ---------------- */
  function openSettings() {
    const s = state.settings;
    const cats = state.categories;

    openModal(`
      <div class="modal-head">
        <div class="modal-title">设置</div>
        <button class="icon-btn" data-action="close-modal">${I.x}</button>
      </div>
      <div class="modal-body">

        <div class="set-item">
          <div class="set-info">
            <div class="set-name">深色模式</div>
            <div class="set-desc">跟着你的作息换一身衣服</div>
          </div>
          <button class="switch ${s.theme === 'dark' ? 'on' : ''}" data-action="toggle-theme"></button>
        </div>

        <div style="padding:18px 0 6px">
          <div class="label" style="font-size:12.5px;margin-bottom:10px">AI 周报</div>
          <select class="field" id="ai-mode" style="margin-bottom:12px">
            <option value="demo" ${s.aiMode === 'demo' ? 'selected' : ''}>演示模式 — 本地规则生成，不联网</option>
            <option value="proxy" ${s.aiMode === 'proxy' ? 'selected' : ''}>代理模式 — 走自有后端，Key 在服务端</option>
            <option value="key" ${s.aiMode === 'key' ? 'selected' : ''}>自带 Key — 直接调用，仅自己用</option>
          </select>

          <div id="proxy-box" style="display:${s.aiMode === 'proxy' ? 'block' : 'none'}">
            <input class="field" id="proxy-endpoint" placeholder="代理地址，例如 https://your-api.com/report" value="${escapeHtml(s.proxyEndpoint || '')}" style="margin-bottom:8px">
            <div class="set-desc" style="margin-bottom:12px">POST 一个 JSON，返回 <code>{ report: "…" }</code> 即可</div>
          </div>

          <div id="key-box" style="display:${s.aiMode === 'key' ? 'block' : 'none'}">
            <input class="field" id="api-key" type="password" placeholder="DeepSeek API Key" value="${escapeHtml(s.apiKey || '')}" style="margin-bottom:8px">
            <input class="field" id="ai-model" placeholder="模型" value="${escapeHtml(s.aiModel || 'deepseek-chat')}">
            <div class="set-desc" style="margin-top:8px">Key 只存在你这台设备的浏览器里，不会上传</div>
          </div>
        </div>

        <div style="padding:18px 0 6px">
          <div class="label" style="font-size:12.5px;margin-bottom:6px">分类</div>
          <div id="cat-list">
            ${cats.map(c => `
              <div class="cat-row-item" data-cat-id="${c.id}">
                <label class="cat-swatch" style="background:${c.color}">
                  <input type="color" value="${c.color}" data-cat-color="${c.id}">
                </label>
                <input class="cat-name-in" value="${escapeHtml(c.name)}" data-cat-name="${c.id}" maxlength="8">
                <button class="icon-btn" data-action="del-cat" data-id="${c.id}" title="删除">${I.trash}</button>
              </div>`).join('')}
          </div>
          <button class="btn ghost sm" data-action="add-cat" style="margin-top:10px">${I.plus}添加分类</button>
        </div>

        <div style="padding:18px 0 6px">
          <div class="label" style="font-size:12.5px;margin-bottom:10px">数据</div>
          <div style="display:flex;gap:9px;flex-wrap:wrap">
            <button class="btn ghost sm" data-action="export">${I.download}导出备份</button>
            <button class="btn ghost sm" data-action="import">${I.upload}导入备份</button>
            <button class="btn danger sm" data-action="clear-all">清空全部数据</button>
          </div>
          <div class="set-desc" style="margin-top:10px">
            数据只存在这台设备的浏览器里。换设备或清理浏览器前，记得先导出一份。
          </div>
        </div>

        <div style="padding:20px 0 0;border-top:1px solid var(--border-soft);margin-top:14px;
                    font-size:11.5px;color:var(--muted);line-height:1.8">
          PlanNote v2 · 纯前端 PWA<br>
          记录 → 回顾 → 周报，一条线走完
        </div>
      </div>
    `, (root) => {
      const modeSel = $('#ai-mode', root);
      modeSel.addEventListener('change', () => {
        $('#proxy-box', root).style.display = modeSel.value === 'proxy' ? 'block' : 'none';
        $('#key-box', root).style.display = modeSel.value === 'key' ? 'block' : 'none';
        persistAI(root);
      });
      $('#proxy-endpoint', root)?.addEventListener('change', () => persistAI(root));
      $('#api-key', root)?.addEventListener('change', () => persistAI(root));
      $('#ai-model', root)?.addEventListener('change', () => persistAI(root));

      async function persistAI(r) {
        const patch = {
          aiMode: $('#ai-mode', r).value,
          proxyEndpoint: $('#proxy-endpoint', r)?.value.trim() || '',
          apiKey: $('#api-key', r)?.value.trim() || '',
          aiModel: $('#ai-model', r)?.value.trim() || 'deepseek-chat',
        };
        state.settings = await saveSettings(patch);
        render();
      }

      // 分类改名 / 改色
      root.addEventListener('change', async (e) => {
        const nameId = e.target.dataset.catName;
        if (nameId) {
          const c = state.categories.find(x => x.id === nameId);
          const name = e.target.value.trim() || '未命名';
          await saveCategory({ ...c, name });
          await refresh();
          return;
        }
        const colorId = e.target.dataset.catColor;
        if (colorId) {
          const c = state.categories.find(x => x.id === colorId);
          await saveCategory({ ...c, color: e.target.value });
          await refresh();
        }
      });
    });
  }

  /* ---------------- 弹窗基础 ---------------- */
  function openModal(html, onMount) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="overlay" data-overlay="1"><div class="modal">${html}</div></div>`;
    const overlay = $('.overlay', root);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) closeModal();
    });
    if (onMount) onMount(root);
  }

  function closeModal() {
    $('#modal-root').innerHTML = '';
  }

  /* ---------------- AI 生成 ---------------- */
  async function generateReport() {
    const weekStart = weekStartOf(state.date, state.settings.weekStart || 1);
    const { end } = weekRangeOf(state.date, state.settings.weekStart || 1);
    const prevStart = addDays(weekStart, -7);
    const prevEnd = addDays(weekStart, -1);

    const plans = state.plans.filter(p => p.plan_date >= weekStart && p.plan_date <= end);
    const prevPlans = state.plans.filter(p => p.plan_date >= prevStart && p.plan_date <= prevEnd);

    state.reportLoading = true;
    renderContent();

    const mode = state.settings.aiMode || 'demo';
    let text;
    try {
      if (mode === 'proxy' && state.settings.proxyEndpoint) {
        const prompt = buildPrompt({ plans, categories: state.categories, start: weekStart, end });
        text = await generateViaProxy({ endpoint: state.settings.proxyEndpoint, prompt });
      } else if (mode === 'key' && state.settings.apiKey) {
        const prompt = buildPrompt({ plans, categories: state.categories, start: weekStart, end });
        text = await generateViaKey({
          apiKey: state.settings.apiKey,
          model: state.settings.aiModel,
          prompt,
        });
      } else {
        // 本地生成加一点点延迟，让"正在读记录"这个过渡被看见
        await new Promise(r => setTimeout(r, 380));
        text = generateLocalReport({ plans, categories: state.categories, start: weekStart, end, prevPlans });
      }
    } catch (err) {
      console.error(err);
      toast('生成失败，已改用本地生成：' + (err.message || '').slice(0, 40), 3200);
      text = generateLocalReport({ plans, categories: state.categories, start: weekStart, end, prevPlans });
    }

    state.report = { weekStart, end, text, at: Date.now() };
    state.reportLoading = false;
    renderContent();
    toast('周报已生成');
  }

  function downloadReport() {
    if (!state.report) return;
    const { weekStart, end, text } = state.report;
    const name = `PlanNote周报_${weekStart}_${end}.md`;
    downloadFile(name, text, 'text/markdown;charset=utf-8');
    toast('已下载');
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- 交互 ---------------- */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;

    switch (a) {
      case 'nav':
        state.view = t.dataset.view;
        render();
        break;

      case 'prev':
      case 'next': {
        const dir = a === 'next' ? 1 : -1;
        if (state.view === 'day') {
          state.date = addDays(state.date, dir);
        } else if (state.view === 'week') {
          state.date = addDays(state.date, dir * 7);
        } else if (state.view === 'month') {
          const [y, m] = state.date.split('-').map(Number);
          const d = new Date(y, m - 1 + dir, 1);
          state.date = toDateStr(d);
        } else if (state.view === 'report') {
          state.date = addDays(state.date, dir * 7);
          state.report = null;
        }
        render();
        break;
      }

      case 'today':
        state.date = todayStr();
        if (state.view === 'report') state.report = null;
        render();
        break;

      case 'go-day':
        state.date = t.dataset.date;
        state.view = 'day';
        render();
        break;

      case 'new':
        openPlanModal(null, state.date);
        break;

      case 'edit':
        openPlanModal(t.dataset.id);
        break;

      case 'quick-add': {
        const input = $('#quick-input');
        const title = (input?.value || '').trim();
        if (!title) { input?.focus(); return; }
        await savePlan(makePlan({
          title,
          plan_date: state.date,
          category_id: state.quickCat || state.categories[0]?.id,
        }));
        input.value = '';
        await refresh();
        $('#quick-input')?.focus();
        break;
      }

      case 'toggle': {
        const p = state.plans.find(x => x.id === t.dataset.id);
        if (!p) return;
        const done = p.status === 'completed';
        await savePlan({
          ...p,
          status: done ? 'pending' : 'completed',
          completed_at: done ? null : new Date().toISOString(),
        });
        await refresh();
        if (!done) toast('完成一件事 ✓', 1200);
        break;
      }

      case 'del': {
        const p = state.plans.find(x => x.id === t.dataset.id);
        if (!p) return;
        if (!confirm(`删除「${p.title}」？`)) return;
        await deletePlan(p.id);
        await refresh();
        toast('已删除');
        break;
      }

      case 'del-plan': {
        const p = state.plans.find(x => x.id === t.dataset.id);
        if (!p) return;
        if (!confirm(`删除「${p.title}」？`)) return;
        await deletePlan(p.id);
        closeModal();
        await refresh();
        toast('已删除');
        break;
      }

      case 'close-modal':
        closeModal();
        break;

      case 'settings':
        closeModal();
        openSettings();
        break;

      case 'toggle-theme': {
        const next = state.settings.theme === 'dark' ? 'light' : 'dark';
        state.settings = await saveSettings({ theme: next });
        applyTheme(next);
        t.classList.toggle('on', next === 'dark');
        break;
      }

      case 'add-cat': {
        const colors = CAT_COLORS;
        const used = state.categories.map(c => c.color);
        const color = colors.find(c => !used.includes(c)) || colors[state.categories.length % colors.length];
        await saveCategory({
          id: 'cat-' + Date.now().toString(36),
          name: '新分类',
          color,
          sort_order: state.categories.length,
          created_at: new Date().toISOString(),
        });
        await refresh();
        openSettings();
        break;
      }

      case 'del-cat': {
        if (state.categories.length <= 1) { toast('至少要留一个分类'); return; }
        const c = state.categories.find(x => x.id === t.dataset.id);
        if (!confirm(`删除分类「${c.name}」？该分类下的计划会归到第一个分类。`)) return;
        await deleteCategory(t.dataset.id);
        await refresh();
        openSettings();
        toast('已删除分类');
        break;
      }

      case 'export': {
        const data = await exportAll();
        const d = new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        downloadFile(`PlanNote备份_${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
        toast(`已导出 ${data.counts.plans} 条记录`);
        break;
      }

      case 'import': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!confirm('导入会覆盖当前所有数据，继续？')) return;
            const n = await importAll(data, { merge: false });
            closeModal();
            await refresh();
            toast(`已导入 ${n} 条记录`);
          } catch (err) {
            toast('导入失败：' + err.message, 3200);
          }
        });
        input.click();
        break;
      }

      case 'clear-all': {
        if (!confirm('清空全部数据？这个操作不可撤销。建议先导出备份。')) return;
        if (!confirm('真的要清空吗？')) return;
        await clearAll();
        closeModal();
        await refresh();
        toast('已清空');
        break;
      }

      case 'gen-report':
        generateReport();
        break;

      case 'copy-report': {
        if (!state.report) return;
        try {
          await navigator.clipboard.writeText(state.report.text);
          toast('已复制到剪贴板');
        } catch {
          toast('复制失败，请手动选择文本');
        }
        break;
      }

      case 'download-report':
        downloadReport();
        break;
    }
  });

  // 快速添加：回车
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') { closeModal(); return; }
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (e.key === 'Enter' && document.activeElement?.id === 'quick-input') {
      e.preventDefault();
      const btn = document.querySelector('[data-action="quick-add"]');
      btn?.click();
      return;
    }
    if (!isInput && (e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      openPlanModal(null, state.date);
    }
  });

  /* ---------------- 演示种子（?demo=1 首次打开时铺一点示例） ---------------- */
  async function seedDemo() {
    const t = todayStr();
    const samples = [
      { off: 0,  title: '写周报初稿',        cat: 'cat-work',  prio: 4, st: 'completed', s: '09:30', e: '11:00' },
      { off: 0,  title: '整理面试作品集',    cat: 'cat-work',  prio: 4, st: 'completed', s: '14:00', e: '16:30' },
      { off: 0,  title: '跑步 30 分钟',      cat: 'cat-health',prio: 2, st: 'pending',   s: '19:00', e: '19:40' },
      { off: 0,  title: '读完《深度工作》第 3 章', cat: 'cat-study', prio: 3, st: 'pending' },
      { off: -1, title: '和导师对一次 RP 结构', cat: 'cat-study', prio: 4, st: 'completed', s: '15:00', e: '16:00' },
      { off: -1, title: '整理房间 + 洗床单',  cat: 'cat-life',  prio: 1, st: 'completed' },
      { off: -2, title: '复盘上周三个项目的卡点', cat: 'cat-work', prio: 5, st: 'completed', s: '10:00', e: '12:00' },
      { off: -3, title: '去体检',            cat: 'cat-health',prio: 3, st: 'completed', s: '08:30', e: '10:30' },
      { off: -3, title: '改简历第一页',      cat: 'cat-work',  prio: 4, st: 'pending' },
      { off: -4, title: '拍摄澳门物语补镜',  cat: 'cat-work',  prio: 5, st: 'completed', s: '13:00', e: '18:00' },
      { off: -5, title: '整理澳门物语素材库', cat: 'cat-work', prio: 3, st: 'completed' },
      { off: 1,  title: '预演一次路演',      cat: 'cat-work',  prio: 5, st: 'pending', s: '10:00', e: '12:00' },
      { off: 2,  title: '把 PlanNote 部署上线', cat: 'cat-work', prio: 4, st: 'pending' },
    ];
    for (const s of samples) {
      const plan = makePlan({
        title: s.title,
        plan_date: addDays(t, s.off),
        category_id: s.cat,
        priority: s.prio,
        status: s.st,
        start_time: s.s || null,
        end_time: s.e || null,
        completed_at: s.st === 'completed' ? new Date().toISOString() : null,
      });
      // 让创建时间有先后，排序看起来自然
      plan.created_at = new Date(Date.now() + s.off * 3600 * 1000 + Math.random() * 1000).toISOString();
      await savePlan(plan);
    }
  }

  /* ---------------- 启动 ---------------- */
  async function boot() {
    const params = new URLSearchParams(location.search);
    if (params.get('view')) {
      const v = params.get('view');
      if (NAV.some(n => n.id === v)) state.view = v;
    }

    try {
      await refresh();
      if (params.get('demo') === '1' && state.plans.length === 0) {
        await seedDemo();
        await refresh();
      }
      if (state.plans.length === 0) {
        setTimeout(() => toast('写第一件事试试，回车就好', 3200), 700);
      }
    } catch (err) {
      console.error(err);
      $('#content').innerHTML = `<div class="empty"><div class="empty-title">数据打不开</div>
        <div class="empty-sub">${escapeHtml(err.message || '未知错误')}</div></div>`;
    }

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
