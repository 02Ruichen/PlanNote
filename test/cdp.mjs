/* 极简 Chrome DevTools Protocol 客户端 + 静态服务器 + 模拟 AI 服务
   只依赖 Node 内置（node 22+，自带 WebSocket / fetch） */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

export function findBrowser() {
  for (const p of BROWSERS) if (fs.existsSync(p)) return p;
  throw new Error('没找到 Chrome / Chromium');
}

export async function waitJson(url, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch { /* 还没起来 */ }
    await sleep(120);
  }
  throw new Error('等待超时：' + url);
}

/* ---------------- CDP ---------------- */
export class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message + ' ' + (msg.error.data || ''))) : resolve(msg.result);
      } else if (msg.method) {
        (this.listeners.get(msg.method) || []).forEach((cb) => cb(msg.params));
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP 连接失败')), { once: true });
    });
    return new CDP(ws);
  }

  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(cb);
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP 超时：' + method));
        }
      }, 60000);
    });
  }

  async evaluate(expression, { awaitPromise = true } = {}) {
    const r = await this.send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true, userGesture: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('页面报错：' + ((d.exception && (d.exception.description || d.exception.value)) || d.text));
    }
    return r.result.value;
  }

  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

/* ---------------- 浏览器 ---------------- */
export async function launchBrowser({ url, port, profileDir, headless = true }) {
  const bin = findBrowser();
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--window-size=1440,960',
    'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(bin, args, { stdio: 'ignore', detached: false });

  const ver = await waitJson(`http://127.0.0.1:${port}/json/version`);
  const page = await (async () => {
    for (let i = 0; i < 60; i++) {
      const list = await waitJson(`http://127.0.0.1:${port}/json/list`).catch(() => []);
      const p = (list || []).find((t) => t.type === 'page');
      if (p) return p;
      await sleep(150);
    }
    throw new Error('没找到页面 target');
  })();

  const cdp = await CDP.connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Page.navigate', { url });
  return { proc, cdp, browser: ver.Browser };
}

/* ---------------- 静态服务器 ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function startStaticServer(root, port) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let file = path.join(root, decodeURIComponent(url.pathname));
      if (url.pathname === '/' || url.pathname.endsWith('/')) file = path.join(file, 'index.html');
      if (!file.startsWith(path.resolve(root))) { res.writeHead(403).end('forbidden'); return; }
      const buf = await fsp.readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

/* ---------------- 模拟 OpenAI 兼容接口 ----------------
   目的：在不消耗真实额度的情况下，抓取 App 真正发出去的提示词，
   并返回一份“按规则写好”的周报，验证渲染链路。 */
export function startMockAI(port) {
  const state = { requests: [], reply: '', fail: null };

  const server = http.createServer(async (req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }

    if (req.url.startsWith('/_state')) {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(state));
      return;
    }

    let body = '';
    for await (const chunk of req) body += chunk;

    if (req.url === '/_reply' && req.method === 'POST') {
      try { state.reply = JSON.parse(body).reply || ''; } catch { state.reply = ''; }
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end('{"ok":true}');
      return;
    }

    if (req.url === '/_reset' && req.method === 'POST') {
      state.requests = []; state.reply = ''; state.fail = null;
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end('{"ok":true}');
      return;
    }

    if (/\/chat\/completions$/.test(req.url) && req.method === 'POST') {
      let payload = {};
      try { payload = JSON.parse(body); } catch { /* ignore */ }
      const messages = payload.messages || [];
      state.requests.push({
        at: Date.now(),
        model: payload.model,
        auth: req.headers.authorization || '',
        system: (messages.find((m) => m.role === 'system') || {}).content || '',
        prompt: (messages.find((m) => m.role === 'user') || {}).content || '',
      });
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({
        id: 'mock-1',
        object: 'chat.completion',
        model: payload.model || 'mock-model',
        choices: [{ index: 0, message: { role: 'assistant', content: state.reply || '（模拟周报）' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }));
      return;
    }

    res.writeHead(404, cors).end('not found');
  });

  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, state })));
}

/* ---------------- 截图（内部校验用，跑完即删） ---------------- */
export async function shot(cdp, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await fsp.writeFile(file, Buffer.from(data, 'base64'));
  return file;
}
