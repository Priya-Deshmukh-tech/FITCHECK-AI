const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}

const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };
function send(res, code, body, type='application/json; charset=utf-8') { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body)); }
function getBody(req) { return new Promise((resolve, reject) => { let raw=''; req.on('data', c => { raw += c; if (raw.length > 1_500_000) { reject(new Error('Request is too large.')); req.destroy(); } }); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON request.')); } }); req.on('error', reject); }); }
function parseObject(value) { if (typeof value === 'string') { try { return parseObject(JSON.parse(value)); } catch { return null; } } if (value && typeof value === 'object') { if (typeof value.text === 'string') { const nested=parseObject(value.text); if(nested)return nested; } if (typeof value.output === 'string') { const nested=parseObject(value.output); if(nested)return nested; } return value; } return null; }
const server = http.createServer(async (req, res) => {
  if (req.url === '/config.js' && req.method === 'GET') {
    const config = { supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '' };
    return send(res, 200, `window.FITCHECK_CONFIG = ${JSON.stringify(config)};`, 'text/javascript; charset=utf-8');
  }
  if (req.url === '/api/status' && req.method === 'GET') {
    return send(res, 200, { configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY), n8nConfigured: Boolean(process.env.N8N_WEBHOOK_URL) });
  }
  if (req.url === '/api/outfit' && req.method === 'POST') {
    const supabaseUrl = process.env.SUPABASE_URL, anonKey = process.env.SUPABASE_ANON_KEY, webhook = process.env.N8N_WEBHOOK_URL;
    if (!supabaseUrl || !anonKey || !webhook) return send(res, 503, { error: 'Setup is incomplete. Check Supabase and n8n settings in .env.' });
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return send(res, 401, { error: 'Please sign in again before asking your stylist.' });
    try {
      const verify = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${token}` } });
      if (!verify.ok) return send(res, 401, { error: 'Your sign-in session expired. Please sign in again.' });
      const user = await verify.json();
      const body = await getBody(req);
      const headers = { 'content-type': 'application/json' };
      if (process.env.N8N_WEBHOOK_TOKEN) headers['x-fitcheck-key'] = process.env.N8N_WEBHOOK_TOKEN;
      const upstream = await fetch(webhook, { method: 'POST', headers, body: JSON.stringify({ ...body, userId: user.id, userEmail: user.email }) });
      const result = await upstream.text();
      send(res, upstream.status, result, upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    } catch (err) { send(res, 502, { error: `Could not complete the request: ${err.message}` }); }
    return;
  }

  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const fileName = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  if (fileName.startsWith('.') || fileName.includes('..') || fileName === 'server.js' || fileName === 'package.json' || fileName === 'env.example') return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const file = path.resolve(root, fileName);
  if (!file.startsWith(root + path.sep)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.readFile(file, (error, data) => error ? send(res, 404, 'Not found', 'text/plain; charset=utf-8') : send(res, 200, data, mime[path.extname(file)] || 'application/octet-stream'));
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`FITCHECK AI is running at http://localhost:${port}`));
