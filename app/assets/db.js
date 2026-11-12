/* ============================================================
   PlanNote · 数据层
   优先用 IndexedDB；如果浏览器不给用（例如直接双击本地文件打开），
   自动降级到 localStorage，保证「点开就能用、关掉不丢」。
   对标原 SQLite 的 plans / categories 两张表。
   ============================================================ */

const DB_NAME = 'plannote';
const DB_VERSION = 1;
const STORE_PLANS = 'plans';
const STORE_CATS = 'categories';
const STORE_META = 'meta';

const LS_KEY = 'plannote.localdb';

let _db = null;
let _mode = null;          // 'idb' | 'ls'
let _ready = null;

/* ---------------- 存储后端选择 ---------------- */
function openIDB() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) { reject(e); return; }
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PLANS)) {
        const s = db.createObjectStore(STORE_PLANS, { keyPath: 'id' });
        s.createIndex('plan_date', 'plan_date');
        s.createIndex('status', 'status');
        s.createIndex('category_id', 'category_id');
      }
      if (!db.objectStoreNames.contains(STORE_CATS)) {
        db.createObjectStore(STORE_CATS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('数据库被其它标签页占用'));
  });
}

function ensureReady() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (location.protocol === 'file:') { _mode = 'ls'; return; }
    try {
      _db = await Promise.race([
        openIDB(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('open timeout')), 3000)),
      ]);
      _mode = 'idb';
    } catch (e) {
      console.warn('[PlanNote] IndexedDB 不可用，改用 localStorage：', e.message);
      _mode = 'ls';
    }
  })();
  return _ready;
}

/* ---------------- localStorage 后端 ---------------- */
function lsRead() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { plans: [], categories: [], meta: [] };
    const d = JSON.parse(raw);
    return { plans: d.plans || [], categories: d.categories || [], meta: d.meta || [] };
  } catch {
    return { plans: [], categories: [], meta: [] };
  }
}
function lsWrite(d) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); }
  catch (e) { throw new Error('本地存储已满或被禁用'); }
}
const lsKeyField = (store) => (store === STORE_META ? 'key' : 'id');

/* ---------------- 统一读写 ---------------- */
function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  await ensureReady();
  if (_mode === 'ls') return lsRead()[store] || [];
  const s = _db.transaction(store, 'readonly').objectStore(store);
  return reqToPromise(s.getAll());
}

async function dbPut(store, value) {
  await ensureReady();
  if (_mode === 'ls') {
    const d = lsRead();
    const kf = lsKeyField(store);
    const arr = d[store] || (d[store] = []);
    const i = arr.findIndex(x => x[kf] === value[kf]);
    if (i >= 0) arr[i] = value; else arr.push(value);
    lsWrite(d);
    return value;
  }
  const s = _db.transaction(store, 'readwrite').objectStore(store);
  await reqToPromise(s.put(value));
  return value;
}

async function dbDelete(store, id) {
  await ensureReady();
  if (_mode === 'ls') {
    const d = lsRead();
    const kf = lsKeyField(store);
    d[store] = (d[store] || []).filter(x => x[kf] !== id);
    lsWrite(d);
    return;
  }
  const s = _db.transaction(store, 'readwrite').objectStore(store);
  return reqToPromise(s.delete(id));
}

async function dbClear(store) {
  await ensureReady();
  if (_mode === 'ls') {
    const d = lsRead();
    d[store] = [];
    lsWrite(d);
    return;
  }
  const s = _db.transaction(store, 'readwrite').objectStore(store);
  return reqToPromise(s.clear());
}

/* ---------------- 分类 ---------------- */
const DEFAULT_CATEGORIES = [
  { id: 'cat-work',   name: '工作', color: '#C49898', sort_order: 0, created_at: '' },
  { id: 'cat-study',  name: '学习', color: '#A898B8', sort_order: 1, created_at: '' },
  { id: 'cat-life',   name: '生活', color: '#98A898', sort_order: 2, created_at: '' },
  { id: 'cat-health', name: '健康', color: '#C4B098', sort_order: 3, created_at: '' },
  { id: 'cat-other',  name: '其他', color: '#A8A0A8', sort_order: 4, created_at: '' },
];

const CAT_COLORS = [
  '#C49898', '#A898B8', '#98A898', '#C4B098', '#A8A0A8',
  '#B8A4A4', '#A8A4B8', '#B0B8A4', '#B8A890', '#9AA8B8',
];

