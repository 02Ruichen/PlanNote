/* 线上验收：对已部署的站点做真实浏览器检查
   覆盖：首页渲染、应用跳转、Service Worker 注册、断网可用、数据隔离 */
import path from 'node:path';
import os from 'node:os';
import fsp from 'node:fs/promises';
import { launchBrowser, sleep } from './cdp.mjs';

const SITE = 'https://02ruichen.github.io/PlanNote/';
const OUT = path.join(os.tmpdir(), 'plannote-online');
const root = path.join(os.tmpdir(), `pn-online-${Date.now()}`);

const PORT = 9300 + Math.floor(Math.random() * 400);
const { proc, cdp } = await launchBrowser({
  url: SITE, port: PORT, profileDir: path.join(root, 'p'),
});

const js = async (e) => {
  const r = await cdp.send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  → ' + detail : ''}`);
};

const snap = async (file) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await fsp.writeFile(file, Buffer.from(data, 'base64'));
};

try {
  await fsp.mkdir(OUT, { recursive: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1.5, mobile: false });
  await sleep(4500);   // 等外网资源

  const title = await js(`document.title`);
  check('首页标题正确', /PlanNote/.test(title || ''), title);

  const h1 = await js(`(document.querySelector('h1') || {}).textContent || ''`);
  check('首屏大标题已渲染', h1.includes('周报'), h1.slice(0, 40));

  // 先滚一遍页面触发懒加载，再统计图片（否则视口外的图不会开始下载）
  await js(`(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 220));
    }
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    await Promise.all(Array.from(document.images).map(i => (i.complete && i.naturalWidth) ? 0 : new Promise(r => { i.onload = r; i.onerror = r; })));
    window.scrollTo(0, 0);
    return true;
  })()`);
  await sleep(900);
  const imgOk = await js(`(() => {
    const im = Array.from(document.images);
    return {
      total: im.length,
      loaded: im.filter(i => i.complete && i.naturalWidth > 0).length,
      broken: im.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
    };
  })()`);
  check('介绍页配图全部加载', imgOk.loaded === imgOk.total, `${imgOk.loaded}/${imgOk.total}${imgOk.broken.length ? ' 断图=' + imgOk.broken.join(',') : ''}`);

  const manifestHref = await js(`(document.querySelector('link[rel=manifest]') || {}).href || ''`);
  check('已声明 PWA manifest', !!manifestHref, manifestHref);

  // Service Worker 注册情况
  let swScope = '';
  for (let i = 0; i < 12; i++) {
    swScope = await js(`navigator.serviceWorker.getRegistration().then(r => r ? (r.scope || '') : '')`);
    if (swScope) break;
    await sleep(800);
  }
  check('Service Worker 已注册', !!swScope, swScope);

  // 等缓存填充
  await sleep(2500);
  const cached = await js(`caches.keys().then(k => k.join(','))`);
  check('离线缓存已建立', !!cached, cached);

  await snap(path.join(OUT, 'online-landing.png'));

  // 点「打开应用」跳转
  await js(`document.querySelector('.lp-nav .lp-btn.primary').click()`);
  for (let i = 0; i < 30; i++) {
    const u = await js(`location.pathname`);
    if (/app\.html/.test(u)) break;
    await sleep(400);
  }
  await sleep(2500);
  const appPath = await js(`location.pathname`);
  check('「打开应用」跳转到 app.html', /app\.html/.test(appPath), appPath);

  const navCount = await js(`document.querySelectorAll('#nav .nav-item').length`);
  check('应用界面已渲染（导航项就位）', navCount >= 5, `nav=${navCount}`);

  const dataCount = await js(`getPlans().then(p => p.length)`);
  check('新访客数据为空（数据不共享）', dataCount === 0, `plans=${dataCount}`);

  await snap(path.join(OUT, 'online-app.png'));

  // 断网重载
  await cdp.send('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
  });
  await cdp.send('Page.reload', { ignoreCache: false });
  await sleep(3500);
  const offlineH1 = await js(`(document.querySelector('h1') || document.querySelector('.topbar-h') || {}).textContent || ''`);
  const offlineNav = await js(`document.querySelectorAll('#nav .nav-item, h1').length`);
  check('断网后仍能打开页面', !!offlineH1 && offlineNav > 0, (offlineH1 || '').slice(0, 30));

  await snap(path.join(OUT, 'online-offline.png'));

  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });
} finally {
  try { proc.kill(); } catch {}
  await sleep(600);
  await fsp.rm(root, { recursive: true, force: true }).catch(() => {});
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n合计 ${pass}/${results.length} 项通过`);
  console.log('截图：', OUT);
  process.exit(pass === results.length ? 0 : 1);
}
