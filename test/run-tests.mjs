/* ============================================================
   PlanNote 端到端测试
   覆盖：1) 自定义创建项目(模块)  2) 按指定项目生成周报  3) 周报规则真实生效

   隔离策略：所有数据都写在一次性的 Chrome 临时用户目录里，
   用完整个目录删掉 —— 你本机浏览器里的数据、Key、任务一条都不会被碰到。
   ============================================================ */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, startStaticServer, startMockAI, sleep, shot } from './cdp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '../app');
const LIVE = process.argv.includes('--live');
const KEEP_ARTIFACTS = process.argv.includes('--keep');

/* ---------------- 测试数据（都带 PN-TEST 前缀，便于识别与清理） ---------------- */
const T = {
  projA: 'PN-TEST-项目A',
  projB: 'PN-TEST-项目B',
  aTask1: 'PNTEST-A-任务1 写登录页',
  aTask2: 'PNTEST-A-任务2 联调接口',
  bTask1: 'PNTEST-B-任务1 整理竞品',
  key: 'test-key-local-only',
  model: 'mock-model',
};

const RULE = [
  '标题固定为「PNTEST 周报」',
  '必须依次包含三个小节：一、本周交付　二、风险与阻塞　三、下周计划',
  '每条以「● 」开头，并在句末标注所属模块',
  '全文不超过 300 字，语气正式，不用第一人称',
  '最后一行固定写：-- 由 PlanNote 生成 --',
].join('\n');

const RULE_REPLY = [
  '## PNTEST 周报',
  '',
  '### 一、本周交付',
  '● 完成登录页开发（PN-TEST-项目A）',
  '● 接口联调通过（PN-TEST-项目A）',
  '',
  '### 二、风险与阻塞',
  '● 无明显阻塞（PN-TEST-项目A）',
  '',
  '### 三、下周计划',
  '● 补齐异常分支（PN-TEST-项目A）',
  '',
  '-- 由 PlanNote 生成 --',
].join('\n');

/* ---------------- 结果收集 ---------------- */
const cases = [];
const infos = [];
function newCase(id, name) {
  const c = { id, name, checks: [], notes: [] };
  cases.push(c);
  return c;
}
function check(c, label, pass, detail = '') {
  c.checks.push({ label, pass: !!pass, detail });
  return !!pass;
}
function note(c, text) { c.notes.push(text); }
function info(text) { infos.push(text); }

const failures = () => cases.flatMap((c) => c.checks.filter((k) => !k.pass).map((k) => `${c.id} · ${k.label}`));

/* ---------------- 工具 ---------------- */
function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

async function until(cdp, expr, { ms = 8000, label = expr } = {}) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < ms) {
    try {
      // 包一层 async：既能等同步表达式，也能等 Promise
      last = await cdp.evaluate(`(async () => { try { return !!(${expr}) } catch (e) { return false } })()`);
      if (last) return true;
    } catch (e) { last = e.message; }
    await sleep(90);
  }
  throw new Error('等待超时：' + label + (last ? `（最后：${last}）` : ''));
}

const HELPERS = String.raw`
window.__pn = {
  q: (s) => document.querySelector(s),
  all: (s) => Array.from(document.querySelectorAll(s)),
  text: (s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim(),
  click: (s) => { const el = document.querySelector(s); if (!el) throw new Error('找不到元素 ' + s); el.click(); return true; },
  clickByText: (sel, txt) => {
    const el = Array.from(document.querySelectorAll(sel)).find(e => e.textContent.includes(txt));
    if (!el) throw new Error('找不到含「' + txt + '」的 ' + sel); el.click(); return true;
  },
  fill: (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('找不到 ' + s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; },
  set: (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('找不到 ' + s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; },
  setEl: (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; },
  cats: () => getCategories().then(list => list.map(c => ({ id: c.id, name: c.name }))),
  plans: () => getPlans().then(list => list.map(p => ({ id: p.id, title: p.title, cat: p.category_id, date: p.plan_date }))),
  settings: () => getSettings().then(s => ({ apiKey: s.apiKey, aiBaseUrl: s.aiBaseUrl, aiModel: s.aiModel, reportTemplate: s.reportTemplate })),
  catId: (name) => getCategories().then(list => (list.find(c => c.name === name) || {}).id || ''),
};
true;
`;

