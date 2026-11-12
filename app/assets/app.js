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
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.1"/><circle cx="9" cy="17" r="2.1"/></svg>',
    enter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5v6.5a3 3 0 01-3 3H5"/><path d="M9 10l-4.5 4.5L9 19"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M17 5.5l2 2M14.5 8l2 2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/></svg>',
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
    reportError: null,
    quickCat: null,
    catFilter: '',      // 模块筛选，'' = 全部
    reportCat: '',      // 周报范围：'' = 全部模块，否则只统计该模块
    reportCache: {},    // 已生成的周报，按「周|范围」缓存
    ruleOpen: false,    // 周报规则面板是否展开
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

  // 同一时刻只保留最新一条提示：连点按钮时不会把提示堆成一列压住正文
  function toast(msg, ms = 2000) {
    const wrap = $('#toast-wrap');
    if (!wrap) return;
    const olds = Array.from(wrap.querySelectorAll('.toast'));
    const last = olds[olds.length - 1];
    const reuse = last && last.textContent === msg ? last : null;
    olds.forEach((n) => {
      if (n === reuse) return;
      clearTimeout(n._hide);
      clearTimeout(n._kill);
      n.remove();
    });
    let el = reuse;
    if (el) {
      clearTimeout(el._hide);
      clearTimeout(el._kill);
    } else {
      el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      wrap.appendChild(el);
    }
    el._hide = setTimeout(() => {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el._kill = setTimeout(() => el.remove(), 220);
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

    // 日视图的添加入口是页面里那一行（带「添加任务」按钮），顶栏不再重复；
    // 周 / 月视图没有输入框，所以顶栏给一个文案明确的「新建任务」
    const newBtn = ['week', 'month'].includes(state.view)
      ? `<button class="btn primary" data-action="new" title="在 ${fmtMD(state.date)} 新建一条任务">${I.plus}新建任务</button>` : '';

    tb.innerHTML = `<div class="topbar-title">${title}</div>${actions}${newBtn}`;
  }

  function renderContent() {
    const c = $('#content');
    const map = {
      day: viewDay, week: viewWeek, month: viewMonth, stats: viewStats, report: viewReport,
    };
    c.innerHTML = `<div class="content-inner">${map[state.view]()}</div>`;
    c.scrollTop = 0;

    // 规则框：失焦即自动保存（只写 reportTemplate 一个字段）
    const ta = $('#report-template');
    if (ta) {
      ta.addEventListener('change', async () => {
        state.settings = await saveSettings({ reportTemplate: ta.value.trim() });
        toast('规则已自动保存');
        renderContent();
      });
    }
  }

  /* ---------------- 日视图 ---------------- */
  function viewDay() {
    const all = state.plans.filter(p => p.plan_date === state.date).sort(sortPlans);
    const doneAll = all.filter(p => p.status === 'completed').length;
    const streak = computeStreak(state.plans);

    const catFilter = state.catFilter;
    const plans = catFilter ? all.filter(p => p.category_id === catFilter) : all;
    const filterName = catFilter ? catOf(catFilter).name : '';

    const counts = {};
    for (const p of all) counts[p.category_id] = (counts[p.category_id] || 0) + 1;

    const modBar = `
      <div class="mod-bar">
        <span class="mod-cap">按模块看</span>
        <button class="mod-chip ${catFilter ? '' : 'on'}" data-action="filter-cat" data-id="">
          ${I.grid}<span>全部</span><b>${all.length}</b>
        </button>
        ${state.categories.map(c => `
          <button class="mod-chip ${catFilter === c.id ? 'on' : ''}" data-action="filter-cat" data-id="${c.id}">
            <span class="dot" style="--c:${c.color}"></span><span>${escapeHtml(c.name)}</span>${counts[c.id] ? `<b>${counts[c.id]}</b>` : ''}
          </button>`).join('')}
        <button class="mod-chip ghost" data-action="add-cat-quick" title="新建一个自己的模块">${I.plus}新建模块</button>
      </div>`;

    const list = plans.length ? `
      <div class="task-list">
        ${plans.map(taskHtml).join('')}
      </div>` : `
      <div class="empty">
        <div class="empty-ico">${I.inbox}</div>
        <div class="empty-title">${catFilter ? `「${escapeHtml(filterName)}」今天还没有任务` : '这一天还是空白的'}</div>
        <div class="empty-sub">${catFilter
          ? `在下面写一条，会自动放进「${escapeHtml(filterName)}」`
          : '在下面写一句，点「添加任务」就记下了'}</div>
      </div>`;

    const progress = all.length ? `
      <div class="progress-block">
        <div class="progress-row">
          <span>今日完成${catFilter ? `（全部模块）` : ''}</span>
          <span><b>${doneAll}</b> / ${all.length}</span>
        </div>
        <div class="track"><div class="fill" style="width:${(doneAll / all.length) * 100}%"></div></div>
      </div>` : '';

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

      ${modBar}

      <div class="quick-add">
        <input id="quick-input" type="text" autocomplete="off"
               placeholder="${catFilter
                 ? `写一条「${escapeHtml(filterName)}」的任务`
                 : '写下一条任务…'}">
        <button class="btn quiet sm" data-action="quick-detail"
                title="打开完整表单，补时间、模块、难度">${I.sliders}<span class="lbl">详细填写</span></button>
        <button class="btn primary add-btn" data-action="quick-add"
                title="把这条任务记到 ${fmtMD(state.date)}">${I.plus}<span class="lbl">添加任务</span></button>
      </div>

      ${list}
      ${progress}`;
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
            <span class="week-count">${list.length ? done + '/' + list.length : ''}</span>
          </div>
          ${shown.map(p => {
            const cat = catOf(p.category_id);
            return `<div class="mini-task ${p.status === 'completed' ? 'done' : ''}" style="--c:${cat.color}" data-action="edit" data-id="${p.id}">${escapeHtml(p.title)}</div>`;
          }).join('')}
          ${list.length > 4 ? `<div class="week-more">+${list.length - 4} 项</div>` : ''}
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

    // 模块分布（近 30 天）
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
    const ready = isConfigured(state.settings);
    const modelName = (state.settings.aiModel || 'deepseek-chat').trim();

    const weekPlans = state.plans.filter(p => p.plan_date >= weekStart && p.plan_date <= end);
    const scope = state.reportCat ? catOf(state.reportCat) : null;
    const count = scope ? weekPlans.filter(p => p.category_id === scope.id).length : weekPlans.length;
    const scopeName = scope ? scope.name : '全部模块';

    // 每份周报按「周 + 范围」分开存，切换模块看不会冲掉已经生成的那份
    const cacheKey = `${weekStart}|${state.reportCat || ''}`;
    const cached = (state.reportCache || {})[cacheKey] || null;
    const has = !!cached;

    let body;
    if (!ready) {
      body = `<div class="card pad report-card"><div class="empty" style="padding:46px 0">
        <div class="empty-ico">${I.key}</div>
        <div class="empty-title">先接入 AI，周报才有人写</div>
        <div class="empty-sub">填一个 API Key 就行，Key 只存在这台设备里，不会上传到任何地方</div>
        <button class="btn primary" data-action="settings" style="margin-top:18px">${I.key}去接入</button>
      </div></div>`;
    } else if (state.reportLoading) {
      body = `<div class="card pad report-card"><div class="empty" style="padding:52px 0">
        <div class="empty-ico">${I.spark}</div>
        <div class="empty-title">正在读你这一周的记录…</div>
        <div class="empty-sub">大概十几秒</div>
      </div></div>`;
    } else if (state.reportError) {
      body = `<div class="card pad report-card"><div class="empty" style="padding:40px 28px">
        <div class="empty-ico err">${I.alert}</div>
        <div class="empty-title">这次没生成成功</div>
        <div class="empty-sub">${escapeHtml(state.reportError)}</div>
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;justify-content:center">
          <button class="btn primary" data-action="gen-report">${I.spark}再试一次</button>
          <button class="btn ghost" data-action="settings">${I.settings}检查设置</button>
        </div>
      </div></div>`;
    } else if (has) {
      body = `<div class="card pad report-card">
        <div class="report-body">${renderMarkdown(cached.text)}</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
        <button class="btn soft" data-action="copy-report">${I.copy}复制全文</button>
        <button class="btn ghost" data-action="download-report">${I.download}下载 .md</button>
        <button class="btn ghost" data-action="gen-report">${I.spark}重新生成</button>
      </div>`;
    } else {
      body = `<div class="card pad report-card"><div class="empty" style="padding:52px 0">
        <div class="empty-ico">${I.report}</div>
        <div class="empty-title">${count
          ? (scope ? `「${escapeHtml(scopeName)}」这一周有 ${count} 条记录` : `这一周有 ${count} 条记录`)
          : (scope ? `「${escapeHtml(scopeName)}」这一周还没有记录` : '这一周还没有记录')}</div>
        <div class="empty-sub">${count ? '点下面的按钮，让 AI 把它梳理成一份周报' : '先去记几件事，回来再生成'}</div>
        <button class="btn primary" data-action="gen-report" style="margin-top:18px">${I.spark}生成周报</button>
      </div></div>`;
    }

    const ruleText = String(state.settings.reportTemplate || '');
    const hasRule = !!ruleText.trim();

    const ruleCard = `
      <div class="rule-card ${state.ruleOpen ? 'open' : ''}">
        <button class="rule-head" data-action="toggle-rule" type="button">
          <span class="rule-ico">${I.sliders}</span>
          <span class="rule-title">周报规则 / 模板</span>
          <span class="rule-state ${hasRule ? 'on' : ''}">${hasRule ? '已设置 · 生成时严格遵循' : '未设置 · 用默认四段结构'}</span>
          <span class="rule-chev">${I.chevD}</span>
        </button>
        ${state.ruleOpen ? `
        <div class="rule-body">
          <textarea id="report-template" class="rule-in" spellcheck="false"
            placeholder="把公司周报模板、格式要求、历史样例或提示词贴进来。例如：&#10;&#10;标题固定为「周报｜{姓名}｜{日期}」&#10;四个小节：本周完成 / 关键数据 / 问题与风险 / 下周计划&#10;每节用 1. 2. 3. 序号列表，不超过 5 条&#10;语气正式，不用口语">${escapeHtml(ruleText)}</textarea>
          <div class="rule-foot">
            <button class="btn primary sm" data-action="save-rule" type="button">保存规则</button>
            ${hasRule ? `<button class="btn ghost sm" data-action="clear-rule" type="button">清空</button>` : ''}
            <span class="rule-tip">这段会原样发给模型，优先级高于默认格式</span>
          </div>
        </div>` : ''}
      </div>`;

    const weekCounts = {};
    for (const p of weekPlans) weekCounts[p.category_id] = (weekCounts[p.category_id] || 0) + 1;

    const scopeRow = `
      <div class="mod-bar report-scope">
        <span class="mod-cap">周报范围</span>
        <button class="mod-chip ${state.reportCat ? '' : 'on'}" data-action="report-cat" data-id="">
          ${I.grid}<span>全部模块</span><b>${weekPlans.length}</b>
        </button>
        ${state.categories.map(c => `
          <button class="mod-chip ${state.reportCat === c.id ? 'on' : ''}" data-action="report-cat" data-id="${c.id}"
                  title="只统计「${escapeHtml(c.name)}」这个模块的记录">
            <span class="dot" style="--c:${c.color}"></span><span>${escapeHtml(c.name)}</span>${weekCounts[c.id] ? `<b>${weekCounts[c.id]}</b>` : ''}
          </button>`).join('')}
        <span class="scope-note">${scope ? `本次只写「${escapeHtml(scopeName)}」` : '全部模块一起写'}</span>
      </div>`;

    return `
      <div class="report-toolbar">
        <span class="mode-pill ${ready ? 'live' : ''}">${ready ? '已接入 · ' + escapeHtml(modelName) : '未接入 AI'}</span>
        <span style="font-size:12.5px;color:var(--muted)">${fmtMD(weekStart)} — ${fmtMD(end)}</span>
        ${ready ? `<button class="btn quiet sm" data-action="settings" style="margin-left:auto">${I.settings}AI 设置</button>` : ''}
      </div>
      ${scopeRow}
      ${ruleCard}
      ${body}`;
  }

  /* ---------------- 计划编辑弹窗 ---------------- */
  function openPlanModal(planId, presetDate, presetTitle) {
    const plan = planId ? state.plans.find(p => p.id === planId) : null;
    const p = plan || makePlan({ plan_date: presetDate || state.date, category_id: state.quickCat || state.categories[0]?.id });
    if (!plan && presetTitle) p.title = presetTitle;
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
        <div class="modal-title">${isNew ? '新建任务' : '编辑任务'}</div>
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
            <label class="label">模块</label>
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
          <button type="submit" class="btn primary">${isNew ? '添加任务' : '保存'}</button>
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

  /* 把设置里填的 AI 配置存下来（Key / 地址 / 模型） */
  async function persistAISettings() {
    const keyIn = $('#api-key'), baseIn = $('#ai-base'), modelIn = $('#ai-model');
    if (!keyIn || !baseIn || !modelIn) return state.settings;
    state.settings = await saveSettings({
      apiKey: keyIn.value.trim(),
      aiBaseUrl: baseIn.value.trim() || DEFAULT_BASE_URL,
      aiModel: modelIn.value.trim() || DEFAULT_MODEL,
    });
    const badge = $('.ai-badge');
    if (badge) {
      const on = isConfigured(state.settings);
      badge.classList.toggle('on', on);
      badge.textContent = on ? '已接入' : '未接入';
    }
    return state.settings;
  }

  /* ---------------- 设置弹窗 ---------------- */
  function openSettings() {
    const s = state.settings;
    const cats = state.categories;
    const hasKey = isConfigured(s);
    const baseUrl = String(s.aiBaseUrl || DEFAULT_BASE_URL).toLowerCase();
    const preset = baseUrl.includes('deepseek') ? 'deepseek'
      : baseUrl.includes('openai.com') ? 'openai' : 'custom';

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

        <div class="set-block">
          <div class="set-block-head">
            <div class="label" style="font-size:12.5px">AI 周报</div>
            <span class="ai-badge ${hasKey ? 'on' : ''}">${hasKey ? '已接入' : '未接入'}</span>
          </div>

          <div class="ai-presets">
            <button type="button" class="chip ${preset === 'deepseek' ? 'on' : ''}" data-action="ai-preset" data-preset="deepseek">DeepSeek</button>
            <button type="button" class="chip ${preset === 'openai' ? 'on' : ''}" data-action="ai-preset" data-preset="openai">OpenAI</button>
            <button type="button" class="chip ${preset === 'custom' ? 'on' : ''}" data-action="ai-preset" data-preset="custom">自定义</button>
          </div>

          <div class="field-row">
            <label class="label-sub">API Key</label>
            <div class="key-wrap">
              <input class="field" id="api-key" type="password" placeholder="粘贴你的 API Key"
                     value="${escapeHtml(s.apiKey || '')}" autocomplete="off" spellcheck="false">
              <button type="button" class="icon-btn" data-action="toggle-key" title="显示 / 隐藏">${I.eye}</button>
            </div>
          </div>

          <div class="field-2 field-row">
            <div>
              <label class="label-sub">服务地址</label>
              <input class="field" id="ai-base" placeholder="https://api.deepseek.com"
                     value="${escapeHtml(s.aiBaseUrl || 'https://api.deepseek.com')}" spellcheck="false">
            </div>
            <div>
              <label class="label-sub">模型</label>
              <input class="field" id="ai-model" placeholder="deepseek-chat"
                     value="${escapeHtml(s.aiModel || 'deepseek-chat')}" spellcheck="false">
            </div>
          </div>

          <div class="ai-test-row">
            <button type="button" class="btn ghost sm" data-action="test-ai">${I.spark}测试连接</button>
            <span class="ai-test-msg" id="ai-test-msg"></span>
          </div>

          <div class="set-desc" style="margin-top:2px;line-height:1.7">
            Key 只存在这台设备里，不会上传。还没有？去
            <a class="set-link" href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek 控制台</a>
            申请一个，几十秒。
          </div>
        </div>

        <div class="set-block">
          <div class="set-block-head">
            <div class="label" style="font-size:12.5px">模块</div>
            <span class="cat-count">${cats.length} 个 · 共 ${state.plans.filter(x => !x.is_archived).length} 条任务</span>
          </div>
          <div class="set-desc" style="margin-bottom:12px">任务按模块归类，和日视图顶部的模块筛选是同一套。改完名字按回车即生效，数字是当前该模块的任务数。</div>
          <div id="cat-list">
            ${cats.map(c => {
              const n = state.plans.filter(x => x.category_id === c.id && !x.is_archived).length;
              return `
              <div class="cat-row-item" data-cat-id="${c.id}">
                <label class="cat-swatch" style="background:${c.color}">
                  <input type="color" value="${c.color}" data-cat-color="${c.id}">
                </label>
                <input class="cat-name-in" value="${escapeHtml(c.name)}" data-cat-name="${c.id}" maxlength="14">
                <span class="cat-num">${n}</span>
                <button class="icon-btn" data-action="del-cat" data-id="${c.id}" title="删除模块">${I.trash}</button>
              </div>`;
            }).join('')}
          </div>
          <button class="btn ghost sm" data-action="add-cat" style="margin-top:10px">${I.plus}新建模块</button>
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
      ['api-key', 'ai-base', 'ai-model'].forEach(id => {
        $('#' + id, root)?.addEventListener('change', async () => {
          await persistAISettings();
          render();
        });
      });

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
    const scope = state.reportCat ? catOf(state.reportCat) : null;
    const plans = state.plans
      .filter(p => p.plan_date >= weekStart && p.plan_date <= end)
      .filter(p => !scope || p.category_id === scope.id);

    if (!isConfigured(state.settings)) {
      toast('还没接入 AI，先填一个 API Key', 2600);
      openSettings();
      return;
    }
    if (!plans.length) {
      toast(scope ? `「${scope.name}」这一周还没有记录` : '这一周还没有记录，先去记两件事', 2600);
      return;
    }

    state.reportLoading = true;
    state.reportError = null;
    renderContent();

    try {
      const text = await callAI({
        baseUrl: state.settings.aiBaseUrl,
        apiKey: state.settings.apiKey,
        model: state.settings.aiModel,
        prompt: buildPrompt({
          plans,
          categories: state.categories,
          start: weekStart,
          end,
          template: state.settings.reportTemplate || '',
          scopeName: scope ? scope.name : '',
        }),
      });
      const cat = state.reportCat || '';
      state.report = { weekStart, end, cat, text, at: Date.now(), model: state.settings.aiModel };
      state.reportCache[`${weekStart}|${cat}`] = state.report;
      toast('周报已生成');
    } catch (err) {
      console.error(err);
      state.report = null;
      state.reportError = err.message || '未知错误';
    } finally {
      state.reportLoading = false;
      renderContent();
    }
  }

  function currentReport() {
    const weekStart = weekStartOf(state.date, state.settings.weekStart || 1);
    return {
      weekStart,
      report: (state.reportCache || {})[`${weekStart}|${state.reportCat || ''}`] || null,
    };
  }

  function downloadReport() {
    const { report } = currentReport();
    if (!report) return;
    const { weekStart, end, text } = report;
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

      case 'filter-cat': {
        state.catFilter = t.dataset.id || '';
        renderContent();
        break;
      }

      case 'report-cat': {
        state.reportCat = t.dataset.id || '';
        state.reportError = null;
        renderContent();
        break;
      }

      case 'add-cat-quick': {
        const raw = prompt('给新模块起个名字（例如：长期开发、副业、读书）', '新模块');
        const name = String(raw || '').trim();
        if (!name) return;
        const id = 'cat-' + Date.now().toString(36);
        await saveCategory({
          id,
          name: name.slice(0, 14),
          color: CAT_COLORS[state.categories.length % CAT_COLORS.length],
          sort_order: state.categories.length,
          created_at: new Date().toISOString(),
        });
        state.catFilter = id;
        await refresh();
        toast(`已新建模块「${name}」`);
        break;
      }

      case 'toggle-rule':
        state.ruleOpen = !state.ruleOpen;
        renderContent();
        break;

      case 'save-rule': {
        const ta = $('#report-template');
        const val = ta ? ta.value.trim() : '';
        state.settings = await saveSettings({ reportTemplate: val });   // 只改这一个字段，apiKey 原样保留
        state.ruleOpen = true;
        renderContent();
        toast(val ? '规则已保存，下次生成严格按它来' : '规则为空，回到默认四段结构');
        break;
      }

      case 'clear-rule': {
        state.settings = await saveSettings({ reportTemplate: '' });
        state.ruleOpen = true;
        renderContent();
        toast('规则已清空，回到默认四段结构');
        break;
      }

      case 'quick-add': {
        const input = $('#quick-input');
        const title = (input?.value || '').trim();
        if (!title) { input?.focus(); return; }
        await savePlan(makePlan({
          title,
          plan_date: state.date,
          category_id: state.catFilter || state.quickCat || state.categories[0]?.id,
        }));
        input.value = '';
        await refresh();
        $('#quick-input')?.focus();
        break;
      }

      case 'quick-detail': {
        const input = $('#quick-input');
        const typed = (input?.value || '').trim();
        if (input) input.value = '';
        openPlanModal(null, state.date, typed);
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

      case 'toggle-key': {
        const inp = $('#api-key');
        if (!inp) return;
        inp.type = inp.type === 'password' ? 'text' : 'password';
        if (inp.type === 'text') inp.focus();
        break;
      }

      case 'ai-preset': {
        const which = t.dataset.preset;
        const baseIn = $('#ai-base');
        const modelIn = $('#ai-model');
        if (!baseIn || !modelIn) return;
        if (which === 'custom') {
          baseIn.focus();
          baseIn.select();
          return;
        }
        if (which === 'deepseek') {
          baseIn.value = 'https://api.deepseek.com';
          modelIn.value = 'deepseek-chat';
        } else if (which === 'openai') {
          baseIn.value = 'https://api.openai.com/v1';
          modelIn.value = 'gpt-4o-mini';
        }
        $$('.ai-presets .chip').forEach(c => c.classList.toggle('on', c.dataset.preset === which));
        await persistAISettings();
        const msg = $('#ai-test-msg');
        if (msg) { msg.textContent = ''; msg.className = 'ai-test-msg'; }
        break;
      }

      case 'test-ai': {
        const msg = $('#ai-test-msg');
        const setMsg = (text, kind = '') => {
          if (!msg) return;
          msg.textContent = text;
          msg.className = 'ai-test-msg' + (kind ? ' ' + kind : '');
        };
        const s0 = await persistAISettings();
        if (!isConfigured(s0)) { setMsg('先填一个 API Key', 'bad'); return; }

        const btn = t;
        btn.disabled = true;
        setMsg('正在连接…');
        render();
        try {
          const r = await testAI({ baseUrl: s0.aiBaseUrl, apiKey: s0.apiKey, model: s0.aiModel });
          setMsg(`连接正常 · ${(r.ms / 1000).toFixed(1)} 秒`, 'ok');
          toast('AI 已接通，可以生成周报了');
        } catch (err) {
          setMsg(err.message || '连接失败', 'bad');
        } finally {
          btn.disabled = false;
        }
        break;
      }

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
          name: '新模块',
          color,
          sort_order: state.categories.length,
          created_at: new Date().toISOString(),
        });
        await refresh();
        openSettings();
        break;
      }

      case 'del-cat': {
        if (state.categories.length <= 1) { toast('至少要留一个模块'); return; }
        const c = state.categories.find(x => x.id === t.dataset.id);
        if (!confirm(`删除模块「${c.name}」？这个模块里的任务会归到第一个模块，不会丢。`)) return;
        await deleteCategory(t.dataset.id);
        if (state.reportCat === t.dataset.id) state.reportCat = '';
        await refresh();
        openSettings();
        toast('已删除模块');
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
        if (!confirm('清空全部任务、模块和统计？不可撤销，建议先导出备份。\n\nAI 配置（Key、地址、模型、周报规则）会保留。')) return;
        if (!confirm('真的要清空吗？')) return;
        const keep = await getSettings();          // 先记下配置，清空后原样写回，避免误删 Key
        await clearAll();
        await saveSettings({
          apiKey: keep.apiKey,
          aiBaseUrl: keep.aiBaseUrl,
          aiModel: keep.aiModel,
          reportTemplate: keep.reportTemplate,
          theme: keep.theme,
        });
        closeModal();
        await refresh();
        toast('已清空，AI 配置已保留');
        break;
      }

      case 'gen-report':
        generateReport();
        break;

      case 'copy-report': {
        const { report } = currentReport();
        if (!report) return;
        try {
          await navigator.clipboard.writeText(report.text);
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
