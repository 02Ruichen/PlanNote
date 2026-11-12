/* 临时校验：整页截图介绍页（桌面 + 手机） */
import path from 'node:path';
import os from 'node:os';
import fsp from 'node:fs/promises';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { launchBrowser, startStaticServer, sleep } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(HERE, '..', 'app');
const OUT = path.join(os.tmpdir(), 'plannote-landing');
const freePort = () => new Promise((r) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); });
});

const appPort = await freePort();
const cdpPort = await freePort();
const root = path.join(os.tmpdir(), `pn-verify-${Date.now()}`);
const srv = await startStaticServer(APP_DIR, appPort);
const { proc, cdp } = await launchBrowser({
  url: `http://127.0.0.1:${appPort}/index.html`, port: cdpPort, profileDir: path.join(root, 'p'),
});

const js = async (e) => {
  const r = await cdp.send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

const snap = async (file, fullPage) => {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: !!fullPage,
  });
  await fsp.writeFile(file, Buffer.from(data, 'base64'));
  return file;
};

try {
  await fsp.mkdir(OUT, { recursive: true });
  await sleep(1500);

  // 桌面
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1.5, mobile: false });
  await sleep(800);
  // 让所有入场元素先显形，并强制加载懒加载图片（否则整页截图会留白）
  await js(`(async () => {
    document.querySelectorAll('.rise').forEach(e => e.classList.add('in'));
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    await Promise.all(Array.from(document.images).map(i => i.complete ? 0 : new Promise(r => { i.onload = r; i.onerror = r; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    return document.images.length;
  })()`);
  await sleep(900);
  await snap(path.join(OUT, 'landing-top.png'), false);
  const h = await js(`document.documentElement.scrollHeight`);
  console.log('桌面整页高度', h);
  await snap(path.join(OUT, 'landing-full.png'), true);

  // 手机
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await js(`document.querySelectorAll('.rise').forEach(e => e.classList.add('in')); 1`);
  await sleep(500);
  await snap(path.join(OUT, 'landing-mobile.png'), true);

  const errs = await js(`(window.__errs || []).join(' | ') || 'none'`);
  console.log('页面错误：', errs);
  console.log('输出目录：', OUT);
} finally {
  try { proc.kill(); } catch {}
  srv.close();
  await sleep(500);
  await fsp.rm(root, { recursive: true, force: true }).catch(() => {});
}