const shotFiles = [];
const SHOT_DIR = path.join(os.tmpdir(), 'plannote-shots');

/* ---------------- 主流程 ---------------- */
async function main() {
  const [appPort, mockPort, cdpPort] = [await freePort(), await freePort(), await freePort()];
  const mockUrl = `http://127.0.0.1:${mockPort}`;
  const appUrl = `http://127.0.0.1:${appPort}/app.html`;   // 应用本体（index.html 已改为作品介绍页）

  const tmpRoot = path.join(os.tmpdir(), `plannote-test-${Date.now()}`);
  const profileDir = path.join(tmpRoot, 'chrome-profile');
  await fsp.mkdir(profileDir, { recursive: true });
  await fsp.rm(SHOT_DIR, { recursive: true, force: true });
  await fsp.mkdir(SHOT_DIR, { recursive: true });

  info(`应用地址：${appUrl}`);
  info(`模拟 AI：${mockUrl}（只在本机进程内，不联网）`);
  info(`隔离目录：${profileDir}`);

  const staticServer = await startStaticServer(APP_ROOT, appPort);
  const { server: mockServer, state: mock } = await startMockAI(mockPort);
  let browser = null;
  let cdp = null;

  try {
    browser = await launchBrowser({ url: appUrl, port: cdpPort, profileDir });
    cdp = browser.cdp;
    const js = (expr) => cdp.evaluate(expr);

    await until(cdp, `document.querySelectorAll('#nav .nav-item').length === 5`, { label: '应用首屏' });
    await js(HELPERS);
    await until(cdp, `__pn.cats().then(c => c.length >= 5)`);
    // 关掉 Service Worker，避免读到上一轮缓存
    await js(`navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).then(() => true)`);

    /* ================= T0 起始状态 ================= */
    const c0 = newCase('T0', '测试环境与初始状态');
    const baseCats = await js(`__pn.cats()`);
    const basePlans = await js(`__pn.plans()`);
    check(c0, '页面能正常打开，5 个导航项就位', true, `初始模块 ${baseCats.length} 个：${baseCats.map((c) => c.name).join('、')}`);
    check(c0, '初始没有任务记录（干净起点）', basePlans.length === 0, `plans = ${basePlans.length}`);

    /* ================= T1 自定义创建项目 ================= */
    const c1 = newCase('T1', '能否自定义创建项目（模块）');
    await js(`__pn.click('[data-action="settings"]')`);
    await until(cdp, `document.querySelector('#cat-list')`);
    const beforeAdd = (await js(`__pn.cats()`)).length;

    await js(`__pn.click('[data-action="add-cat"]')`);
    await until(cdp, `__pn.cats().then(c => c.length === ${beforeAdd + 1})`, { label: '新增模块落库' });
    const afterAdd = await js(`__pn.cats()`);
    check(c1, '设置里「新建模块」能加出一个新模块', afterAdd.length === beforeAdd + 1, `${beforeAdd} → ${afterAdd.length}`);

    // 改名成可识别的测试项目名
    await until(cdp, `__pn.all('input[data-cat-name]').some(i => i.value === '新模块')`, { label: '新模块出现在列表里' });
    const renamed = await js(`(() => {
      const inp = __pn.all('input[data-cat-name]').find(i => i.value === '新模块');
      if (!inp) return false;
      __pn.setEl(inp, ${JSON.stringify(T.projA)});
      return true;
    })()`);
    await sleep(350);
    const catsNow = await js(`__pn.cats()`);
    const projA = catsNow.find((c) => c.name === T.projA);
    check(c1, '新模块可以改名成自己的项目名', !!projA && renamed, projA ? `id=${projA.id}` : '没找到改名结果');

    await js(`__pn.click('[data-action="close-modal"]')`);
    await until(cdp, `!document.querySelector('#api-key')`, { label: '设置面板关闭' });

    const chipExists = await js(`__pn.all('.mod-bar .mod-chip').some(el => el.textContent.includes(${JSON.stringify(T.projA)}))`);
    check(c1, '新项目出现在日视图的模块筛选条里（和内置模块同一层级）', chipExists);

    // 在项目内建任务
    await js(`__pn.clickByText('.mod-bar .mod-chip', ${JSON.stringify(T.projA)})`);
    await sleep(250);
    const placeholder = await js(`__pn.q('#quick-input').placeholder`);
    check(c1, '选中新项目后，输入框提示跟着切换', placeholder.includes(T.projA), `placeholder=「${placeholder}」`);

    await js(`__pn.fill('#quick-input', ${JSON.stringify(T.aTask1)}); __pn.click('[data-action="quick-add"]'); true`);
    await until(cdp, `__pn.plans().then(p => p.some(x => x.title === ${JSON.stringify(T.aTask1)}))`, { label: '任务落库' });
    const plans1 = await js(`__pn.plans()`);
    const a1 = plans1.find((p) => p.title === T.aTask1);
    check(c1, '能在新项目里建任务，任务归属正确', a1 && a1.cat === projA.id, a1 ? `category_id=${a1.cat}` : '任务没建上');

    // 刷新后仍在
    await cdp.send('Page.reload', { ignoreCache: true });
    await until(cdp, `document.querySelectorAll('#nav .nav-item').length === 5`, { label: '刷新后首屏' });
    await js(HELPERS);
    await until(cdp, `__pn.cats().then(c => c.length >= ${beforeAdd + 1})`);
    const afterReload = await js(`__pn.cats()`);
    const plansReload = await js(`__pn.plans()`);
    check(c1, '刷新页面后项目仍在（真的存进本地库，不是内存态）', afterReload.some((c) => c.name === T.projA));
    check(c1, '刷新后任务仍在', plansReload.some((p) => p.title === T.aTask1));

    /* ================= T2 按指定项目生成周报 ================= */
    const c2 = newCase('T2', '能否基于指定项目生成周报');

    // 建第二个项目（走日视图那排的「新建模块」快捷入口，顺带覆盖 prompt 分支）
    await js(`window.prompt = () => ${JSON.stringify(T.projB)}; true`);
    const beforeB = (await js(`__pn.cats()`)).length;
    await js(`__pn.click('[data-action="add-cat-quick"]')`);
    await until(cdp, `__pn.cats().then(c => c.length === ${beforeB + 1})`, { label: '项目B创建' });
    const cats2 = await js(`__pn.cats()`);
    const projB = cats2.find((c) => c.name === T.projB);
    check(c2, '创建第二个项目（用于交叉污染检查）', !!projB, projB ? `id=${projB.id}` : '失败');

    await sleep(250);
    await js(`__pn.fill('#quick-input', ${JSON.stringify(T.bTask1)}); __pn.click('[data-action="quick-add"]'); true`);
    await until(cdp, `__pn.plans().then(p => p.some(x => x.title === ${JSON.stringify(T.bTask1)}))`);

    // 回项目A 再补一条
    await js(`__pn.clickByText('.mod-bar .mod-chip', ${JSON.stringify(T.projA)})`);
    await sleep(200);
    await js(`__pn.fill('#quick-input', ${JSON.stringify(T.aTask2)}); __pn.click('[data-action="quick-add"]'); true`);
    await until(cdp, `__pn.plans().then(p => p.some(x => x.title === ${JSON.stringify(T.aTask2)}))`);
    const totalPlans = (await js(`__pn.plans()`)).length;
    check(c2, '本周共有 3 条测试记录（A 两条 / B 一条）', totalPlans === 3, `plans = ${totalPlans}`);

    // 通过设置界面接入（指向本地模拟服务）
    await js(`__pn.click('[data-action="settings"]')`);
    await until(cdp, `document.querySelector('#api-key')`);
    await js(`__pn.set('#api-key', ${JSON.stringify(T.key)})`);
    await sleep(200);
    await js(`__pn.set('#ai-base', ${JSON.stringify(mockUrl)})`);
    await sleep(200);
    await js(`__pn.set('#ai-model', ${JSON.stringify(T.model)})`);
    await sleep(400);
    const st1 = await js(`__pn.settings()`);
    check(c2, 'AI 配置能从设置界面写入（Key/地址/模型）', st1.apiKey === T.key && st1.aiBaseUrl === mockUrl && st1.aiModel === T.model, JSON.stringify({ base: st1.aiBaseUrl, model: st1.aiModel, keyLen: (st1.apiKey || '').length }));
    await js(`__pn.click('[data-action="close-modal"]')`);

    // 进入 AI 周报
    await js(`__pn.click('[data-view="report"]')`);
    await until(cdp, `document.querySelector('.report-scope')`, { label: '周报页范围选择器' });
    check(c2, '周报页出现「周报范围」选择器（新增能力）', true);

    const scopeRow = await js(`__pn.text('.report-scope')`);
    check(c2, '范围选择器列出了两个测试项目', scopeRow.includes(T.projA) && scopeRow.includes(T.projB), scopeRow.slice(0, 120));

    // 规则面板是开合状态，别硬点 toggle（否则可能反而关掉）
    async function openRulePanel() {
      if (!(await js(`!!document.querySelector('#report-template')`))) {
        await js(`__pn.click('[data-action="toggle-rule"]')`);
      }
      await until(cdp, `document.querySelector('#report-template')`, { label: '规则面板展开' });
    }

    async function genAndCapture(scopeId, expectLabel) {      const before = mock.requests.length;
      await js(`__pn.click(${JSON.stringify(`[data-action="report-cat"][data-id="${scopeId}"]`)})`);
      await sleep(200);
      await js(`__pn.click('[data-action="gen-report"]')`);
      const t0 = Date.now();
      while (Date.now() - t0 < 15000) {
        const s = await (await fetch(`${mockUrl}/_state`)).json();
        if (s.requests.length > before) {
          await until(cdp, `document.querySelector('.report-body')`, { label: '周报渲染' });
          return s.requests[s.requests.length - 1];
        }
        await sleep(120);
      }
      throw new Error(`没有向模型发出请求（${expectLabel}）`);
    }

    const reqA = await genAndCapture(projA.id, 'scope A');
    check(c2, '按「项目A」生成时，请求里只有 A 的任务', reqA.prompt.includes(T.aTask1) && reqA.prompt.includes(T.aTask2) && !reqA.prompt.includes(T.bTask1),
      `含A1=${reqA.prompt.includes(T.aTask1)} 含A2=${reqA.prompt.includes(T.aTask2)} 含B=${reqA.prompt.includes(T.bTask1)}`);
    check(c2, '请求里明确声明了统计范围，并要求不提其它模块',
      reqA.prompt.includes(`只统计「${T.projA}」`) && /不要提及/.test(reqA.prompt));
    check(c2, '记录条数与范围一致（2 条）', reqA.prompt.includes('共 2 条记录'), (reqA.prompt.match(/共 \d+ 条记录/) || [''])[0]);

    const reqB = await genAndCapture(projB.id, 'scope B');
    check(c2, '切到「项目B」后，请求换成 B 的任务、且不含 A 的任务',
      reqB.prompt.includes(T.bTask1) && !reqB.prompt.includes(T.aTask1) && !reqB.prompt.includes(T.aTask2));
    check(c2, 'B 的请求同样是 1 条记录', reqB.prompt.includes('共 1 条记录'), (reqB.prompt.match(/共 \d+ 条记录/) || [''])[0]);

    const reqAll = await genAndCapture('', 'all');
    check(c2, '切回「全部模块」时三条都在、且没有范围限定语句',
      reqAll.prompt.includes(T.aTask1) && reqAll.prompt.includes(T.bTask1) && reqAll.prompt.includes(T.aTask2) && !/只统计「/.test(reqAll.prompt));
    check(c2, '全部模块时为 3 条记录', reqAll.prompt.includes('共 3 条记录'), (reqAll.prompt.match(/共 \d+ 条记录/) || [''])[0]);

    // 两份周报互不覆盖（切换范围不会丢已生成的那份）
    await js(`__pn.click(${JSON.stringify(`[data-action="report-cat"][data-id="${projA.id}"]`)})`);
    await sleep(250);
    const backToA = await js(`__pn.q('.report-body') ? __pn.text('.report-body').slice(0, 40) : ''`);
    check(c2, '切回项目A，之前生成的那份还在（按周+范围分别缓存）', backToA.length > 0, backToA);

    shotFiles.push(await shot(cdp, path.join(SHOT_DIR, 'report-scope.png')));

    /* ================= T3 规则配置是否真实生效 ================= */
    const c3 = newCase('T3', '周报规则 / 模板是否真实生效');

    await fetch(`${mockUrl}/_reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: RULE_REPLY }),
    });

    // 写入规则
    await openRulePanel();
    await js(`__pn.fill('#report-template', ${JSON.stringify(RULE)})`);
    await js(`__pn.click('[data-action="save-rule"]')`);
    await sleep(350);
    const stRule = await js(`__pn.settings()`);
    check(c3, '规则能保存进本地设置', stRule.reportTemplate.trim() === RULE.trim(), `${stRule.reportTemplate.length} 字`);
    check(c3, '保存规则没有弄丢 API Key（字段级合并）', stRule.apiKey === T.key, `keyLen=${(stRule.apiKey || '').length}`);

    const reqRule = await genAndCapture('', 'rule on');
    check(c3, '规则原文被完整塞进提示词', reqRule.prompt.includes(RULE), `提示词 ${reqRule.prompt.length} 字`);
    check(c3, '规则被包进高优先级区块，并声明冲突时以它为准',
      reqRule.prompt.includes('<<<规则开始') && reqRule.prompt.includes('规则结束>>>') && reqRule.prompt.includes('硬性要求'));
    check(c3, '规则块排在通用要求之前（先约束、再补充）',
      reqRule.prompt.indexOf('<<<规则开始') < reqRule.prompt.indexOf('通用要求：'));
    check(c3, '有规则时，通用要求第 1 条改成「严格按上面规则输出」',
      reqRule.prompt.includes('严格按上面「规则 / 模板」'));

    // 模型按规则返回时，页面渲染是否正确（标题/小节/结尾都保留）
    const bodyText = await js(`__pn.text('.report-body')`);
    check(c3, '模型输出的规则化结构能正确渲染（含自定义标题）', bodyText.includes('PNTEST 周报'), bodyText.slice(0, 60));
    check(c3, '三个自定义小节都渲染出来了', ['一、本周交付', '二、风险与阻塞', '三、下周计划'].every((s) => bodyText.includes(s)));
    check(c3, '规则要求的结尾落款保留', bodyText.includes('-- 由 PlanNote 生成 --'));
    const hasDefaultSections = ['本周概览', '精力分配', '完成质量'].some((s) => bodyText.includes(s));
    check(c3, '输出里没有默认四段结构的残留', !hasDefaultSections);

    shotFiles.push(await shot(cdp, path.join(SHOT_DIR, 'report-rule.png')));

    // 刷新后规则仍在（证明落库，而不是只在内存里）
    await cdp.send('Page.reload', { ignoreCache: true });
    await until(cdp, `document.querySelectorAll('#nav .nav-item').length === 5`);
    await js(HELPERS);
    await until(cdp, `__pn.settings().then(s => !!s)`);
    const stReload = await js(`__pn.settings()`);
    check(c3, '刷新后规则与 Key 都还在', stReload.reportTemplate.trim() === RULE.trim() && stReload.apiKey === T.key);

    await js(`__pn.click('[data-view="report"]')`);
    await until(cdp, `document.querySelector('.report-scope')`);
    const reqAfterReload = await genAndCapture('', 'rule after reload');
    check(c3, '刷新后生成，规则仍然进入提示词', reqAfterReload.prompt.includes(RULE));

    // 清空规则 → 回到默认结构
    await openRulePanel();
    await js(`__pn.click('[data-action="clear-rule"]')`);
    await sleep(300);
    const reqNoRule = await genAndCapture('', 'rule cleared');
    check(c3, '清空规则后提示词不再包含规则块', !reqNoRule.prompt.includes('<<<规则开始'));
    check(c3, '清空规则后回到默认四段要求', reqNoRule.prompt.includes('本周概览') && reqNoRule.prompt.includes('精力分配'));
    const stNoRule = await js(`__pn.settings()`);
    check(c3, '清空规则同样没有弄丢 Key', stNoRule.apiKey === T.key);

    /* ================= T4 真实模型调用（可选） ================= */
    const c4 = newCase('T4', '真实模型调用（可选）');
    const keyFile = path.join(__dirname, '.key');
    const liveKey = (process.env.PN_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : ''));
    if (!LIVE) {
      note(c4, '本次未启用 --live，跳过真实调用（结果以 T1–T3 的确定性断言为准）');
    } else if (!liveKey) {
      note(c4, '没有找到 Key（可放 test/.key 或用 PN_API_KEY 传入），跳过真实调用');
    } else {
      // 恢复规则 + 指向真实服务
      await openRulePanel();
      await js(`__pn.fill('#report-template', ${JSON.stringify(RULE)})`);
      await js(`__pn.click('[data-action="save-rule"]')`);
      await sleep(250);
      await js(`__pn.click('[data-action="settings"]')`);
      await until(cdp, `document.querySelector('#api-key')`);
      await js(`__pn.set('#api-key', ${JSON.stringify(liveKey)})`);
      await sleep(150);
      await js(`__pn.set('#ai-base', 'https://api.deepseek.com')`);
      await sleep(150);
      await js(`__pn.set('#ai-model', 'deepseek-chat')`);
      await sleep(400);
      await js(`__pn.click('[data-action="close-modal"]')`);

      // 刷新一下：清掉内存里 T2/T3 生成的模拟周报缓存，确保看到的是真实返回
      await cdp.send('Page.reload', { ignoreCache: true });
      await until(cdp, `document.querySelectorAll('#nav .nav-item').length === 5`);
      await js(HELPERS);
      await until(cdp, `__pn.settings().then(s => !!s)`);
      await js(`__pn.click('[data-view="report"]')`);
      await until(cdp, `document.querySelector('.report-scope')`);

      await js(`__pn.click(${JSON.stringify(`[data-action="report-cat"][data-id="${projA.id}"]`)})`);
      await sleep(250);
      const beforeClick = await js(`__pn.q('.report-body') ? __pn.text('.report-body') : ''`);
      check(c4, '真实调用前页面没有缓存周报（避免误判）', !beforeClick);

      await js(`__pn.click('[data-action="gen-report"]')`);
      const t0 = Date.now();
      let body = '';
      let err = '';
      while (Date.now() - t0 < 120000) {
        body = await js(`__pn.q('.report-body') ? __pn.text('.report-body') : ''`);
        err = await js(`__pn.q('.empty-ico.err') ? __pn.text('.report-card .empty-sub') : ''`);
        if (body) break;
        if (err) break;
        await sleep(600);
      }
      check(c4, '真实接口调用成功返回内容', !!body, body ? body.slice(0, 60) : err);
      if (!body) {
        const authFailed = /API Key 无效|没有权限/.test(err);
        note(c4, authFailed ? '这是 Key 侧的问题（401），不是应用逻辑问题；换一个有效 Key 后可复跑' : '调用失败，见上面的返回');
        check(c4, 'Key 失效时给出看得懂的提示，不白屏、不静默失败', authFailed, err);
      }
      if (body) {
        note(c4, '真实返回：' + body.replace(/\s+/g, ' ').slice(0, 220));
        check(c4, '真实模型遵守了自定义标题「PNTEST 周报」', body.includes('PNTEST 周报'));
        check(c4, '真实模型给出了规则要求的三个小节',
          ['本周交付', '风险与阻塞', '下周计划'].every((s) => body.includes(s)));
        check(c4, '真实模型带上了固定落款', body.includes('由 PlanNote 生成'));
        check(c4, '真实返回里没有混进项目B的内容（范围限定生效）',
          !body.includes('整理竞品') && !body.includes(T.bTask1));
      }
    }

    /* ================= T5 Key 保全回归 ================= */
    const c5 = newCase('T5', '配置改动不丢 Key（回归）');
    const stFinal = await js(`__pn.settings()`);
    check(c5, '整轮测试后 Key 仍是接入时的值', stFinal.apiKey === (LIVE && liveKey ? liveKey : T.key),
      `keyLen=${(stFinal.apiKey || '').length}`);
    check(c5, '任务与项目数据完好', (await js(`__pn.plans()`)).length === 3 && (await js(`__pn.cats()`)).length === baseCats.length + 2);
  } finally {
    /* ---------------- 清理 ---------------- */
    try { cdp?.close(); } catch { /* ignore */ }
    try { browser?.proc?.kill(); } catch { /* ignore */ }
    await sleep(600);
    // 干掉可能残留的子进程
    try { browser?.proc?.kill('SIGKILL'); } catch { /* ignore */ }
    try { staticServer.close(); } catch { /* ignore */ }
    try { mockServer.close(); } catch { /* ignore */ }

    let removed = false;
    if (!KEEP_ARTIFACTS) {
      for (let i = 0; i < 5; i++) {
        try { await fsp.rm(tmpRoot, { recursive: true, force: true }); } catch { /* chrome 可能还在退出 */ }
        if (!fs.existsSync(tmpRoot)) { removed = true; break; }
        await sleep(400);
      }
    }
    info(removed ? `已删除隔离目录（含浏览器数据、测试任务、项目）：${tmpRoot}` : `隔离目录仍在（可能被占用）：${tmpRoot}`);
    info(`截图（内部校验用）：${SHOT_DIR}`);
  }

  return { removed: true };
}

/* ---------------- 输出 ---------------- */
function render() {
  const line = '─'.repeat(64);
  const out = [];
  out.push('');
  out.push('PlanNote 测试结果');
  out.push(line);
  for (const c of cases) {
    const pass = c.checks.filter((k) => k.pass).length;
    const total = c.checks.length;
    const flag = total === 0 ? '○' : pass === total ? '✓' : '✗';
    out.push(`${flag} ${c.id} ${c.name}　${total ? `${pass}/${total}` : ''}`);
    for (const k of c.checks) {
      out.push(`    ${k.pass ? '·' : '✗'} ${k.label}${k.detail ? `　→ ${k.detail}` : ''}`);
    }
    for (const n of c.notes) out.push(`    – ${n}`);
  }
  out.push(line);
  const totalChecks = cases.reduce((n, c) => n + c.checks.length, 0);
  const passed = cases.reduce((n, c) => n + c.checks.filter((k) => k.pass).length, 0);
  out.push(`合计 ${passed}/${totalChecks} 项通过`);
  if (infos.length) {
    out.push('');
    infos.forEach((i) => out.push('· ' + i));
  }
  console.log(out.join('\n'));
}

main().then(() => {
  render();
  const f = failures();
  if (f.length) {
    console.log('\n未通过：\n' + f.map((x) => '  - ' + x).join('\n'));
    process.exitCode = 1;
  }
}).catch((err) => {
  console.error('\n测试中断：', err.message);
  render();
  process.exitCode = 2;
});