async function getCategories() {
  const list = await dbGetAll(STORE_CATS);
  if (!list.length) {
    const now = new Date().toISOString();
    for (const c of DEFAULT_CATEGORIES) {
      await dbPut(STORE_CATS, { ...c, created_at: now });
    }
    return DEFAULT_CATEGORIES.map(c => ({ ...c, created_at: now }));
  }
  return list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function saveCategory(cat) {
  return dbPut(STORE_CATS, cat);
}

async function deleteCategory(id) {
  const cats = await getCategories();
  if (cats.length <= 1) throw new Error('至少要保留一个分类');
  await dbDelete(STORE_CATS, id);
  const rest = cats.filter(c => c.id !== id);
  const fallback = rest[0];
  const plans = await getPlans();
  for (const p of plans) {
    if (p.category_id === id) {
      await dbPut(STORE_PLANS, { ...p, category_id: fallback.id, updated_at: new Date().toISOString() });
    }
  }
}

/* ---------------- 计划 ---------------- */
function newId() {
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function makePlan(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: '',
    description: '',
    category_id: 'cat-work',
    priority: 3,
    status: 'pending',          // pending | completed | cancelled
    plan_date: todayStr(),
    start_time: null,
    end_time: null,
    is_recurring: false,
    recurring_rule: null,
    template_id: null,
    is_archived: false,
    archived_month: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

async function getPlans() {
  const list = await dbGetAll(STORE_PLANS);
  return list.filter(p => !p.is_archived);
}

function savePlan(plan) {
  return dbPut(STORE_PLANS, { ...plan, updated_at: new Date().toISOString() });
}

function deletePlan(id) {
  return dbDelete(STORE_PLANS, id);
}

async function getPlansByDate(dateStr) {
  const list = await getPlans();
  return list.filter(p => p.plan_date === dateStr).sort(sortPlans);
}

async function getPlansByRange(startStr, endStr) {
  const list = await getPlans();
  return list.filter(p => p.plan_date >= startStr && p.plan_date <= endStr);
}

function sortPlans(a, b) {
  // 已完成沉底 → 有时间的按时间排 → 难度高的在前 → 创建时间
  const ad = a.status === 'completed' ? 1 : 0;
  const bd = b.status === 'completed' ? 1 : 0;
  if (ad !== bd) return ad - bd;
  const at = a.start_time || '99:99';
  const bt = b.start_time || '99:99';
  if (at !== bt) return at.localeCompare(bt);
  if (a.priority !== b.priority) return b.priority - a.priority;
  return (a.created_at || '').localeCompare(b.created_at || '');
}

/* ---------------- 设置 ---------------- */
const DEFAULT_SETTINGS = {
  theme: 'light',
  aiBaseUrl: 'https://api.deepseek.com',
  apiKey: '',
  aiModel: 'deepseek-chat',
  weekStart: 1,
  lastBackupAt: null,
};

async function getSettings() {
  await ensureReady();
  let row = null;
  if (_mode === 'ls') {
    row = (lsRead().meta || []).find(x => x.key === 'settings');
  } else {
    const s = _db.transaction(STORE_META, 'readonly').objectStore(STORE_META);
    row = await reqToPromise(s.get('settings'));
  }
  return { ...DEFAULT_SETTINGS, ...(row?.value || {}) };
}

async function saveSettings(patch) {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await dbPut(STORE_META, { key: 'settings', value: next });
  return next;
}

/* ---------------- 备份 / 恢复 ---------------- */
async function exportAll() {
  const [plans, categories, settings] = await Promise.all([
    dbGetAll(STORE_PLANS), getCategories(), getSettings(),
  ]);
  return {
    app: 'PlanNote',
    version: 2,
    exportedAt: new Date().toISOString(),
    counts: { plans: plans.length, categories: categories.length },
    categories,
    plans,
    settings: { theme: settings.theme, weekStart: settings.weekStart },
  };
}

async function importAll(data, { merge = false } = {}) {
  if (!data || !Array.isArray(data.plans)) throw new Error('文件格式不对：缺少 plans');
  if (!merge) {
    await dbClear(STORE_PLANS);
    await dbClear(STORE_CATS);
  }
  if (Array.isArray(data.categories)) {
    for (const c of data.categories) {
      await dbPut(STORE_CATS, {
        id: c.id, name: c.name, color: c.color || '#A898B8',
        sort_order: c.sort_order ?? 0, created_at: c.created_at || new Date().toISOString(),
      });
    }
  }
  let n = 0;
  for (const p of data.plans) {
    if (!p || !p.title) continue;
    await dbPut(STORE_PLANS, {
      id: p.id || newId(),
      title: p.title,
      description: p.description || '',
      category_id: p.category_id || 'cat-other',
      priority: p.priority || 3,
      status: p.status || 'pending',
      plan_date: p.plan_date || todayStr(),
      start_time: p.start_time || null,
      end_time: p.end_time || null,
      is_recurring: !!p.is_recurring,
      recurring_rule: p.recurring_rule || null,
      template_id: p.template_id || null,
      is_archived: !!p.is_archived,
      archived_month: p.archived_month || null,
      completed_at: p.completed_at || null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    n++;
  }
  return n;
}

async function clearAll() {
  await dbClear(STORE_PLANS);
  await dbClear(STORE_CATS);
  await dbClear(STORE_META);
}

/* ---------------- 日期工具 ---------------- */
function todayStr() {
  return toDateStr(new Date());
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s, n) {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function weekStartOf(dateStr, weekStartDay = 1) {
  const d = parseDateStr(dateStr);
  const dow = d.getDay();
  const diff = (dow - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toDateStr(d);
}

function weekDates(startStr) {
  return Array.from({ length: 7 }, (_, i) => addDays(startStr, i));
}

function monthGrid(year, month /* 1-12 */, weekStartDay = 1) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startDow = (first.getDay() - weekStartDay + 7) % 7;
  const cells = [];
  for (let i = startDow; i > 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i);
    cells.push({ date: toDateStr(d), dim: true });
  }
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push({ date: toDateStr(new Date(year, month - 1, day)), dim: false });
  }
  while (cells.length % 7 !== 0) {
    const d = parseDateStr(cells[cells.length - 1].date);
    d.setDate(d.getDate() + 1);
    cells.push({ date: toDateStr(d), dim: true });
  }
  return cells;
}
