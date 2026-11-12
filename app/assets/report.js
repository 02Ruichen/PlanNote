/* ============================================================
   PlanNote · 周报引擎
   三种模式：
     demo  —— 本地规则生成（零依赖、断网可用、面试官打开即有内容）
     proxy —— 走极简后端代理（Key 藏服务端）
     key   —— 用户自带 Key 直连（自用最省事）
   ============================================================ */


const PRIORITY_TEXT = { 1: '很简单', 2: '简单', 3: '中等', 4: '困难', 5: '很困难' };
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function rate(a, b) { return b ? Math.round((a / b) * 100) : 0; }

function summarize(plans, range) {
  const total = plans.length;
  const done = plans.filter(p => p.status === 'completed').length;
  const pending = plans.filter(p => p.status !== 'completed');
  const byCat = {};
  const byDay = {};
  for (const p of plans) {
    byCat[p.category_id] = byCat[p.category_id] || { total: 0, done: 0 };
    byCat[p.category_id].total++;
    if (p.status === 'completed') byCat[p.category_id].done++;
    byDay[p.plan_date] = byDay[p.plan_date] || { total: 0, done: 0, items: [] };
    byDay[p.plan_date].total++;
    if (p.status === 'completed') byDay[p.plan_date].done++;
    byDay[p.plan_date].items.push(p);
  }
  const activeDays = Object.values(byDay).filter(d => d.done > 0).length;
  const bestDay = Object.entries(byDay)
    .filter(([, d]) => d.done > 0)
    .sort((a, b) => b[1].done - a[1].done)[0];
  return { total, done, pending, rate: rate(done, total), byCat, byDay, activeDays, bestDay, range };
}

function fmtRange(start, end) {
  const s = start.split('-'), e = end.split('-');
  return `${s[0]}年${+s[1]}月${+s[2]}日 — ${+e[1]}月${+e[2]}日`;
}

