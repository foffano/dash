'use strict';
// Raio-X de Vendas — servidor HTTP sem dependências nativas (Node >= 22.13, SQLite embutido).
process.removeAllListeners('warning');
process.on('warning', w => { if (w.name !== 'ExperimentalWarning') console.warn(w); });

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = +(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const APP_USER = process.env.APP_USER || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const COOKIE_SECURE = process.env.COOKIE_SECURE; // 'true' | 'false' | indefinido = automático
const SESSION_DAYS = +(process.env.SESSION_DAYS || 30);
const MAX_BODY = 32 * 1024 * 1024;
const PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = process.env.APP_VERSION || 'v' + require('./package.json').version;

if (!APP_PASSWORD || APP_PASSWORD.length < 8) {
  console.error('Defina APP_PASSWORD (mínimo 8 caracteres) no arquivo .env antes de iniciar.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
for (const f of ['chart.js/dist/chart.umd.js', 'xlsx/dist/xlsx.full.min.js'])
  if (!fs.existsSync(path.join(__dirname, 'node_modules', f))) { console.error(`Faltando node_modules/${f}. Rode "npm install" antes de iniciar.`); process.exit(1); }

// Segredo das sessões: variável de ambiente ou arquivo gerado na primeira execução.
let SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  const f = path.join(DATA_DIR, '.session-secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  SECRET = fs.readFileSync(f, 'utf8').trim();
}

/* ---------------- banco ---------------- */
const db = new DatabaseSync(path.join(DATA_DIR, 'raiox.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS orders (
    key TEXT PRIMARY KEY,
    t INTEGER,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_t ON orders(t);
  CREATE TABLE IF NOT EXISTS names (
    name TEXT PRIMARY KEY,
    f INTEGER NOT NULL,
    m INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL
  );
  -- Notas fiscais (NF-e) de venda: só o que o painel usa; rua e número não são guardados.
  CREATE TABLE IF NOT EXISTS invoices (
    chave TEXT PRIMARY KEY,
    order_no TEXT,
    emitted_at INTEGER,
    doc TEXT,
    name TEXT,
    city TEXT,
    uf TEXT,
    cep TEXT,
    value REAL,
    imported_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS invoices_order ON invoices(order_no);
  CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file TEXT, at INTEGER, rows INTEGER, created INTEGER, updated INTEGER, min_t INTEGER, max_t INTEGER
  );
`);
const q = {
  exists: db.prepare('SELECT 1 FROM orders WHERE key = ?'),
  upsert: db.prepare('INSERT INTO orders (key, t, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET t = excluded.t, data = excluded.data, updated_at = excluded.updated_at'),
  allOrders: db.prepare('SELECT data FROM orders ORDER BY t'),
  countOrders: db.prepare('SELECT COUNT(*) AS n FROM orders'),
  addImport: db.prepare('INSERT INTO imports (file, at, rows, created, updated, min_t, max_t) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  allNames: db.prepare('SELECT name, f, m FROM names'),
  getName: db.prepare('SELECT 1 FROM names WHERE name = ?'),
  putName: db.prepare('INSERT OR REPLACE INTO names (name, f, m, fetched_at) VALUES (?, ?, ?, ?)'),
  upsertInvoice: db.prepare(`INSERT INTO invoices (chave, order_no, emitted_at, doc, name, city, uf, cep, value, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chave) DO UPDATE SET order_no = excluded.order_no, emitted_at = excluded.emitted_at, doc = excluded.doc, name = excluded.name,
    city = excluded.city, uf = excluded.uf, cep = excluded.cep, value = excluded.value, imported_at = excluded.imported_at`),
  invoiceExists: db.prepare('SELECT 1 FROM invoices WHERE chave = ?'),
  allInvoices: db.prepare('SELECT chave, order_no AS orderNo, emitted_at AS emittedAt, doc, name, city, uf, cep, value FROM invoices ORDER BY emitted_at'),
  allImports: db.prepare('SELECT id, file, at, rows, created, updated, min_t AS minT, max_t AS maxT FROM imports ORDER BY at DESC'),
};

/* ---------------- sessão ---------------- */
const b64 = s => Buffer.from(s).toString('base64url');
const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function makeToken(user) {
  const payload = b64(JSON.stringify({ u: user, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return payload + '.' + sign(payload);
}
function readToken(tok) {
  if (!tok || !tok.includes('.')) return null;
  const [payload, sig] = tok.split('.');
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const isHttps = req => COOKIE_SECURE === 'true' || (COOKIE_SECURE !== 'false' && (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted));
function setSession(req, res, value, maxAge) {
  res.setHeader('Set-Cookie', `raiox_sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`);
}
const hash = s => crypto.createHash('sha256').update(String(s)).digest();
const checkLogin = (u, p) => crypto.timingSafeEqual(hash(u), hash(APP_USER)) & crypto.timingSafeEqual(hash(p), hash(APP_PASSWORD));

// Limite de tentativas de login: 10 por IP a cada 15 minutos.
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now(), a = attempts.get(ip);
  if (!a || now - a.start > 15 * 60e3) { attempts.set(ip, { start: now, n: 1 }); return false; }
  a.n++;
  return a.n > 10;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of attempts) if (now - v.start > 15 * 60e3) attempts.delete(k); }, 60e3).unref();

/* ---------------- utilidades HTTP ---------------- */
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
const acceptsGzip = req => /\bgzip\b/.test(req.headers['accept-encoding'] || '');
function send(req, res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const headers = { ...SEC_HEADERS, 'Content-Type': type, 'Cache-Control': 'no-store', ...extra };
  if (buf.length > 1024 && acceptsGzip(req) && /json|javascript|css|html|svg/.test(type)) {
    const z = zlib.gzipSync(buf);
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': z.length, Vary: 'Accept-Encoding' });
    return res.end(z);
  }
  res.writeHead(status, { ...headers, 'Content-Length': buf.length });
  res.end(buf);
}
const json = (req, res, status, obj) => send(req, res, status, obj);
function readJson(req) {
  return new Promise((resolve, reject) => {
    if (!/application\/json/.test(req.headers['content-type'] || '')) return reject(Object.assign(new Error('Envie JSON.'), { status: 415 }));
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Envio grande demais.'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('JSON inválido.'), { status: 400 })); } });
    req.on('error', reject);
  });
}
// Pedidos que mudam dados precisam vir do próprio site.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.host || host === req.headers['x-forwarded-host'];
  } catch { return false; }
}
// IP real do visitante. Atrás do Cloudflare vem em CF-Connecting-IP (o Cloudflare sobrescreve,
// então o visitante não consegue forjar); o primeiro item do X-Forwarded-For pode ser forjado.
function clientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return cf.trim();
  const xff = (req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.at(-1) || req.socket.remoteAddress;
}
// Backup completo (pedidos e notas) em streaming, para não montar uma string gigante na memória.
function streamBackup(req, res) {
  const headers = { ...SEC_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="raiox-vendas-backup-${new Date().toISOString().slice(0, 10)}.json"` };
  let out = res;
  if (acceptsGzip(req)) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; out = zlib.createGzip(); out.pipe(res); }
  res.writeHead(200, headers);
  out.write(`{"app":"raiox-vendas","version":2,"exportedAt":"${new Date().toISOString()}","orders":[`);
  let first = true;
  for (const row of q.allOrders.iterate()) { out.write((first ? '' : ',') + row.data); first = false; }
  out.write('],"invoices":[');
  first = true;
  for (const n of q.allInvoices.iterate()) { out.write((first ? '' : ',') + JSON.stringify(n)); first = false; }
  out.end(']}');
}

/* ---------------- arquivos estáticos ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' };
const VENDOR = {
  '/vendor/chart.umd.js': path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'),
  '/vendor/xlsx.full.min.js': path.join(__dirname, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'),
};
const staticCache = new Map();
// index.html chama app.js, style.css etc. com ?v=<versão>: o navegador guarda esses arquivos
// por um ano e só baixa de novo quando sai uma versão nova.
const PROD = process.env.NODE_ENV === 'production';
function serveStatic(req, res, pathname, search) {
  let file = VENDOR[pathname];
  if (!file) {
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(req, res, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  }
  let entry = staticCache.get(file);
  if (!entry) {
    try { if (!fs.statSync(file).isFile()) throw 0; } catch { return send(req, res, 404, 'Não encontrado', 'text/plain; charset=utf-8'); }
    let body = fs.readFileSync(file);
    if (file.endsWith('.html')) body = Buffer.from(body.toString('utf8').replaceAll('__V__', encodeURIComponent(VERSION)));
    entry = { body, gz: zlib.gzipSync(body), type: TYPES[path.extname(file)] || 'application/octet-stream', etag: '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"' };
    if (PROD) staticCache.set(file, entry);
  }
  const headers = { ...SEC_HEADERS, 'Content-Type': entry.type, ETag: entry.etag, 'Cache-Control': PROD && /(^|&)v=/.test(search) ? 'public, max-age=31536000, immutable' : VENDOR[pathname] ? 'public, max-age=604800' : 'no-cache', Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, headers); return res.end(); }
  if (acceptsGzip(req)) { res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': entry.gz.length }); return res.end(req.method === 'HEAD' ? undefined : entry.gz); }
  res.writeHead(200, { ...headers, 'Content-Length': entry.body.length });
  res.end(req.method === 'HEAD' ? undefined : entry.body);
}

/* ---------------- nomes (gênero estimado) ---------------- */
// Quantas pessoas de cada sexo têm cada primeiro nome, segundo o Censo 2010 do IBGE.
// Só o primeiro nome sai do servidor, sem sobrenome nem outro dado; o resultado fica guardado.
const IBGE_NAMES = 'https://servicodados.ibge.gov.br/api/v2/censos/nomes/';
const NAME_RE = /^[A-Z]{2,30}$/;
async function ibgeCount(names, sexo) {
  const fail = () => Object.assign(new Error('O IBGE não respondeu. Tente de novo mais tarde.'), { status: 502 });
  // O servidor do IBGE às vezes não aceita a conexão; na segunda ou terceira tentativa costuma responder.
  let data;
  for (let attempt = 1; !data; attempt++) {
    try {
      const r = await fetch(IBGE_NAMES + names.join('%7C') + '?sexo=' + sexo, { signal: AbortSignal.timeout(20e3) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      data = await r.json();
    } catch (e) {
      console.warn(`IBGE nomes (tentativa ${attempt}):`, e.cause?.code || e.message);
      if (attempt >= 3) throw fail();
      await new Promise(res => setTimeout(res, attempt * 1500));
    }
  }
  const out = new Map();
  for (const x of data) out.set(x.nome, (x.res || []).reduce((a, p) => a + (p.frequencia || 0), 0));
  return out;
}
async function resolveNames(list) {
  const missing = [...new Set(list.filter(n => typeof n === 'string' && NAME_RE.test(n)))].filter(n => !q.getName.get(n)).slice(0, 600);
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const [f, m] = await Promise.all([ibgeCount(chunk, 'F'), ibgeCount(chunk, 'M')]);
    const now = Date.now();
    db.exec('BEGIN');
    try { for (const n of chunk) q.putName.run(n, f.get(n) || 0, m.get(n) || 0, now); db.exec('COMMIT'); }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return missing.length;
}
const namesMap = () => Object.fromEntries(q.allNames.all().map(r => [r.name, [r.f, r.m]]));

/* ---------------- carga inicial do painel ---------------- */
// O banco guarda cada pedido completo (JSON em orders.data), e é isso que vai no backup.
// Para abrir o painel, o navegador recebe só os campos que ele usa, em formato compacto:
// cada pedido vira uma lista de valores e textos repetidos (plataforma, situação, cidade,
// produto...) entram uma vez num dicionário. A resposta fica pronta e comprimida na memória
// e só é refeita quando os dados mudam; se nada mudou, o navegador recebe 304 (ETag).
const ORDER_FIELDS = ['key', 'platform', 'store', 'status', 'afterSale', 'canceledBy', 'cancelReason', 't', 'payT', 'shipT', 'deadline', 'orderValue', 'productsTotal', 'buyerId', 'buyerName', 'city', 'uf', 'cep', 'shipMethod', 'doc', 'nfName'];
const ITEM_FIELDS = ['name', 'sku', 'variation', 'price', 'qty'];
const DICT_FIELDS = new Set(['platform', 'store', 'status', 'afterSale', 'canceledBy', 'cancelReason', 'city', 'uf', 'shipMethod', 'name', 'sku', 'variation']);
function packOrders() {
  // Nota fiscal de cada pedido, pelo "Nº de Pedido" da UpSeller (campo xPed da NF-e). Vale a mais recente.
  const inv = new Map();
  let total = 0;
  for (const n of q.allInvoices.iterate()) { total++; if (n.orderNo) inv.set(n.orderNo, n); }
  let linked = 0;
  const dict = [], index = new Map();
  const enc = (f, v) => {
    if (v === undefined || v === null || v === '') return null;
    if (!DICT_FIELDS.has(f)) return v;
    let i = index.get(v);
    if (i === undefined) { i = dict.length; dict.push(v); index.set(v, i); }
    return i;
  };
  const orders = [];
  for (const r of q.allOrders.iterate()) {
    const o = JSON.parse(r.data);
    if (!o.buyerName && o.recipient) o.buyerName = o.recipient;
    const n = o.orderNo && inv.get(o.orderNo);
    if (n) {
      linked++;
      o.doc = n.doc; o.nfName = n.name;
      if (!o.city && n.city) { o.city = n.city; o.uf = n.uf; }
      if (!o.uf && n.uf) o.uf = n.uf;
      if (!o.cep && n.cep) o.cep = n.cep;
    }
    const row = ORDER_FIELDS.map(f => enc(f, o[f]));
    row.push((o.items || []).map(it => ITEM_FIELDS.map(f => enc(f, it[f]))));
    orders.push(row);
  }
  return { orderFields: ORDER_FIELDS, itemFields: ITEM_FIELDS, dictFields: [...DICT_FIELDS], dict, orders, invoices: { total, linked } };
}
let boot = null, bootTimer = null;
function bootData() {
  if (!boot) {
    const t = Date.now();
    const raw = Buffer.from(JSON.stringify({ orders: packOrders(), imports: q.allImports.all(), names: namesMap() }));
    boot = { raw, gz: zlib.gzipSync(raw), etag: '"' + crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 22) + '"' };
    console.log(`Carga do painel montada: ${(raw.length / 1e6).toFixed(1)} MB, ${(boot.gz.length / 1e6).toFixed(2)} MB comprimida, ${Date.now() - t} ms`);
  }
  return boot;
}
// Dados mudaram: descarta a carga pronta e remonta logo depois (uma importação manda vários lotes seguidos).
function invalidateBoot() {
  boot = null;
  clearTimeout(bootTimer);
  bootTimer = setTimeout(() => { try { bootData(); } catch (e) { console.error(e); } }, 3000);
  bootTimer.unref();
}
function sendBoot(req, res) {
  const b = bootData();
  const headers = { ...SEC_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-cache', ETag: b.etag, Vary: 'Accept-Encoding' };
  // O Cloudflare pode transformar o ETag em fraco (W/"...") ao recomprimir.
  const tags = (req.headers['if-none-match'] || '').split(',').map(x => x.trim().replace(/^W\//, ''));
  if (tags.includes(b.etag)) { res.writeHead(304, headers); return res.end(); }
  if (acceptsGzip(req)) { res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': b.gz.length }); return res.end(b.gz); }
  res.writeHead(200, { ...headers, 'Content-Length': b.raw.length });
  res.end(b.raw);
}

/* ---------------- API ---------------- */
const clean = (v, max = 300) => String(v ?? '').slice(0, max);
async function api(req, res, pathname) {
  const m = req.method;
  if (m !== 'GET' && m !== 'HEAD' && !sameOrigin(req)) return json(req, res, 403, { error: 'Origem não permitida.' });

  if (pathname === '/api/login' && m === 'POST') {
    const ip = clientIp(req);
    if (rateLimited(ip)) return json(req, res, 429, { error: 'Muitas tentativas. Aguarde 15 minutos.' });
    const { user, password } = await readJson(req);
    if (!checkLogin(String(user || ''), String(password || ''))) return json(req, res, 401, { error: 'Usuário ou senha incorretos.' });
    attempts.delete(ip);
    setSession(req, res, makeToken(APP_USER), SESSION_DAYS * 86400);
    return json(req, res, 200, { user: APP_USER });
  }
  if (pathname === '/api/logout' && m === 'POST') { setSession(req, res, '', 0); return json(req, res, 200, { ok: true }); }

  const session = readToken(cookies(req).raiox_sid);
  if (!session) return json(req, res, 401, { error: 'Faça login.' });

  if (pathname === '/api/me' && m === 'GET') return json(req, res, 200, { user: session.u, orders: q.countOrders.get().n });
  if (pathname === '/api/bootstrap' && m === 'GET') return sendBoot(req, res);
  if (pathname === '/api/backup' && m === 'GET') return streamBackup(req, res);

  if (pathname === '/api/orders' && m === 'POST') {
    const body = await readJson(req);
    const list = Array.isArray(body.orders) ? body.orders : [];
    if (!list.length) return json(req, res, 400, { error: 'Nenhum pedido enviado.' });
    let created = 0, updated = 0;
    const now = Date.now();
    db.exec('BEGIN');
    try {
      for (const o of list) {
        if (!o || typeof o.key !== 'string' || !o.key || o.key.length > 200 || !Array.isArray(o.items)) continue;
        const data = JSON.stringify(o);
        if (data.length > 256 * 1024) continue;
        if (q.exists.get(o.key)) updated++; else created++;
        q.upsert.run(o.key, Number.isFinite(o.t) ? o.t : null, data, now);
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    invalidateBoot();
    return json(req, res, 200, { created, updated });
  }
  if (pathname === '/api/names' && m === 'POST') {
    const b = await readJson(req);
    const added = await resolveNames(Array.isArray(b.names) ? b.names : []);
    if (added) invalidateBoot();
    return json(req, res, 200, { added, names: namesMap() });
  }
  if (pathname === '/api/invoices' && m === 'POST') {
    const b = await readJson(req);
    const list = Array.isArray(b.invoices) ? b.invoices : [];
    const digits = (v, max) => String(v ?? '').replace(/\D/g, '').slice(0, max);
    const num = v => (Number.isFinite(+v) && v !== null && v !== '' ? +v : null);
    let created = 0, updated = 0;
    const now = Date.now();
    db.exec('BEGIN');
    try {
      for (const n of list) {
        const chave = digits(n?.chave, 44);
        if (chave.length !== 44) continue;
        if (q.invoiceExists.get(chave)) updated++; else created++;
        q.upsertInvoice.run(chave, clean(n.orderNo, 60) || null, num(n.emittedAt), digits(n.doc, 14) || null, clean(n.name, 120) || null,
          clean(n.city, 80) || null, clean(n.uf, 2).toUpperCase() || null, digits(n.cep, 8) || null, num(n.value), now);
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    invalidateBoot();
    return json(req, res, 200, { created, updated });
  }
  if (pathname === '/api/imports' && m === 'POST') {
    const b = await readJson(req);
    const n = v => (Number.isFinite(+v) && v !== null && v !== '' ? Math.round(+v) : null);
    q.addImport.run(clean(b.file), Date.now(), n(b.rows) ?? 0, n(b.created) ?? 0, n(b.updated) ?? 0, n(b.minT), n(b.maxT));
    invalidateBoot();
    return json(req, res, 200, { ok: true });
  }
  if (pathname === '/api/data' && m === 'DELETE') {
    db.exec('DELETE FROM orders; DELETE FROM imports; DELETE FROM invoices;'); // o cache de nomes não tem dados de clientes e fica
    invalidateBoot();
    return json(req, res, 200, { ok: true });
  }
  return json(req, res, 404, { error: 'Rota não encontrada.' });
}

/* ---------------- servidor ---------------- */
const server = http.createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url, 'http://x');
  try {
    if (pathname === '/healthz') return send(req, res, 200, 'ok', 'text/plain; charset=utf-8');
    if (pathname === '/api/health') { db.prepare('SELECT 1').get(); return json(req, res, 200, { ok: true, version: VERSION }); }
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Método não permitido', 'text/plain; charset=utf-8');
    return serveStatic(req, res, pathname, search.slice(1));
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) json(req, res, e.status || 500, { error: e.status ? e.message : 'Erro interno do servidor.' });
    else res.destroy();
  }
});
server.requestTimeout = 5 * 60e3;
server.listen(PORT, HOST, () => {
  console.log(`Raio-X de Vendas ${VERSION} em http://${HOST}:${PORT} (dados em ${DATA_DIR})`);
  setImmediate(() => { try { bootData(); } catch (e) { console.error(e); } }); // deixa a carga pronta antes do primeiro login
});
const shutdown = () => server.close(() => { db.close(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
