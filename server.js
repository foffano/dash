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
// Lista de pedidos em streaming, para não montar uma string gigante na memória.
function streamOrders(req, res, { wrap = false } = {}) {
  const headers = { ...SEC_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (wrap) headers['Content-Disposition'] = `attachment; filename="raiox-vendas-backup-${new Date().toISOString().slice(0, 10)}.json"`;
  let out = res;
  if (acceptsGzip(req)) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; out = zlib.createGzip(); out.pipe(res); }
  res.writeHead(200, headers);
  out.write(wrap ? `{"app":"raiox-vendas","version":1,"exportedAt":"${new Date().toISOString()}","orders":[` : '[');
  let first = true;
  for (const row of q.allOrders.iterate()) { out.write((first ? '' : ',') + row.data); first = false; }
  out.end(wrap ? ']}' : ']');
}

/* ---------------- arquivos estáticos ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const VENDOR = {
  '/vendor/chart.umd.js': path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'),
  '/vendor/xlsx.full.min.js': path.join(__dirname, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'),
};
const staticCache = new Map();
function serveStatic(req, res, pathname) {
  let file = VENDOR[pathname];
  if (!file) {
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(req, res, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  }
  let entry = staticCache.get(file);
  if (!entry) {
    try { if (!fs.statSync(file).isFile()) throw 0; } catch { return send(req, res, 404, 'Não encontrado', 'text/plain; charset=utf-8'); }
    const body = fs.readFileSync(file);
    entry = { body, gz: zlib.gzipSync(body), type: TYPES[path.extname(file)] || 'application/octet-stream', etag: '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"' };
    if (process.env.NODE_ENV === 'production') staticCache.set(file, entry);
  }
  const headers = { ...SEC_HEADERS, 'Content-Type': entry.type, ETag: entry.etag, 'Cache-Control': VENDOR[pathname] ? 'public, max-age=604800' : 'no-cache', Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, headers); return res.end(); }
  if (acceptsGzip(req)) { res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': entry.gz.length }); return res.end(req.method === 'HEAD' ? undefined : entry.gz); }
  res.writeHead(200, { ...headers, 'Content-Length': entry.body.length });
  res.end(req.method === 'HEAD' ? undefined : entry.body);
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
  if (pathname === '/api/orders' && m === 'GET') return streamOrders(req, res);
  if (pathname === '/api/backup' && m === 'GET') return streamOrders(req, res, { wrap: true });

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
    return json(req, res, 200, { created, updated });
  }
  if (pathname === '/api/imports' && m === 'GET') return json(req, res, 200, q.allImports.all());
  if (pathname === '/api/imports' && m === 'POST') {
    const b = await readJson(req);
    const n = v => (Number.isFinite(+v) && v !== null && v !== '' ? Math.round(+v) : null);
    q.addImport.run(clean(b.file), Date.now(), n(b.rows) ?? 0, n(b.created) ?? 0, n(b.updated) ?? 0, n(b.minT), n(b.maxT));
    return json(req, res, 200, { ok: true });
  }
  if (pathname === '/api/data' && m === 'DELETE') {
    db.exec('DELETE FROM orders; DELETE FROM imports;');
    return json(req, res, 200, { ok: true });
  }
  return json(req, res, 404, { error: 'Rota não encontrada.' });
}

/* ---------------- servidor ---------------- */
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname === '/healthz') return send(req, res, 200, 'ok', 'text/plain; charset=utf-8');
    if (pathname === '/api/health') { db.prepare('SELECT 1').get(); return json(req, res, 200, { ok: true, version: VERSION }); }
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Método não permitido', 'text/plain; charset=utf-8');
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) json(req, res, e.status || 500, { error: e.status ? e.message : 'Erro interno do servidor.' });
    else res.destroy();
  }
});
server.requestTimeout = 5 * 60e3;
server.listen(PORT, HOST, () => console.log(`Raio-X de Vendas ${VERSION} em http://${HOST}:${PORT} (dados em ${DATA_DIR})`));
const shutdown = () => server.close(() => { db.close(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
