/* ============================================================
   PlanNote · 周报引擎
   直接调用兼容 OpenAI 格式的接口（DeepSeek / OpenAI / 自建代理均可）
   ============================================================ */

const PRIORITY_TEXT = { 1: '很简单', 2: '简单', 3: '中等', 4: '困难', 5: '很困难' };
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

/* ---------------- 地址与报错 ---------------- */

// 兼容三种写法：裸域名 / 带版本号 / 已经是完整路径
function endpointOf(baseUrl) {
  let u = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!u) u = DEFAULT_BASE_URL;
  if (/\/chat\/completions$/.test(u)) return u;
  if (/\/v\d+$/.test(u)) return u + '/chat/completions';
  return u + '/chat/completions';
}

function isConfigured(settings) {
  return !!(settings && String(settings.apiKey || '').trim());
}

function friendlyError(status, body) {
  const detail = String(body || '').trim().slice(0, 160);
  if (status === 401 || status === 403) return 'API Key 无效或没有权限，请到设置里检查';
  if (status === 402) return '账户余额不足，请先充值';
  if (status === 404) return '接口地址不对（404），请检查服务地址是否填错';
  if (status === 429) return '请求太频繁或额度用尽，稍等一会儿再试';
  if (status >= 500) return `模型服务暂时不可用（${status}），稍后再试`;
  return `请求失败（${status}）${detail ? '：' + detail : ''}`;
}

function networkError() {
  return '连不上模型服务。检查一下网络，或换个能访问的服务地址——国内用 DeepSeek 最省事';
}

/* ---------------- 调用 ---------------- */

async function callAI({ baseUrl, apiKey, model, prompt, system }) {
  const url = endpointOf(baseUrl);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${String(apiKey).trim()}`,
      },
      body: JSON.stringify({
        model: (model || DEFAULT_MODEL).trim(),
        messages: [
          { role: 'system', content: system || '你是一位温和、务实的工作复盘顾问。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        stream: false,
      }),
    });
  } catch (err) {
    throw new Error(networkError());
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(friendlyError(res.status, body));
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('返回的不是标准 JSON，可能是地址指向了错误的服务');
  }

  const text = data?.choices?.[0]?.message?.content
    || data?.report || data?.content || data?.text;
  if (!text || !String(text).trim()) throw new Error('模型返回了空内容，再试一次');
  return String(text).trim();
}

/* 测试连接：发一个极短的请求，只验通不通、Key 对不对 */
async function testAI({ baseUrl, apiKey, model }) {
  if (!isConfigured({ apiKey })) throw new Error('还没填 API Key');
  const started = Date.now();
  const reply = await callAI({
    baseUrl,
    apiKey,
    model,
    system: '你是一个测试助手，只回复两个字。',
    prompt: '回复：连接成功',
  });
  return { ms: Date.now() - started, reply: String(reply).slice(0, 40) };
}

/* ---------------- 提示词 ---------------- */

function buildPrompt({ plans, categories, start, end }) {
  const cats = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const rows = plans.map(p => {
    const t = p.start_time ? `${p.start_time}${p.end_time ? '-' + p.end_time : ''} ` : '';
    const st = p.status === 'completed' ? '已完成' : p.status === 'cancelled' ? '已取消' : '未完成';
    return `- [${p.plan_date}] ${t}${p.title}｜分类：${cats[p.category_id] || '未分类'}｜难度：${PRIORITY_TEXT[p.priority] || '中等'}｜${st}${p.description ? '｜备注：' + p.description : ''}`;
  }).join('\n');

  return `请根据下面这一周的计划记录，写一份中文周报。

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