/* ---------------- 本地演示模式 ---------------- */
function generateLocalReport({ plans, categories, start, end, prevPlans = [] }) {
  const cats = Object.fromEntries(categories.map(c => [c.id, c]));
  const cur = summarize(plans, [start, end]);
  const prev = summarize(prevPlans, []);
  const endDate = new Date(end.split('-')[0], end.split('-')[1] - 1, end.split('-')[2]);

  const lines = [];
  lines.push(`# 本周周报 · ${fmtRange(start, end)}`);
  lines.push('');
  lines.push(`> 本周共记录 **${cur.total}** 项计划，完成 **${cur.done}** 项，完成率 **${cur.rate}%**。`);
  lines.push('');

  /* 一、本周概览 */
  lines.push('## 一、本周概览');
  lines.push('');
  if (cur.total === 0) {
    lines.push('本周还没有记录任何计划。空白也是一种信息——下周可以先从每天 3 件小事开始。');
  } else {
    const diff = cur.rate - prev.rate;
    let trend;
    if (prev.total === 0) trend = '这是第一份有数据的周报，还没有可比的上周。';
    else if (diff > 5) trend = `比上周（${prev.rate}%）提升了 **${diff}** 个百分点，势头是往上走的。`;
    else if (diff < -5) trend = `比上周（${prev.rate}%）回落了 **${Math.abs(diff)}** 个百分点，节奏偏松了一些。`;
    else trend = `和上周（${prev.rate}%）基本持平，状态很稳。`;

    lines.push(`- **完成率**：${cur.done} / ${cur.total}，${cur.rate}%`);
    lines.push(`- **有效行动天数**：${cur.activeDays} 天`);
    if (cur.bestDay) {
      const d = cur.bestDay[0];
      const dow = WEEK_CN[new Date(d.split('-')[0], d.split('-')[1] - 1, d.split('-')[2]).getDay()];
      lines.push(`- **最高效的一天**：${+d.split('-')[1]}月${+d.split('-')[2]}日 ${dow}，完成 ${cur.bestDay[1].done} 项`);
    }
    lines.push(`- **环比**：${trend}`);
  }
  lines.push('');

  /* 二、精力分配 */
  lines.push('## 二、精力分配');
  lines.push('');
  if (cur.total === 0) {
    lines.push('暂无数据。');
  } else {
    const rows = Object.entries(cur.byCat)
      .map(([id, v]) => ({ name: cats[id]?.name || '未分类', ...v }))
      .sort((a, b) => b.total - a.total);
    for (const r of rows) {
      lines.push(`- **${r.name}**：${r.total} 项，完成 ${r.done} 项（${rate(r.done, r.total)}%）`);
    }
    const top = rows[0];
    if (top) {
      const share = rate(top.total, cur.total);
      if (share >= 60) {
        lines.push('');
        lines.push(`这一周的注意力有 **${share}%** 集中在「${top.name}」上。专注是好事，但如果长期如此，其他几块容易被慢慢放下。`);
      }
    }
  }
  lines.push('');

  /* 三、完成质量 */
  lines.push('## 三、完成质量');
  lines.push('');
  const hard = plans.filter(p => p.priority >= 4);
  const hardDone = hard.filter(p => p.status === 'completed');
  if (hard.length === 0) {
    lines.push('本周没有标记为「困难 / 很困难」的任务。如果确实如此，说明节奏轻松；也可能是难度评估偏保守了。');
  } else {
    lines.push(`高难度任务（困难及以上）共 **${hard.length}** 项，完成 **${hardDone.length}** 项，完成率 **${rate(hardDone.length, hard.length)}%**。`);
    if (hardDone.length) {
      lines.push('');
      lines.push('啃下来的硬骨头：');
      for (const p of hardDone.slice(0, 5)) {
        lines.push(`- ${p.title}（${PRIORITY_TEXT[p.priority]}）`);
      }
    }
    const hardLeft = hard.filter(p => p.status !== 'completed');
    if (hardLeft.length) {
      lines.push('');
      lines.push('还挂着的：');
      for (const p of hardLeft.slice(0, 5)) {
        lines.push(`- ${p.title}（${PRIORITY_TEXT[p.priority]}）`);
      }
    }
  }
  lines.push('');

  /* 四、下周建议 */
  lines.push('## 四、下周建议');
  lines.push('');
  const tips = [];
  if (cur.total === 0) {
    tips.push('先不追求完成率，只追求「每天都打开记录一次」。记录本身就会改变行为。');
  } else {
    if (cur.rate < 50) {
      tips.push(`完成率 ${cur.rate}% 偏低，先看看是不是每天排得太多。把日计划控制在 3–5 项，完成率自然会回流。`);
    } else if (cur.rate >= 85) {
      tips.push(`完成率 ${cur.rate}% 很漂亮，但也要留个心眼：是不是任务定得太轻了？下周可以挑 1 项需要多花力气的事。`);
    } else {
      tips.push(`完成率 ${cur.rate}% 处在健康区间，保持这个节奏就好。`);
    }
    if (cur.pending.length > 0) {
      const names = cur.pending.slice(0, 3).map(p => `「${p.title}」`).join('、');
      tips.push(`有 ${cur.pending.length} 项没完成，比如 ${names}。下周挑一件最想推进的，只挑一件，先做掉。`);
    }
    const weak = Object.entries(cur.byCat)
      .map(([id, v]) => ({ name: cats[id]?.name || '未分类', ...v }))
      .filter(r => r.total >= 2)
      .sort((a, b) => rate(a.done, a.total) - rate(b.done, b.total))[0];
    if (weak && rate(weak.done, weak.total) < 60) {
      tips.push(`「${weak.name}」这一块完成率只有 ${rate(weak.done, weak.total)}%，可能是时间没排给它，也可能它其实没那么重要。想清楚是哪一种。`);
    }
    if (cur.activeDays <= 2) {
      tips.push('有效行动天数偏少，试着把计划拆小到「15 分钟能开始」的颗粒度。');
    }
  }
  for (const t of tips) lines.push(`- ${t}`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*本报告由 PlanNote ${cur.total ? '根据你本周的 ' + cur.total + ' 条记录' : ''}自动生成。*`);

  return lines.join('\n');
}

/* ---------------- 提示词（代理 / 自带 Key 共用） ---------------- */
function buildPrompt({ plans, categories, start, end }) {
  const cats = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const rows = plans.map(p => {
    const t = p.start_time ? `${p.start_time}${p.end_time ? '-' + p.end_time : ''} ` : '';
    const st = p.status === 'completed' ? '已完成' : p.status === 'cancelled' ? '已取消' : '未完成';
    return `- [${p.plan_date}] ${t}${p.title}｜分类：${cats[p.category_id] || '未分类'}｜难度：${PRIORITY_TEXT[p.priority] || '中等'}｜${st}${p.description ? '｜备注：' + p.description : ''}`;
  }).join('\n');

  return `你是一位温和、务实、观察细致的工作复盘顾问。请根据下面这一周的计划记录，写一份中文周报。

周期：${start} 至 ${end}
共 ${plans.length} 条记录。

记录明细：
${rows || '（本周无记录）'}

要求：
1. 用 Markdown 输出，包含四个部分：本周概览、精力分配、完成质量、下周建议。
2. 用词具体，引用真实的任务名称和数字，不要空泛的套话。
3. 语气克制、真诚，像一个了解对方的朋友在帮她梳理，不要说教，不要用感叹号堆砌情绪。
4. 下周建议给 2–4 条，必须可执行。
5. 直接输出周报正文，不要任何开场白或解释。`;
}

/* ---------------- 代理模式 ---------------- */
async function generateViaProxy({ endpoint, prompt, apiKey }) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: '你是一位温和、务实的工作复盘顾问。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`代理返回 ${res.status}`);
  const data = await res.json();
  const text = data.report || data.content || data.text
    || data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('代理返回内容为空');
  return text.trim();
}

/* ---------------- 自带 Key 直连 DeepSeek ---------------- */
async function generateViaKey({ apiKey, model, prompt }) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一位温和、务实的工作复盘顾问。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      stream: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`请求失败 ${res.status}${t ? '：' + t.slice(0, 120) : ''}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('返回内容为空');
  return text.trim();
}

/* ---------------- 极简 Markdown 渲染 ---------------- */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md) {
  const lines = esc(md).split('\n');
  const out = [];
  let inList = false;

  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

  for (let raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }

    if (/^---$/.test(line.trim())) { closeList(); out.push('<hr>'); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }

    if (/^&gt;\s?/.test(line)) {
      closeList();
      out.push(`<p class="md-quote">${inline(line.replace(/^&gt;\s?/, ''))}</p>`);
      continue;
    }

    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

/* ---------------- 统计辅助 ---------------- */
function computeStreak(plans) {
  const days = new Set(
    plans.filter(p => p.status === 'completed').map(p => p.plan_date)
  );
  let streak = 0;
  let cursor = todayStr();
  // 今天没完成不算断，从今天或昨天起算
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function weekRangeOf(dateStr, weekStartDay = 1) {
  const start = weekStartOf(dateStr, weekStartDay);
  const dates = weekDates(start);
  return { start, end: dates[6], dates };
}
