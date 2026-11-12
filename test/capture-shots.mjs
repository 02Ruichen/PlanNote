/* 生成作品介绍页用的界面截图。
   做法：真实加载应用 → 通过数据层写入示例任务 → 截图。
   周报截图走完整链路（本地模拟接口返回周报正文），保证渲染结果与真实使用一致。
   产出的图片保存在 app/shots/，是交付素材，不删除。 */
import path from 'node:path';
import os from 'node:os';
import fsp from 'node:fs/promises';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import {
  launchBrowser, startStaticServer, startMockAI, shot, sleep,
} from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(HERE, '..', 'app');
const OUT_DIR = path.join(APP_DIR, 'shots');

async function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/* 示例数据：面向上班族的真实感内容，完成度与周报正文保持一致 */
const DEMO_PLANS = [
  { d: 0, cat: '工作', title: '整理 Q3 数据复盘', p: 5 },
  { d: 0, cat: '工作', title: '写周报初稿', p: 4 },
  { d: 0, cat: '学习', title: '练一节 Python 数据处理', p: 3 },
  { d: 0, cat: '生活', title: '给窗台换两盆绿植', p: 2 },
  { d: 0, cat: '健康', title: '跑步 5 公里', p: 1, done: true },
  { d: 1, cat: '工作', title: '完成首页改版方案评审', p: 5, done: true },
  { d: 1, cat: '工作', title: '和设计对齐导航层级', p: 3, done: true },
  { d: 2, cat: '学习', title: '看完《设计心理学》第 3 章', p: 4, done: true },
  { d: 2, cat: '生活', title: '交本月物业费', p: 2, done: true },
];

const DEMO_REPORT = `# 11.09 – 11.15 周报

## 本周概览
这周记了 9 件事，完成 5 件。主线是首页改版评审和 Q3 数据复盘的准备，学习和运动被挤到了后半周。

## 精力分配
工作 4 条，占了一半；学习 2 条；生活 2 条；健康 1 条。工作明显偏重，周二之后就没有再记运动。

## 完成质量
- 首页改版评审：一次通过。导航层级改成「今日 / 周 / 月」三级之后，结构清楚了很多
- 《设计心理学》第 3 章：读完并整理了 5 条能直接用的原则
- Q3 数据复盘：埋点已拉齐，但留存口径和历史报表对不上，卡在这一步
- 周报初稿：框架搭好了，等复盘数据补齐才能填内容

## 下周建议
1. 周一先和数据同学对一次留存口径，把复盘这件事收口，别拖到周五
2. 首页改版进入交互走查，评审里提到的空状态问题一起处理掉
3. 运动和 Python 练习各留一个固定时段，别再排在待办最后`;

/* 规则面板示范内容：贴近真实公司周报模板 */
const DEMO_RULE = `公司周报格式要求
固定三个小节，顺序不能变：
1. 本周交付  2. 数据表现  3. 下周计划
每条用「·」开头，不超过 30 字
结尾署名：市场部 · 刘`;

const INJECT = (plans) => `(async () => {
  const cats = await getCategories();
  const byName = {};
  cats.forEach((c) => { byName[c.name] = c.id; });
  const base = todayStr();
  const shift = (n) => {
    const d = parseDateStr(base);
    d.setDate(d.getDate() - n);
    return toDateStr(d);
  };
  const items = ${JSON.stringify(plans)};
  for (const it of items) {
    await savePlan(makePlan({
      title: it.title,
      category_id: byName[it.cat] || cats[0].id,
      plan_date: shift(it.d),
      priority: it.p,
      status: it.done ? 'completed' : 'pending',
      completed_at: it.done ? new Date().toISOString() : null,
    }));
  }
  await saveSettings({
    aiBaseUrl: 'MOCK_BASE',
    apiKey: 'demo-key-for-screenshot',
    aiModel: 'deepseek-chat',
    reportTemplate: '',
  });
  return items.length;
})()`;

async function main() {
  await fsp.mkdir(OUT_DIR, { recursive: true });

  const appPort = await freePort();
  const aiPort = await freePort();
  const cdpPort = await freePort();
  const tmpRoot = path.join(os.tmpdir(), `plannote-shot-${Date.now()}`);

  const appSrv = await startStaticServer(APP_DIR, appPort);
  const mock = await startMockAI(aiPort);
  mock.state.reply = DEMO_REPORT;

  const { proc, cdp } = await launchBrowser({
    url: `http://127.0.0.1:${appPort}/app.html`,
    port: cdpPort,
    profileDir: path.join(tmpRoot, 'profile'),
  });

  const js = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', {
      expression: expr, awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };

  const viewport = async (w, h, mobile = false, dpr = 2) => {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: mobile ? dpr : 1.5, mobile,
    });
  };

  try {
    await sleep(1200);
    const n = await js(INJECT(DEMO_PLANS).replace('MOCK_BASE', `http://127.0.0.1:${aiPort}`));
    console.log(`已写入 ${n} 条示例任务`);

    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(1600);

    // 桌面 · 今日
    await viewport(1280, 800);
    await sleep(700);
    await shot(cdp, path.join(OUT_DIR, 'shot-day.png'));
    console.log('✓ shot-day.png');

    // 桌面 · 周视图
    await js(`document.querySelector('[data-view="week"]').click()`);
    await sleep(700);
    await shot(cdp, path.join(OUT_DIR, 'shot-week.png'));
    console.log('✓ shot-week.png');

    // 桌面 · 周报（走完整生成链路，内容较长，视口加高）
    await viewport(1280, 1040);
    await js(`document.querySelector('[data-view="report"]').click()`);
    await sleep(900);
    await js(`document.querySelector('[data-action="gen-report"]').click()`);
    for (let i = 0; i < 40; i++) {
      const ok = await js(`!!document.querySelector('.report-body')`);
      if (ok) break;
      await sleep(250);
    }
    await sleep(2600);   // 等提示条淡出，避免挡住内容
    await shot(cdp, path.join(OUT_DIR, 'shot-report.png'));
    console.log('✓ shot-report.png');

    // 桌面 · 周报规则面板展开（展示差异化能力，不保存）
    await js(`document.querySelector('[data-action="toggle-rule"]').click()`);
    await sleep(700);
    const filled = await js(`(() => {
      const t = document.querySelector('#report-template');
      if (!t) return false;
      t.value = ${JSON.stringify(DEMO_RULE)};
      t.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    if (filled) {
      await sleep(700);
      await shot(cdp, path.join(OUT_DIR, 'shot-rule.png'));
      console.log('✓ shot-rule.png');
    } else {
      console.log('! 没找到规则输入框，跳过 shot-rule');
    }

    // 手机 · 今日
    await viewport(390, 844, true, 3);
    await js(`document.querySelector('[data-view="day"]').click()`);
    await sleep(900);
    await shot(cdp, path.join(OUT_DIR, 'shot-mobile.png'));
    console.log('✓ shot-mobile.png');
  } finally {
    try { proc.kill(); } catch { /* ignore */ }
    appSrv.close();
    mock.server.close();
    await sleep(600);
    let removed = false;
    for (let i = 0; i < 6 && !removed; i++) {
      try { await fsp.rm(tmpRoot, { recursive: true, force: true }); removed = true; } catch { await sleep(400); }
    }
    console.log(removed ? '已清理临时浏览器目录' : `临时目录仍在：${tmpRoot}`);
  }
}

main().catch((e) => { console.error('截图失败：', e.message); process.exit(1); });
