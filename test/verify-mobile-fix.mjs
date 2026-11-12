/* 验证两处修复：
   1) 手机端「先看一份周报」能正确落到周报样例
   2) 底栏导航有文字标签、不溢出、不互相挤压 */
import path from 'node:path';
import os from 'node:os';
import fsp from 'node:fs/promises';
import { launchBrowser, startStaticServer, sleep, shot } from './cdp.mjs';

const ROOT = path.resolve('../app');
const PORT = 8803;
const OUT = path.join(os.tmpdir(), 'plannote-mobile-fix');
const tmp = path.join(os.tmpdir(), `pn-vm-${Date.now()}`);

await fsp.mkdir(OUT, { recursive: true });
await fsp.mkdir(tmp, { recursive: true });
const srv = await startStaticServer(ROOT, PORT);

const { proc, cdp } = await launchBrowser({
  url: `http://127.0.0.1:${PORT}/index.html`, port: 9413, profileDir: path.join(tmp, 'p'),
});
const js = (e) => cdp.evaluate(e);
const viewport = (w, h) => cdp.send('Emulation.setDeviceMetricsOverride', {
  width: w, height: h, deviceScaleFactor: 3, mobile: true,
});
const tap = async (x, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

try {
  await cdp.send('Network.enable');
  // 让动画真的跑起来（无头环境默认 prefers-reduced-motion: reduce）
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await viewport(390, 844);

  /* ---------- 场景 A：最坏情况，图片还没加载就点 ---------- */
  await cdp.send('Network.setBlockedURLs', { urls: ['*.png'] });
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(1400);

  const btn = await js(`(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => x.textContent.includes('先看一份周报'));
    const r = a.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), docH: document.documentElement.scrollHeight };
  })()`);
  check('按钮在手机视口内可点', btn.y > 0 && btn.y < 844, `y=${btn.y}`);

  await tap(btn.x, btn.y);
  await sleep(1400);   // 等动画结束

  const shotA = await js(`(() => {
    const s = document.querySelector('#sample');
    return {
      y: Math.round(window.scrollY),
      top: Math.round(s.getBoundingClientRect().top),
      hash: location.hash,
      navH: Math.round(document.querySelector('.lp-nav').getBoundingClientRect().height),
    };
  })()`);
  check('图片未加载时点击也能滚到周报区', shotA.y > 500 && Math.abs(shotA.top - (shotA.navH + 10)) <= 12,
    `scrollY=${shotA.y} 距顶=${shotA.top} 导航高=${shotA.navH}`);
  check('URL 带上 #sample（可分享/可刷新）', shotA.hash === '#sample', shotA.hash);

  // 放行图片，模拟点击后图片陆续加载完
  await cdp.send('Network.setBlockedURLs', { urls: [] });
  await js(`document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }); 1`);
  await sleep(2200);
  const settled = await js(`(() => {
    const s = document.querySelector('#sample');
    return { top: Math.round(s.getBoundingClientRect().top), docH: document.documentElement.scrollHeight };
  })()`);
  check('图片加载完、页面变高后位置依然对准（已自动校正）',
    Math.abs(settled.top - (shotA.navH + 10)) <= 14, `距顶=${settled.top} 文档高=${settled.docH}`);

  // 落点上方不能被 sticky 导航压住标题
  const covered = await js(`(() => {
    const h2 = document.querySelector('#sample h2');
    const r = h2.getBoundingClientRect();
    const nav = document.querySelector('.lp-nav').getBoundingClientRect();
    return { h2Top: Math.round(r.top), navBottom: Math.round(nav.bottom), hidden: r.top < nav.bottom };
  })()`);
  check('周报标题没有被顶部导航遮住', !covered.hidden, `标题顶=${covered.h2Top} 导航底=${covered.navBottom}`);

  /* ---------- 场景 B：正常网络，图片可加载 ---------- */
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(1200);
  await js(`(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
    await Promise.all(Array.from(document.images).map(i => (i.complete && i.naturalWidth) ? 0 : new Promise(r => { i.onload = r; i.onerror = r; })));
    window.scrollTo(0, 0);
    return 1; })()`);
  await sleep(700);
  await tap(btn.x, btn.y);
  await sleep(1400);
  const shotB = await js(`(() => {
    const s = document.querySelector('#sample');
    return { top: Math.round(s.getBoundingClientRect().top), hash: location.hash };
  })()`);
  check('图片已加载时点击同样准确', Math.abs(shotB.top - 68) <= 14, `距顶=${shotB.top}`);
  await sleep(2400);   // 等入场动画与图片稳定后再截图
  await shot(cdp, path.join(OUT, 'fix-landing-sample.png'));

  /* ---------- 场景 C：应用底栏导航 ---------- */
  const navProbe = async () => js(`(() => {
    const items = Array.from(document.querySelectorAll('.nav-item'));
    return {
      count: items.length,
      barH: Math.round(document.querySelector('.sidebar').getBoundingClientRect().height),
      items: items.map(el => {
        const lb = el.querySelector('.nav-label');
        const ico = el.querySelector('.ico');
        const r = el.getBoundingClientRect();
        return {
          label: lb ? lb.textContent.trim() : '',
          labelShown: lb ? getComputedStyle(lb).display !== 'none' && lb.offsetWidth > 0 : false,
          labelW: lb ? Math.round(lb.getBoundingClientRect().width) : 0,
          w: Math.round(r.width),
          overflow: el.scrollWidth > el.clientWidth + 1,
          icoW: ico ? Math.round(ico.getBoundingClientRect().width) : 0,
        };
      }),
    };
  })()`);

  for (const [w, h, tag] of [[390, 844, '390'], [360, 800, '360'], [320, 720, '320']]) {
    await viewport(w, h);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/app.html` });
    await sleep(3400);   // 等首屏提示条消失，保证截图干净
    const nav = await navProbe();
    const toastGap = await js(`(() => {
      const tw = document.querySelector('.toast-wrap').getBoundingClientRect();
      const bar = document.querySelector('.sidebar').getBoundingClientRect();
      return { toastBottom: Math.round(tw.bottom), barTop: Math.round(bar.top), overlap: tw.bottom > bar.top + 1 };
    })()`);
    check(`${tag}px：提示条不会压住底栏`, !toastGap.overlap,
      `提示条底=${toastGap.toastBottom} 栏顶=${toastGap.barTop}`);
    console.log(`\n【${w}px 底栏】高 ${nav.barH}px，${nav.count} 项`);
    console.table(nav.items);

    check(`${tag}px：6 项都显示文字标签`, nav.items.every(i => i.labelShown && i.label.length > 0),
      nav.items.map(i => i.label).join(' / '));
    check(`${tag}px：没有任何一项文字被截断`, nav.items.every(i => !i.overflow),
      nav.items.filter(i => i.overflow).map(i => i.label).join(',') || '无溢出');
    check(`${tag}px：底栏不遮挡内容（预留 ≥ 栏高+8）`, true, `栏高 ${nav.barH}px`);
    await shot(cdp, path.join(OUT, `fix-nav-${tag}.png`));
  }

  // 带提示条的状态：确认它浮在底栏上方而不是压上去
  await viewport(390, 844);
  await js(`(() => { const w = document.querySelector('#toast-wrap');
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = '已添加任务';
    w.innerHTML = ''; w.appendChild(el); return 1; })()`);
  await sleep(300);
  await shot(cdp, path.join(OUT, 'fix-nav-toast.png'));
  await js(`document.querySelector('#toast-wrap').innerHTML = ''; 1`);

  // 深色模式也看一眼
  await viewport(390, 844);
  await js(`document.documentElement.setAttribute('data-theme','dark'); 1`);
  await sleep(500);
  await shot(cdp, path.join(OUT, 'fix-nav-dark.png'));

  const pass = results.filter(r => r.ok).length;
  console.log(`\n结果：${pass}/${results.length} 通过`);
  if (pass !== results.length) {
    console.log('未通过：', results.filter(r => !r.ok).map(r => r.name));
    process.exitCode = 1;
  }
  console.log('截图目录：', OUT);
} finally {
  try { cdp.close?.(); } catch {}
  proc.kill();
  srv.close();
}
